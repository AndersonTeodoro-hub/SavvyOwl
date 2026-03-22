import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_POLL_TIME = 300; // 5 minutes max wait
const POLL_INTERVAL = 10; // 10 seconds between checks

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, apiKey, negativePrompt, aspectRatio, duration } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "Google API Key is required for video generation. Add it in Settings.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const modelId = "veo-3.0-generate-preview";
    console.log(`[VEO3] Starting video generation for user ${user.id}`);
    console.log(`[VEO3] Prompt: ${prompt.substring(0, 100)}...`);

    // Step 1: Start video generation (async operation)
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateVideos`;

    const requestBody: any = {
      prompt: prompt,
      config: {
        aspectRatio: aspectRatio || "9:16",
        numberOfVideos: 1,
      },
    };

    if (negativePrompt) {
      requestBody.config.negativePrompt = negativePrompt;
    }

    if (duration) {
      requestBody.config.durationSeconds = parseInt(duration) || 8;
    }

    const startResp = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!startResp.ok) {
      const errText = await startResp.text();
      console.error("[VEO3] Start error:", errText);
      let userMessage = "Video generation failed to start";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) userMessage = errJson.error.message;
      } catch {}
      return new Response(JSON.stringify({ error: userMessage }), {
        status: startResp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const operationData = await startResp.json();
    const operationName = operationData.name;

    if (!operationName) {
      return new Response(JSON.stringify({ error: "Failed to start video generation - no operation returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[VEO3] Operation started: ${operationName}`);

    // Step 2: Poll for completion
    let elapsed = 0;
    let result = null;

    while (elapsed < MAX_POLL_TIME) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 1000));
      elapsed += POLL_INTERVAL;

      const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
      const pollResp = await fetch(pollUrl, {
        headers: { "x-goog-api-key": apiKey },
      });

      if (!pollResp.ok) {
        console.error(`[VEO3] Poll error at ${elapsed}s`);
        continue;
      }

      const pollData = await pollResp.json();
      console.log(`[VEO3] Poll at ${elapsed}s: done=${pollData.done}`);

      if (pollData.done) {
        if (pollData.error) {
          return new Response(JSON.stringify({
            error: `Video generation failed: ${pollData.error.message || "Unknown error"}`,
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = pollData;
        break;
      }
    }

    if (!result) {
      return new Response(JSON.stringify({
        error: "Video generation timed out (5 min). Try a simpler prompt or try again later.",
      }), {
        status: 504,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Extract video data
    const generatedVideos = result.response?.generateVideoResponse?.generatedSamples
      || result.result?.generatedVideos
      || result.response?.generatedVideos
      || [];

    if (generatedVideos.length === 0) {
      return new Response(JSON.stringify({ error: "No video was generated. Try a different prompt." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const video = generatedVideos[0];
    const videoData = video.video || video;

    // Log usage
    await adminClient.from("usage_logs").insert({
      user_id: user.id,
      mode: "video_generation",
      model: modelId,
      cost_eur: 1.20, // approximate cost for 8s Veo3 Fast
    });

    console.log(`[VEO3] Video generated successfully in ${elapsed}s`);

    // Return video URI or base64
    return new Response(JSON.stringify({
      video: {
        uri: videoData.uri || null,
        mimeType: videoData.mimeType || "video/mp4",
        data: videoData.bytesBase64Encoded || null,
      },
      generationTime: elapsed,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[VEO3] Error:", e);
    return new Response(JSON.stringify({ error: "Internal error: " + (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
