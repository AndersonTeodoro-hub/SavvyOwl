// render-video — Shotstack integration for stitching scenes into final video
// No external imports — Deno built-in + fetch only

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Auth helper ──
async function getUser(authHeader: string, supabaseUrl: string, serviceKey: string) {
  const token = authHeader.replace("Bearer ", "");
  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": serviceKey,
    },
  });
  if (!resp.ok) return null;
  return resp.json();
}

type Scene = { videoUrl: string; duration: number };
type TransitionType = "fade" | "dissolve" | "slideLeft" | "slideRight";
type Subtitle = { text: string; start: number; duration: number };
type SubtitleStyle = {
  fontSize?: number;
  color?: string;
  background?: string;
  position?: "bottom" | "center" | "top";
};

const DEFAULT_SUBTITLE_STYLE: Required<SubtitleStyle> = {
  fontSize: 32,
  color: "#FFFFFF",
  background: "#00000080",
  position: "bottom",
};

function buildSubtitleClips(subtitles: Subtitle[], style: Required<SubtitleStyle>) {
  return subtitles
    .filter((s) => s.text && typeof s.start === "number" && typeof s.duration === "number")
    .map((s) => ({
      asset: {
        type: "title" as const,
        text: s.text,
        style: "subtitle",
        color: style.color,
        size: "medium",
        background: style.background,
        position: style.position,
      },
      start: Number(s.start.toFixed(3)),
      length: s.duration,
    }));
}

function shotstackBaseUrl(apiKey: string): string {
  // Sandbox keys typically start with "sk_" → use stage. Otherwise production v1.
  const stage = apiKey.startsWith("sk_") ? "stage" : "v1";
  return `https://api.shotstack.io/${stage}`;
}

function aspectToSize(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case "16:9": return { width: 1920, height: 1080 };
    case "1:1":  return { width: 1080, height: 1080 };
    case "9:16":
    default:     return { width: 1080, height: 1920 };
  }
}

function buildTimeline(
  scenes: Scene[],
  transition: TransitionType,
  transitionDuration: number,
  aspectRatio?: string,
  subtitles?: Subtitle[],
  subtitleStyle?: SubtitleStyle,
) {
  const clips: Array<Record<string, unknown>> = [];
  let cursor = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const isFirst = i === 0;
    const isLast = i === scenes.length - 1;

    const clip: Record<string, unknown> = {
      asset: {
        type: "video",
        src: scene.videoUrl,
      },
      start: Number(cursor.toFixed(3)),
      length: scene.duration,
    };

    const trans: Record<string, string> = {};
    if (!isFirst) trans.in = transition;
    if (!isLast) trans.out = transition;
    if (Object.keys(trans).length > 0) {
      clip.transition = trans;
    }

    clips.push(clip);

    // Next clip starts overlapping by transitionDuration (unless this is the last)
    cursor += scene.duration - (isLast ? 0 : transitionDuration);
  }

  // Subtitle track sits ABOVE the video track (Shotstack renders track[0] on top)
  const tracks: Array<{ clips: Array<Record<string, unknown>> }> = [];
  if (subtitles && subtitles.length > 0) {
    const style = { ...DEFAULT_SUBTITLE_STYLE, ...(subtitleStyle ?? {}) };
    const subClips = buildSubtitleClips(subtitles, style);
    if (subClips.length > 0) tracks.push({ clips: subClips });
  }
  tracks.push({ clips });

  return {
    timeline: {
      tracks,
    },
    output: {
      format: "mp4",
      size: aspectToSize(aspectRatio),
    },
  };
}

async function submitRender(
  scenes: Scene[],
  transition: TransitionType,
  transitionDuration: number,
  apiKey: string,
  aspectRatio?: string,
  subtitles?: Subtitle[],
  subtitleStyle?: SubtitleStyle,
) {
  const payload = buildTimeline(scenes, transition, transitionDuration, aspectRatio, subtitles, subtitleStyle);
  const resp = await fetch(`${shotstackBaseUrl(apiKey)}/render`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Shotstack render error: ${resp.status} ${err}`);
  }
  const data = await resp.json();
  const renderId = data?.response?.id;
  if (!renderId) throw new Error("Shotstack did not return a render id");
  return { renderId, status: "submitted" as const };
}

async function pollRender(renderId: string, apiKey: string) {
  const resp = await fetch(`${shotstackBaseUrl(apiKey)}/render/${renderId}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Shotstack poll error: ${resp.status} ${err}`);
  }
  const data = await resp.json();
  const r = data?.response ?? {};
  // Shotstack statuses: queued, fetching, rendering, saving, done, failed
  const raw = String(r.status ?? "");
  let status: "rendering" | "done" | "failed";
  if (raw === "done") status = "done";
  else if (raw === "failed") status = "failed";
  else status = "rendering";

  return {
    status,
    url: r.url ?? null,
    progress: typeof r.progress === "number" ? r.progress : null,
    raw,
  };
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const shotstackKey = Deno.env.get("SHOTSTACK_API_KEY") ?? "";

    // Auth check
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "No auth" }, 401);

    const user = await getUser(authHeader, supabaseUrl, serviceKey);
    if (!user?.id) return json({ error: "Unauthorized" }, 401);

    if (!shotstackKey) return json({ error: "SHOTSTACK_API_KEY not configured" }, 500);

    const body = await req.json();
    const { action } = body;

    if (action === "render") {
      const scenes: Scene[] = body.scenes ?? [];
      const transition: TransitionType = body.transition ?? "fade";
      const transitionDuration: number = typeof body.transitionDuration === "number"
        ? body.transitionDuration
        : 0.5;

      if (!Array.isArray(scenes) || scenes.length === 0) {
        return json({ error: "Missing scenes" }, 400);
      }
      for (const s of scenes) {
        if (!s.videoUrl || typeof s.duration !== "number") {
          return json({ error: "Each scene needs videoUrl and duration" }, 400);
        }
      }

      const aspectRatio: string | undefined = body.aspectRatio;
      const subtitles: Subtitle[] | undefined = Array.isArray(body.subtitles) ? body.subtitles : undefined;
      const subtitleStyle: SubtitleStyle | undefined = body.subtitleStyle;
      const result = await submitRender(
        scenes,
        transition,
        transitionDuration,
        shotstackKey,
        aspectRatio,
        subtitles,
        subtitleStyle,
      );
      return json(result);
    }

    if (action === "poll") {
      const renderId: string = body.renderId;
      if (!renderId) return json({ error: "Missing renderId" }, 400);
      const result = await pollRender(renderId, shotstackKey);
      return json(result);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
