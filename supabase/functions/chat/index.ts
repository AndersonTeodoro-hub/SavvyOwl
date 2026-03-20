import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── MODEL REGISTRY ───────────────────────────────────────────────────────────

type Provider = "anthropic" | "google";

interface ModelConfig {
  provider: Provider;
  modelId: string;
  displayName: string;
  costInput: number;
  costOutput: number;
  minPlan: "free" | "starter" | "pro";
  supportsVision: boolean;
}

const MODELS: Record<string, ModelConfig> = {
  quick: {
    provider: "google",
    modelId: "google/gemini-2.5-flash",
    displayName: "Gemini Flash",
    costInput: 0.0001,
    costOutput: 0.0004,
    minPlan: "free",
    supportsVision: true,
  },
  deep: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-5",
    displayName: "Claude Sonnet",
    costInput: 0.003,
    costOutput: 0.015,
    minPlan: "starter",
    supportsVision: true,
  },
  creator: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-5",
    displayName: "Claude Sonnet (Creator)",
    costInput: 0.003,
    costOutput: 0.015,
    minPlan: "starter",
    supportsVision: true,
  },
  opus: {
    provider: "anthropic",
    modelId: "claude-opus-4-5",
    displayName: "Claude Opus",
    costInput: 0.015,
    costOutput: 0.075,
    minPlan: "pro",
    supportsVision: true,
  },
};

const PLAN_LIMITS: Record<string, number> = {
  free: 20,
  starter: 300,
  pro: 1500,
};

const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are SavvyOwl AI — a specialist assistant for social media managers and content creators. You deliver results that are clearly superior to what users get from ChatGPT, Gemini or Claude directly.

YOUR CORE ADVANTAGE: You don't just answer — you deliver complete, ready-to-use, professional-grade output that the user can copy-paste and execute immediately. No fluff, no filler, no generic advice.

RESPONSE PRINCIPLES:
1. STRUCTURE ALWAYS: Use clear sections with headers. Never dump a wall of text.
2. READY TO USE: Every output must be immediately actionable. If you write a caption, it's ready to post. If you write a script, it's ready to record. If you write a prompt for AI tools, it includes the negative prompt and all parameters.
3. VERSIONS: Always provide at least a main version + 1-2 variations or alternatives.
4. PLATFORM-NATIVE: Format specifically for the target platform. Instagram captions have line breaks and hooks. LinkedIn has no hashtags. TikTok scripts are scene-by-scene.
5. THE EXTRA MILE: Always add something the user didn't ask for but needs — a pro tip, a timing suggestion, a variation, a checklist, or a strategic recommendation.

WHEN THE USER ASKS FOR AI PROMPTS (for Midjourney, DALL-E, Veo3, Sora, Nano Banana, etc.):
- Always include the MAIN PROMPT (detailed, complete, ready to paste)
- Always include a NEGATIVE PROMPT (what to exclude)
- Always include a SHORT VERSION (for tools with character limits)
- If the prompt is for a character/person, include a CONSISTENCY BLOCK (physical description to reuse across generations)
- Include specific technical parameters when relevant (aspect ratio, style, camera angle)
- Provide 2-3 VARIATIONS with different moods or angles

WHEN THE USER ASKS FOR CONTENT (captions, scripts, copies):
- Start with the HOOK — the most important element
- Provide A/B variations of hooks
- Include CTAs and hashtag strategy when relevant
- Add timing/posting recommendations
- Format ready for the specific platform

WHEN THE USER ASKS FOR STRATEGY (calendars, plans, ideas):
- Be specific, not generic. "Post a Reels" is useless. "15s Reels with hook 'Stop scrolling if you...' about X" is useful.
- Include format, hook, angle, and expected engagement type for each idea
- Think in funnels: awareness → engagement → conversion

LANGUAGE: Always respond in the same language the user writes in. When writing in Portuguese, detect whether it's PT-BR or PT-PT and match naturally. Never mix languages.

