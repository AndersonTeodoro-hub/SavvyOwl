const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPANSION_SYSTEM_PROMPT = `You are SavvyOwl's Character Expansion Engine. You receive a brief, casual character description from a user and expand it into an exhaustive, hyper-detailed character identity specification for AI image and video generation consistency.

CONTEXT: This specification will be injected into EVERY prompt sent to image generators (NanoBanana, Midjourney, Flux) and video generators (Veo3, Runway, Kling) to maintain absolute visual consistency across hundreds of generations. Every detail you define becomes a FIXED CONSTANT.

CRITICAL RULES:
1. Respond ONLY with valid JSON. No markdown, no backticks, no preamble, no explanation.
2. Every field must be filled with rich, specific, photographic-level detail.
3. Make creative but REALISTIC choices — real humans have asymmetries, imperfections, specific features.
4. Everything must be internally consistent (age matches skin, body matches lifestyle, etc).
5. Generate ALL descriptions in ENGLISH regardless of input language.
6. Be specific with measurements, colors (include hex), textures, spatial relationships.
7. Add realistic imperfections: skin texture variations, facial asymmetries, subtle marks.
8. The "reference" field should cross-reference 2 known people to triangulate appearance.
9. The "nano_banana_prompt" must be a COMPLETE self-contained image generation prompt (150-250 words).
10. Wardrobe should feel real — brand-level detail, wear patterns, fabric textures.

OUTPUT FORMAT (strict JSON):
{
  "name": "internal reference name",
  "summary": "one-line visual description in USER'S ORIGINAL LANGUAGE for UI display",
  "identity": { "gender": "...", "age": "...", "ethnicity_skin": "...", "reference": "..." },
  "face": { "shape": "...", "forehead": "...", "eyes": "...", "eyebrows": "...", "nose": "...", "mouth": "...", "jaw_chin": "...", "ears": "...", "skin_marks": "..." },
  "hair": { "color": "...", "type_texture": "...", "length": "...", "style": "...", "facial_hair": "..." },
  "body": { "height_build": "...", "posture": "...", "hands": "...", "movement_style": "...", "physical_asymmetries": "..." },
  "default_wardrobe": { "style_archetype": "...", "typical_top": "...", "typical_bottom": "...", "footwear": "...", "accessories": "...", "wardrobe_state": "..." },
  "voice_behavior": { "voice_quality": "...", "emotional_baseline": "...", "micro_expressions": "...", "mannerisms": "..." },
  "nano_banana_prompt": "Complete self-contained portrait photography prompt with ALL physical details, camera, lighting, style.",
  "negative_prompt": "Comprehensive exclusion list."
}`;

