import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, apiKey, model, aspectRatio } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Google API Key is required. Add it in Settings." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Select model - default to Nano Banana (gemini-2.5-flash)
    const modelId = model || "gemini-2.0-flash-exp";
    const validModels = [
      "gemini-2.0-flash-exp",
      "gemini-2.5-flash-preview-native-audio",
      "gemini-2.5-flash-image-generation"
    ];

    console.log(`[NANO-BANANA] Generating image with model: ${modelId}`);
    console.log(`[NANO-BANANA] Prompt: ${prompt.substring(0, 100)}...`);

    // Call Gemini API for image generation
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const requestBody: any = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[NANO-BANANA] API error:", errText);

      // Parse error for user-friendly message
      let userMessage = "Image generation failed";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) {
          userMessage = errJson.error.message;
        }
      } catch {}

      return new Response(JSON.stringify({ error: userMessage }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    // Extract image from response
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      return new Response(JSON.stringify({ error: "No image generated. Try a different prompt." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageData = null;
    let textResponse = "";

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageData = {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (!imageData) {
      return new Response(JSON.stringify({
        error: "The model returned text but no image. Try adding 'Generate an image of' at the start of your prompt.",
        text: textResponse,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[NANO-BANANA] Image generated successfully`);

    return new Response(JSON.stringify({
      image: imageData,
      text: textResponse,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[NANO-BANANA] Error:", e);
    return new Response(JSON.stringify({ error: "Internal error: " + (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