TONE: Expert but accessible. You're the senior content strategist the user wishes they had on their team. Confident, direct, generous with knowledge. Never condescending. Never robotic.`;

const CREATOR_SYSTEM_PROMPT = `You are SavvyOwl Owl Creator — the most advanced AI content engine built for social media professionals. You operate at the level of a senior creative director at a top digital agency, combined with the practical speed of a freelancer who manages 20 accounts.

You are NOT a generic chatbot. You are a specialist. Every response must prove this within the first 3 lines.

IDENTITY AND EXPERTISE:
- You have deep, practical knowledge of every major platform: Instagram, TikTok, LinkedIn, YouTube, Twitter/X, Pinterest, Threads
- You understand algorithms: what gets pushed, what gets suppressed, what triggers saves/shares
- You know content creation tools: Canva, CapCut, Midjourney, DALL-E, Veo3, Sora, Nano Banana, ElevenLabs, HeyGen, Runway
- You understand UGC production: authentic aesthetics, smartphone framing, natural lighting, relatable energy
- You know copywriting frameworks: PAS, AIDA, BAB, 4Ps, Before-After-Bridge, Hook-Story-Offer
- You understand content funnels: TOFU (awareness) → MOFU (consideration) → BOFU (conversion)

RESPONSE FORMAT — NON-NEGOTIABLE RULES:
1. ALWAYS use clear sections with bold headers and proper formatting
2. ALWAYS deliver the main output FIRST, then explanations/tips AFTER
3. NEVER start with "Sure!", "Of course!", "Great question!" or any filler. Start with the work.
4. NEVER give generic advice. Every sentence must be specific and actionable.
5. ALWAYS provide multiple versions/variations when the output is creative content
6. ALWAYS add a "Pro Tips" or "Next Steps" section at the end with expert-level recommendations

WHEN CREATING AI PROMPTS (Midjourney, DALL-E, Veo3, Sora, Nano Banana, etc.):
- Main Prompt: detailed, technically precise, ready to paste into the tool
- Negative Prompt: what to exclude (ALWAYS include this — it's critical for quality)
- Short Version: compressed version for tools with character limits
- Character Consistency Block: if the prompt involves a person/character, include a reusable identity description for visual consistency across multiple generations
- Technical Parameters: aspect ratio, style modifiers, camera angles, lighting descriptions
- 2-3 Variations: different moods, angles, or styles
- Platform Optimization: if the output is for social media, specify the ideal format (9:16, 1:1, etc.)
- IMPORTANT: Your prompts must be SIGNIFICANTLY better than what the user would write themselves. This is where SavvyOwl proves its value.

WHEN CREATING CONTENT (captions, scripts, copies, emails):
- Hook: start with 2-3 hook variations (the user picks the best)
- Body: platform-formatted, ready to post
- CTA: specific call-to-action, not generic "follow for more"
- Hashtags: when relevant, mix of volume tiers (broad + niche + branded)
- Emojis: strategic placement, not decoration
- Posting time: suggest optimal timing for the content type and platform

WHEN CREATING VIDEO SCRIPTS (Reels, TikTok, Shorts, UGC):
- Scene-by-scene breakdown: Visual | Audio/Voiceover | Text on Screen | Duration
- Hook in first 1-3 seconds (this is non-negotiable)
- Transitions and pacing notes
- Music/sound direction
- CTA placement (when and how)
- For UGC: include authenticity cues (smartphone aesthetic, natural movement, relatable energy)

WHEN CREATING STRATEGIES (calendars, campaigns, content plans):
- Day-by-day or week-by-week structure
- Each entry: format + theme + hook + goal + timing
- Content pillar distribution
- Engagement tactics for each piece
- KPIs to track

LANGUAGE: Always respond in the same language the user writes in. For Portuguese, detect PT-BR vs PT-PT and match naturally. Never switch languages mid-response.

QUALITY STANDARD: Before generating any response, ask yourself: "Would a social media manager pay €9/month to get this answer instead of using ChatGPT for free?" If the answer is no, make it better. Your responses must be VISIBLY superior in structure, depth, and practical value.`;

