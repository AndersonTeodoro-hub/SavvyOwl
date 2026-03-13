import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── MODEL REGISTRY ───────────────────────────────────────────────────────────
//
//  PROVIDER     MODEL                        TIER     COST INPUT  COST OUTPUT
//  Anthropic    claude-sonnet-4-5            premium  $0.003/1K   $0.015/1K
//  Anthropic    claude-opus-4-5              elite    $0.015/1K   $0.075/1K
//  Google       gemini-2.0-flash             cheap    $0.0001/1K  $0.0004/1K
//  Google       gemini-2.5-pro               mid      $0.007/1K   $0.021/1K
//
// ROUTING LOGIC:
//  quick   → Gemini Flash        (free + starter + pro)
//  deep    → Claude Sonnet 4.5   (starter + pro only)
//  creator → Claude Sonnet 4.5   (starter + pro only)  + creator system prompt
//  opus    → Claude Opus 4.5     (pro only)
// ─────────────────────────────────────────────────────────────────────────────

type Provider = "anthropic" | "google";

interface ModelConfig {
  provider: Provider;
  modelId: string;       // model string for API call
  displayName: string;   // shown to user in UI
  costInput: number;     // USD per 1K tokens
  costOutput: number;    // USD per 1K tokens
  minPlan: "free" | "starter" | "pro";
}

const MODELS: Record<string, ModelConfig> = {
  quick: {
    provider: "google",
    modelId: "google/gemini-2.0-flash",
    displayName: "Gemini Flash",
    costInput: 0.0001,
    costOutput: 0.0004,
    minPlan: "free",
  },
  deep: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-5",
    displayName: "Claude Sonnet",
    costInput: 0.003,
    costOutput: 0.015,
    minPlan: "starter",
  },
  creator: {
    provider: "anthropic",
    modelId: "claude-sonnet-4-5",
    displayName: "Claude Sonnet (Creator)",
    costInput: 0.003,
    costOutput: 0.015,
    minPlan: "starter",
  },
  opus: {
    provider: "anthropic",
    modelId: "claude-opus-4-5",
    displayName: "Claude Opus",
    costInput: 0.015,
    costOutput: 0.075,
    minPlan: "pro",
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

const BASE_SYSTEM_PROMPT = `You are PromptOS AI, a helpful and concise assistant. Keep answers clear, actionable, and well-formatted. Use markdown when it improves readability.`;

const CREATOR_SYSTEM_PROMPT = `You are ContentCreator AI, built on Claude — the world's most advanced writing model. You are an expert assistant for content creators, influencers, and social media managers.

You specialize in:
- Instagram captions, TikTok scripts, YouTube video outlines
- Email copy, newsletter content, lead magnets
- Hook writing (first 3 seconds that stop the scroll)
- Content repurposing across platforms
- Brand voice development and consistency

Guidelines:
- Always write in an engaging, human tone — never robotic
- Match the platform's native style (casual for TikTok, professional for LinkedIn)
- Ask for platform and target audience if not specified
- Output in clean, ready-to-use format with clear sections
- Suggest variations when relevant (A/B test hooks, multiple CTA options)
- Be direct — creators need output they can use immediately`;

// ─── ANTHROPIC STREAMING ─────────────────────────────────────────────────────

async function streamAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<Response> {
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
      messages: messages.filter((m) => m.role !== "system"),
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
  messages: { role: string; content: string }[]
): Promise<Response> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  return response;
}

// ─── ANTHROPIC SSE → UNIFIED SSE TRANSFORM ────────────────────────────────────
// Anthropic uses a different SSE format than OpenAI.
// We normalise it to OpenAI format so the frontend works unchanged.

function transformAnthropicStream(
  anthropicStream: ReadableStream<Uint8Array>,
  onDone: (fullText: string, inputTokens: number, outputTokens: number) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullContent = "";
  let inputTokens = 0;
  let outputTokens = 0;

  return new ReadableStream({
    async start(controller) {
      const reader = anthropicStream.getReader();

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

              // Content delta — forward as OpenAI-compatible chunk
              if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                const text = event.delta.text || "";
                fullContent += text;

                const openAIChunk = {
                  choices: [{ delta: { content: text } }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
              }

              // Usage data
              if (event.type === "message_delta" && event.usage) {
                outputTokens = event.usage.output_tokens || 0;
              }
              if (event.type === "message_start" && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens || 0;
              }

              // Stream end
              if (event.type === "message_stop") {
                onDone(fullContent, inputTokens, outputTokens);
              }
            } catch {
              // Skip malformed lines
            }
          }

          // Forward raw bytes for non-parsed content
          controller.enqueue(value);
        }
      } finally {
        controller.close();
      }
    },
  });
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
    const { messages, mode, conversationId } = await req.json();

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

        // ── Check plan allows this mode ──
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

        // ── Check monthly request limit ──
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

    // ── Build system prompt ──
    const systemPrompt = modeKey === "creator" ? CREATOR_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;

    // ── Stream from correct provider ──
    let providerResponse: Response;

    if (modelConfig.provider === "anthropic") {
      providerResponse = await streamAnthropic(
        ANTHROPIC_API_KEY,
        modelConfig.modelId,
        systemPrompt,
        messages
      );
    } else {
      providerResponse = await streamGoogle(
        LOVABLE_API_KEY,
        modelConfig.modelId,
        systemPrompt,
        messages
      );
    }

    if (!providerResponse.ok) {
      const errorText = await providerResponse.text();
      console.error(`Provider error (${modelConfig.provider}):`, providerResponse.status, errorText);

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

    // ── Transform + stream to client ──
    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const logUsage = async (fullContent: string, tokensInput: number, tokensOutput: number) => {
      const costUsd = (tokensInput * modelConfig.costInput + tokensOutput * modelConfig.costOutput) / 1000;
      const costEur = +(costUsd * 0.92).toFixed(6);

      // Send metadata to client
      const metadata = {
        model: modelConfig.modelId,
        display_name: modelConfig.displayName,
        provider: modelConfig.provider,
        cost_eur: costEur,
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
      };

      await writer.write(encoder.encode(`data: ${JSON.stringify({ metadata })}\n\n`));
      await writer.write(encoder.encode("data: [DONE]\n\n"));

      // Log to DB
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

    // ── Handle Anthropic stream (different SSE format) ──
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

          // Estimate tokens if not provided
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