const REFINEMENT_SYSTEM_PROMPT = `You are SavvyOwl's Character Refinement Engine. You receive:
1. An existing character JSON specification
2. A user's adjustment request in natural language

YOUR TASK: Update the character JSON to reflect the request while maintaining consistency across ALL fields.

RULES:
1. Respond ONLY with the complete updated JSON. No markdown, no backticks, no preamble.
2. When changing one attribute, cascade to related fields (e.g., hair color change → update nano_banana_prompt too).
3. Preserve ALL fields not affected by the change.
4. All descriptions in ENGLISH regardless of input language.
5. The nano_banana_prompt must be fully regenerated to reflect updates.
6. Maintain the same JSON structure exactly.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Verify user via REST
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userData = await userResp.json();
    const userId = userData?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, characterId, input, adjustment } = await req.json();

    // Helper: Supabase REST calls
    const dbGet = async (table: string, query: string) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } });
      return r.json();
    };
    const dbInsert = async (table: string, body: unknown) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const rows = await r.json();
      return { data: Array.isArray(rows) ? rows[0] : rows, error: r.ok ? null : rows };
    };
    const dbUpdate = async (table: string, query: string, body: unknown) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const rows = await r.json();
      return { data: Array.isArray(rows) ? rows[0] : rows, error: r.ok ? null : rows };
    };
    const dbDelete = async (table: string, query: string) => {
      await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, Prefer: "return=minimal" },
      });
    };

    // Claude helper
    const callClaude = async (system: string, userMsg: string) => {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages: [{ role: "user", content: userMsg }] }),
      });
      return { ok: r.ok, data: await r.json() };
    };

    // ── EXPAND ──
    if (action === "expand") {
      if (!input?.trim()) return new Response(JSON.stringify({ error: "Character description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      console.log(`[CHARACTER] Expanding for user ${userId}: "${input.substring(0, 50)}..."`);
      const { ok, data: claudeData } = await callClaude(EXPANSION_SYSTEM_PROMPT, `CHARACTER REQUEST FROM USER:\n"${input}"\n\nExpand this into a complete character identity specification. Fill every field with rich photographic-level detail.`);

      if (!ok) { console.error("[CHARACTER] Claude error:", claudeData); return new Response(JSON.stringify({ error: "AI expansion failed. Try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      const text = claudeData.content?.map((b: any) => b.type === "text" ? b.text : "").join("") || "";
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      let expanded: unknown;
      try { expanded = JSON.parse(clean); } catch { return new Response(JSON.stringify({ error: "Failed to parse character data. Try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      const { data: character, error: dbError } = await dbInsert("characters", {
        user_id: userId, original_input: input.trim(), expanded, status: "pending",
        history: [{ action: "created", input: input.trim(), timestamp: new Date().toISOString() }],
      });
      if (dbError) return new Response(JSON.stringify({ error: "Failed to save character" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await dbInsert("usage_logs", { user_id: userId, mode: "character_expand", model: "claude-sonnet-4-20250514", cost_eur: 0.02, tokens_input: claudeData.usage?.input_tokens || 0, tokens_output: claudeData.usage?.output_tokens || 0 });

      console.log(`[CHARACTER] Created: ${character.id}`);
      return new Response(JSON.stringify({ character }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── REFINE ──
    if (action === "refine") {
      if (!characterId || !adjustment?.trim()) return new Response(JSON.stringify({ error: "characterId and adjustment required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const rows = await dbGet("characters", `id=eq.${characterId}&user_id=eq.${userId}`);
      const char = Array.isArray(rows) ? rows[0] : null;
      if (!char) return new Response(JSON.stringify({ error: "Character not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (char.status === "locked") return new Response(JSON.stringify({ error: "Cannot refine a locked character. Unlock first." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { ok, data: claudeData } = await callClaude(REFINEMENT_SYSTEM_PROMPT, `CURRENT CHARACTER SPECIFICATION:\n${JSON.stringify(char.expanded, null, 2)}\n\nUSER'S ADJUSTMENT REQUEST:\n"${adjustment}"\n\nApply this adjustment. Cascade changes to all affected fields. Return the complete updated JSON.`);
      if (!ok) return new Response(JSON.stringify({ error: "AI refinement failed. Try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const text = claudeData.content?.map((b: any) => b.type === "text" ? b.text : "").join("") || "";
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      let refined: unknown;
      try { refined = JSON.parse(clean); } catch { return new Response(JSON.stringify({ error: "Failed to parse refined data. Try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

      const newHistory = [...(char.history || []), { action: "refined", input: adjustment.trim(), timestamp: new Date().toISOString() }];
      const { data: updated } = await dbUpdate("characters", `id=eq.${characterId}`, { expanded: refined, history: newHistory });

      await dbInsert("usage_logs", { user_id: userId, mode: "character_refine", model: "claude-sonnet-4-20250514", cost_eur: 0.03, tokens_input: claudeData.usage?.input_tokens || 0, tokens_output: claudeData.usage?.output_tokens || 0 });

      return new Response(JSON.stringify({ character: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LOCK ──
    if (action === "lock") {
      const rows = await dbGet("characters", `id=eq.${characterId}&user_id=eq.${userId}`);
      const char = Array.isArray(rows) ? rows[0] : null;
      if (!char) return new Response(JSON.stringify({ error: "Character not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const newHistory = [...(char.history || []), { action: "locked", timestamp: new Date().toISOString() }];
      const { data: updated } = await dbUpdate("characters", `id=eq.${characterId}`, { status: "locked", locked_at: new Date().toISOString(), history: newHistory });
      return new Response(JSON.stringify({ character: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── UNLOCK ──
    if (action === "unlock") {
      const rows = await dbGet("characters", `id=eq.${characterId}&user_id=eq.${userId}`);
      const char = Array.isArray(rows) ? rows[0] : null;
      if (!char) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const newHistory = [...(char.history || []), { action: "unlocked", timestamp: new Date().toISOString() }];
      const { data: updated } = await dbUpdate("characters", `id=eq.${characterId}`, { status: "pending", locked_at: null, history: newHistory });
      return new Response(JSON.stringify({ character: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── LIST ──
    if (action === "list") {
      const rows = await dbGet("characters", `user_id=eq.${userId}&order=created_at.desc`);
      return new Response(JSON.stringify({ characters: Array.isArray(rows) ? rows : [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── DELETE ──
    if (action === "delete") {
      await dbDelete("characters", `id=eq.${characterId}&user_id=eq.${userId}`);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use: expand, refine, lock, unlock, list, delete" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[CHARACTER] Error:", e);
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
