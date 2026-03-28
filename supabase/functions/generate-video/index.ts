import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Credit costs
const CREDITS = { video: 10 };

// fal.ai model endpoints
// Veo 3.1 Fast: ~$0.10/s → 8s video = ~$0.80 (vs $6.00 no Vertex directo)
const FAL_MODELS = {
  "veo3-fast": "fal-ai/veo3/fast",       // $0.10/s, 720p, sem áudio
  "veo3": "fal-ai/veo3",                  // $0.40/s, 1080p, com áudio
  "kling": "fal-ai/kling-video/v2.1/pro", // $0.07/s, alternativa económica
};

async function generateWithFal(
  prompt: string,
  aspectRatio: string,
  duration: number,
  model: string,
  falApiKey: string
): Promise<{ url: string; mimeType: string; elapsed: number }> {
  const startTime = Date.now();
  const modelEndpoint = FAL_MODELS[model as keyof typeof FAL_MODELS] || FAL_MODELS["veo3-fast"];

  console.log(`[FAL] Starting ${model} (${modelEndpoint})`);

  // Submit request
  const submitResp = await fetch(`https://queue.fal.run/${modelEndpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${falApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      duration: duration,
    }),
  });

  if (!submitResp.ok) {
    const err = await submitResp.text();
    throw new Error(`fal.ai submit error ${submitResp.status}: ${err.substring(0, 400)}`);
  }

  const { request_id } = await submitResp.json();
  if (!request_id) throw new Error("No request_id from fal.ai");
  console.log(`[FAL] Request ID: ${request_id}`);

  // Poll for result
  const maxWait = 300000; // 5 min
  const pollInterval = 5000; // 5s
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));
    elapsed += pollInterval;

    const statusResp = await fetch(
      `https://queue.fal.run/${modelEndpoint}/requests/${request_id}/status`,
      { headers: { "Authorization": `Key ${falApiKey}` } }
    );

    if (!statusResp.ok) continue;
    const status = await statusResp.json();
    console.log(`[FAL] Status at ${elapsed / 1000}s: ${status.status}`);

    if (status.status === "COMPLETED") {
      // Get result
      const resultResp = await fetch(
        `https://queue.fal.run/${modelEndpoint}/requests/${request_id}`,
        { headers: { "Authorization": `Key ${falApiKey}` } }
      );
      const result = await resultResp.json();
      const videoUrl = result.video?.url || result.video_url || result.output?.video?.url;
      if (!videoUrl) throw new Error(`No video URL in result: ${JSON.stringify(result).substring(0, 300)}`);
      return { url: videoUrl, mimeType: "video/mp4", elapsed: Math.round(elapsed / 1000) };
    }

    if (status.status === "FAILED") {
      throw new Error(`fal.ai generation failed: ${JSON.stringify(status.error || status).substring(0, 300)}`);
    }
  }

  throw new Error("fal.ai video generation timed out (5 min)");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { prompt, aspectRatio, duration, model } = await req.json();
    if (!prompt) return json({ error: "Prompt is required" }, 400);

    const falApiKey = Deno.env.get("FAL_API_KEY");
    if (!falApiKey) {
      return json({ error: "Serviço de vídeo não configurado. Contacta o suporte." }, 503);
    }

    // Credit check
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits_balance, plan")
      .eq("id", user.id)
      .single();

    const balance = profile?.credits_balance ?? 0;
    const cost = CREDITS.video;

    if (balance < cost) {
      return json({
        error: "insufficient_credits",
        message: `Sem créditos suficientes para vídeo (tens ${balance}, precisas de ${cost}). Carrega créditos nas Definições.`,
        balance,
        cost,
      }, 402);
    }

    const ar = aspectRatio || "9:16";
    const dur = parseInt(duration) || 8;
    const selectedModel = model || "veo3-fast";

    const result = await generateWithFal(prompt, ar, dur, selectedModel, falApiKey);

    // Deduct credits
    await adminClient
      .from("profiles")
      .update({ credits_balance: balance - cost })
      .eq("id", user.id);

    await adminClient.from("credit_transactions").insert({
      user_id: user.id,
      amount: -cost,
      type: "spend",
      description: `Vídeo ${dur}s ${selectedModel} (fal.ai)`,
    });

    await adminClient.from("usage_logs").insert({
      user_id: user.id,
      mode: "video_generation",
      model: `fal-${selectedModel}`,
      cost_eur: 0.85, // ~$0.80 Veo3 Fast 8s
    });

    const newBalance = balance - cost;
    console.log(`[FAL] ✅ ${selectedModel} in ${result.elapsed}s | balance: ${balance} → ${newBalance}`);

    return json({
      video: { uri: result.url, mimeType: result.mimeType },
      generationTime: result.elapsed,
      credits: { balance: newBalance, cost },
      backend: `fal-${selectedModel}`,
    });

  } catch (e) {
    console.error("[FAL] Error:", e);
    return json({ error: "Erro ao gerar vídeo: " + (e as Error).message }, 500);
  }
});