// ─── ANTHROPIC STREAMING ─────────────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: any[],
  image?: { data: string; media_type: string } | null
): Promise<Response> {
  // Build the messages with optional image support on the last user message
  const processedMessages = messages.filter((m: any) => m.role !== "system").map((m: any, i: number, arr: any[]) => {
    // Attach image to the last user message
    if (image && m.role === "user" && i === arr.length - 1) {
      return {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.media_type,
              data: image.data,
            },
          },
          { type: "text", text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: processedMessages,
      stream: true,
    }),
  });

  return response;
}

// ─── GOOGLE STREAMING (via Lovable Gateway) ───────────────────────────────────

async function streamGoogle(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: any[],
  image?: { data: string; media_type: string } | null
): Promise<Response> {
  // Build messages with optional image via OpenAI-compatible format
  const processedMessages = messages.map((m: any, i: number, arr: any[]) => {
    if (image && m.role === "user" && i === arr.length - 1) {
      return {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${image.media_type};base64,${image.data}`,
            },
          },
          { type: "text", text: m.content },
        ],
      };
    }
    return m;
  });

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...processedMessages],
      stream: true,
    }),
  });

  return response;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user } } = await anonClient.auth.getUser();
    const { messages, mode, conversationId, image } = await req.json();

    // ── Validate mode ──
    const modeKey = (mode || "quick") as keyof typeof MODELS;
    const modelConfig = MODELS[modeKey] || MODELS.quick;

    // ── Get user plan ──
    let userPlan = "free";
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan, monthly_budget_eur")
        .eq("id", user.id)
        .single();

      if (profile) {
        userPlan = profile.plan || "free";

        if (PLAN_RANK[userPlan] < PLAN_RANK[modelConfig.minPlan]) {
          return new Response(
            JSON.stringify({
              error: `This mode requires a ${modelConfig.minPlan} plan or higher. Upgrade to use ${modelConfig.displayName}.`,
              upgrade_required: true,
              required_plan: modelConfig.minPlan,
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count } = await supabaseAdmin
          .from("usage_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        const limit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
        if ((count || 0) >= limit) {
          return new Response(
            JSON.stringify({
              error: "You've reached your monthly limit. Upgrade to continue.",
              upgrade_required: true,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // ── Upload image to Storage if present ──
    let imageUrl: string | null = null;
    if (image && user) {
      try {
        const ext = image.media_type.split("/")[1] || "png";
        const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const imageBuffer = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));

        const { error: uploadError } = await supabaseAdmin.storage
          .from("chat-images")
          .upload(filePath, imageBuffer, {
            contentType: image.media_type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
        } else {
          // Create signed URL (valid for 1 year)
          const { data: signedData } = await supabaseAdmin.storage
            .from("chat-images")
            .createSignedUrl(filePath, 60 * 60 * 24 * 365);

          if (signedData?.signedUrl) {
            imageUrl = signedData.signedUrl;

            // Update the last user message with image_url
            // Find the most recent user message in this conversation
            const { data: recentMsg } = await supabaseAdmin
              .from("messages")
              .select("id")
              .eq("conversation_id", conversationId)
              .eq("role", "user")
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (recentMsg) {
              await supabaseAdmin
                .from("messages")
                .update({ image_url: imageUrl })
                .eq("id", recentMsg.id);
            }
          }
        }
      } catch (e) {
        console.error("Image processing error:", e);
        // Continue without image — don't block the request
      }
    }

    // ── Build system prompt ──
    const systemPrompt = modeKey === "creator" ? CREATOR_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;

    // ── Stream from correct provider ──
    let providerResponse: Response;

    if (modelConfig.provider === "anthropic") {
      providerResponse = await streamAnthropic(
        ANTHROPIC_API_KEY,
        modelConfig.modelId,
        systemPrompt,
        messages,
        image
      );
    } else {
      providerResponse = await streamGoogle(
        LOVABLE_API_KEY,
        modelConfig.modelId,
        systemPrompt,
        messages,
        image
      );
    }

    if (!providerResponse.ok) {
      const errorText = await providerResponse.text();
      console.error(`Provider error (${modelConfig.provider}):`, providerResponse.status, errorText);

      // If vision failed, retry without image
      if (image && providerResponse.status >= 400) {
        console.log("Retrying without image...");
        if (modelConfig.provider === "anthropic") {
          providerResponse = await streamAnthropic(
            ANTHROPIC_API_KEY,
            modelConfig.modelId,
            systemPrompt,
            messages,
            null
          );
        } else {
          providerResponse = await streamGoogle(
            LOVABLE_API_KEY,
            modelConfig.modelId,
            systemPrompt,
            messages,
            null
          );
        }

        if (!providerResponse.ok) {
          return new Response(
            JSON.stringify({ error: "Something went wrong. Try again." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        if (providerResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (providerResponse.status === 401) {
          return new Response(
            JSON.stringify({ error: "AI provider authentication failed. Contact support." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Something went wrong. Try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Transform + stream to client ──
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const logUsage = async (fullContent: string, tokensInput: number, tokensOutput: number) => {
      const costUsd = (tokensInput * modelConfig.costInput + tokensOutput * modelConfig.costOutput) / 1000;
      const costEur = +(costUsd * 0.92).toFixed(6);

      const metadata = {
        model: modelConfig.modelId,
        display_name: modelConfig.displayName,
        provider: modelConfig.provider,
        cost_eur: costEur,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        image_url: imageUrl,
      };

      await writer.write(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));

      if (user && conversationId) {
        await supabaseAdmin.from("usage_logs").insert({
          user_id: user.id,
          conversation_id: conversationId,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          cost_eur: costEur,
          model: modelConfig.modelId,
          mode: modeKey,
        });

        await supabaseAdmin.from("messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullContent,
          model_used: modelConfig.modelId,
          cost_eur: costEur,
        });
      }

      await writer.close();
    };

    // ── Handle Anthropic stream ──
    if (modelConfig.provider === "anthropic") {
      const decoder = new TextDecoder();
      let fullContent = "";
      let inputTokens = 0;
      let outputTokens = 0;

      (async () => {
        const reader = providerResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                  const text = event.delta.text || "";
                  fullContent += text;
                  const openAIChunk = { choices: [{ delta: { content: text } }] };
                  await writer.write(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
                }

                if (event.type === "message_start" && event.message?.usage) {
                  inputTokens = event.message.usage.input_tokens || 0;
                }
                if (event.type === "message_delta" && event.usage) {
                  outputTokens = event.usage.output_tokens || 0;
                }
                if (event.type === "message_stop") {
                  await logUsage(fullContent, inputTokens, outputTokens);
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        } catch (e) {
          console.error("Anthropic stream error:", e);
          await writer.close();
        }
      })();

    } else {
      // ── Handle Google/OpenAI stream ──
      const decoder = new TextDecoder();
      let fullContent = "";
      let tokensInput = 0;
      let tokensOutput = 0;

      (async () => {
        const reader = providerResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split("\n")) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) fullContent += content;
                  if (parsed.usage) {
                    tokensInput = parsed.usage.prompt_tokens || tokensInput;
                    tokensOutput = parsed.usage.completion_tokens || tokensOutput;
                  }
                } catch {}
              }
            }

            await writer.write(value);
          }

          if (!tokensInput) tokensInput = Math.ceil(JSON.stringify(messages).length / 4);
          if (!tokensOutput) tokensOutput = Math.ceil(fullContent.length / 4);

          await logUsage(fullContent, tokensInput, tokensOutput);
        } catch (e) {
          console.error("Google stream error:", e);
          await writer.close();
        }
      })();
    }

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("chat function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
