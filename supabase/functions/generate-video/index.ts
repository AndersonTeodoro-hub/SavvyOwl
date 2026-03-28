Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const falApiKey = Deno.env.get("FAL_API_KEY");

    if (!falApiKey) {
      return json({ error: "Serviço de vídeo não configurado. Contacta o suporte." }, 503);
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Verify user via Supabase REST
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userResp.ok) return json({ error: "Unauthorized" }, 401);
    const userData = await userResp.json();
    const userId = userData?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { prompt, aspectRatio, duration, model } = body;
    if (!prompt) return json({ error: "Prompt is required" }, 400);

    const CREDIT_COST = 10;

    // Get profile (credits)
    const profileResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=credits_balance,plan`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const profiles = await profileResp.json();
    const profile = profiles?.[0];
    const balance = profile?.credits_balance ?? 0;

    if (balance < CREDIT_COST) {
      return json({
        error: "insufficient_credits",
        message: `Sem créditos suficientes para vídeo (tens ${balance}, precisas de ${CREDIT_COST}). Carrega créditos nas Definições.`,
        balance,
        cost: CREDIT_COST,
      }, 402);
    }

    const ar = aspectRatio || "9:16";
    const dur = parseInt(duration) || 8;
    const selectedModel = model || "veo3-fast";

    const FAL_MODELS: Record<string, string> = {
      "veo3-fast": "fal-ai/veo3/fast",
      "veo3": "fal-ai/veo3",
      "kling": "fal-ai/kling-video/v2.1/pro",
    };
    const modelEndpoint = FAL_MODELS[selectedModel] || FAL_MODELS["veo3-fast"];

    console.log(`[FAL] Starting ${selectedModel} (${modelEndpoint})`);

    // Submit request to fal.ai
    const submitResp = await fetch(`https://queue.fal.run/${modelEndpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, aspect_ratio: ar, duration: dur }),
    });

    if (!submitResp.ok) {
      const err = await submitResp.text();
      throw new Error(`fal.ai submit error ${submitResp.status}: ${err.substring(0, 400)}`);
    }

    const submitData = await submitResp.json();
    const requestId = submitData.request_id;
    if (!requestId) throw new Error("No request_id from fal.ai");
    console.log(`[FAL] Request ID: ${requestId}`);

    // Poll for result (5 min max, 5s interval)
    const maxWait = 300000;
    const pollInterval = 5000;
    let elapsed = 0;

    while (elapsed < maxWait) {
      await new Promise((r) => setTimeout(r, pollInterval));
      elapsed += pollInterval;

      const statusResp = await fetch(
        `https://queue.fal.run/${modelEndpoint}/requests/${requestId}/status`,
        { headers: { Authorization: `Key ${falApiKey}` } }
      );
      if (!statusResp.ok) continue;
      const status = await statusResp.json();
      console.log(`[FAL] Status at ${elapsed / 1000}s: ${status.status}`);

      if (status.status === "COMPLETED") {
        const resultResp = await fetch(
          `https://queue.fal.run/${modelEndpoint}/requests/${requestId}`,
          { headers: { Authorization: `Key ${falApiKey}` } }
        );
        const result = await resultResp.json();
        const videoUrl = result.video?.url || result.video_url || result.output?.video?.url;
        if (!videoUrl) throw new Error(`No video URL in result: ${JSON.stringify(result).substring(0, 300)}`);

        // Deduct credits
        const newBalance = balance - CREDIT_COST;
        await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ credits_balance: newBalance }),
        });
        await fetch(`${supabaseUrl}/rest/v1/credit_transactions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: userId,
            amount: -CREDIT_COST,
            type: "spend",
            description: `Vídeo ${dur}s ${selectedModel} (fal.ai)`,
          }),
        });
        await fetch(`${supabaseUrl}/rest/v1/usage_logs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: userId,
            mode: "video_generation",
            model: `fal-${selectedModel}`,
            cost_eur: 0.85,
          }),
        });

        console.log(`[FAL] OK ${selectedModel} in ${Math.round(elapsed / 1000)}s | balance: ${balance} → ${newBalance}`);
        return json({
          video: { uri: videoUrl, mimeType: "video/mp4" },
          generationTime: Math.round(elapsed / 1000),
          credits: { balance: newBalance, cost: CREDIT_COST },
          backend: `fal-${selectedModel}`,
        });
      }

      if (status.status === "FAILED") {
        throw new Error(`fal.ai generation failed: ${JSON.stringify(status.error || status).substring(0, 300)}`);
      }
    }

    throw new Error("fal.ai video generation timed out (5 min)");

  } catch (e) {
    console.error("[FAL] Error:", e);
    return json({ error: "Erro ao gerar vídeo: " + (e as Error).message }, 500);
  }
});
