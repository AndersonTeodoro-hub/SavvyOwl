const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : "";
  const m = match[2] || "0";
  const s = (match[3] || "0").padStart(2, "0");
  return h ? `${h}${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userData = await userResp.json();
    if (!userData?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { niche, platform, maxResults = 10 } = body;
    if (!niche) return new Response(JSON.stringify({ error: "Niche is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const baseNiche = niche.toLowerCase().trim();
    const platformTag = platform === "TikTok" ? "tiktok" : platform === "Instagram Reels" ? "reels" : platform === "YouTube Shorts" ? "shorts" : "";

    const searchQueries = [
      `${baseNiche} viral ${platformTag} 2026`,
      `${baseNiche} trending ${platformTag}`,
      `${baseNiche} viral video`,
    ];

    console.log("[YOUTUBE] Searching with queries:", searchQueries);

    let allVideoIds: string[] = [];

    for (const query of searchQueries) {
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("key", YOUTUBE_API_KEY);
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("order", "viewCount");
      searchUrl.searchParams.set("maxResults", "10");
      searchUrl.searchParams.set("publishedAfter", getDateDaysAgo(30));
      searchUrl.searchParams.set("videoDefinition", "high");

      const searchResp = await fetch(searchUrl.toString());
      if (!searchResp.ok) continue;
      const searchData = await searchResp.json();
      const ids = (searchData.items || []).map((item: any) => item.id.videoId).filter(Boolean);
      allVideoIds.push(...ids);
    }

    allVideoIds = [...new Set(allVideoIds)];

    if (allVideoIds.length === 0) {
      return new Response(JSON.stringify({ videos: [], message: "No viral videos found for this niche" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const chunks: string[][] = [];
    for (let i = 0; i < allVideoIds.length; i += 50) chunks.push(allVideoIds.slice(i, i + 50));

    let allVideos: any[] = [];

    for (const chunk of chunks) {
      const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      statsUrl.searchParams.set("key", YOUTUBE_API_KEY);
      statsUrl.searchParams.set("id", chunk.join(","));
      statsUrl.searchParams.set("part", "snippet,statistics,contentDetails");

      const statsResp = await fetch(statsUrl.toString());
      if (!statsResp.ok) continue;
      const statsData = await statsResp.json();

      const videos = (statsData.items || []).map((video: any) => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description?.slice(0, 200) || "",
        channel: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || "",
        url: `https://www.youtube.com/watch?v=${video.id}`,
        shortUrl: `https://youtu.be/${video.id}`,
        views: parseInt(video.statistics.viewCount || "0"),
        likes: parseInt(video.statistics.likeCount || "0"),
        comments: parseInt(video.statistics.commentCount || "0"),
        duration: parseDuration(video.contentDetails.duration),
      }));

      allVideos.push(...videos);
    }

    const MIN_VIEWS = 10000;
    let filtered = allVideos.filter((v: any) => v.views >= MIN_VIEWS);
    if (filtered.length < 3) filtered = allVideos.filter((v: any) => v.views >= 1000);
    if (filtered.length < 3) filtered = allVideos;

    filtered.sort((a: any, b: any) => b.views - a.views);
    filtered = filtered.slice(0, Math.min(maxResults, 10));

    console.log(`[YOUTUBE] Found ${allVideos.length} total, ${filtered.length} after filtering for "${niche}"`);

    return new Response(JSON.stringify({ videos: filtered, query: searchQueries.join(" | ") }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[YOUTUBE] Error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
