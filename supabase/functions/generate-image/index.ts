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
    const googleApiKey = Deno.env.get("GOOGLE_API_KEY") || "";

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
    const { prompt, apiKey } = body;
    if (!prompt) return json({ error: "Prompt is required" }, 400);

    const usingOwnKey = !!apiKey;
    const CREDIT_COST = 1;

    // Get profile (credits)
    const profileResp = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=credits_balance,plan`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
    );
    const profiles = await profileResp.json();
    const profile = profiles?.[0];
    const balance = profile?.credits_balance ?? 0;

    if (!usingOwnKey && balance < CREDIT_COST) {
      return json({
        error: "insufficient_credits",
        message: `Sem créditos suficientes (tens ${balance}, precisas de ${CREDIT_COST}). Carrega créditos nas Definições.`,
        balance,
        cost: CREDIT_COST,
      }, 402);
    }

    // Generate image with Gemini
    const effectiveKey = usingOwnKey ? apiKey : googleApiKey;
    const models = [
      "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-exp",
    ];

    let imageData: { data: string; mimeType: string } | null = null;
    let usedBackend = "unknown";
    let lastError = "";

    for (const modelId of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${effectiveKey}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });

      if (!resp.ok) {
        lastError = await resp.text();
        console.log(`[IMG] ${modelId} → ${resp.status}: ${lastError.substring(0, 150)}`);
        continue;
      }

      const data = await resp.json();
      for (const part of data.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageData = { data: part.inlineData.data, mimeType: part.inlineData.mimeType || "image/png" };
          usedBackend = modelId;
          break;
        }
      }
      if (imageData) break;
      lastError = "No image in response";
    }

    if (!imageData) {
      throw new Error(`All models failed: ${lastError.substring(0, 200)}`);
    }

    // Deduct credits
    if (!usingOwnKey) {
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
          description: `Imagem (${usedBackend})`,
        }),
      });
    }

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
        mode: "image_generation",
        model: usedBackend,
        cost_eur: usingOwnKey ? 0 : 0.02,
      }),
    });

    const newBalance = usingOwnKey ? balance : balance - CREDIT_COST;
    console.log(`[IMG] OK ${usedBackend} | balance: ${balance} → ${newBalance}`);

    return json({
      image: imageData,
      text: "",
      credits: { balance: newBalance, cost: usingOwnKey ? 0 : CREDIT_COST },
      backend: usedBackend,
    });

  } catch (e) {
    console.error("[IMG] Error:", e);
    return json({ error: "Internal error: " + (e as Error).message }, 500);
  }
});
