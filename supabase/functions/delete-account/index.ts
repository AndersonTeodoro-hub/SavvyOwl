const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    // Verify user using service role
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!userResp.ok) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userData = await userResp.json();
    const userId = userData?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    console.log(`[DELETE-ACCOUNT] Deleting user: ${userId}`);

    const headers = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json", Prefer: "return=minimal" };

    // 1. Get conversation IDs
    const convResp = await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}&select=id`, { headers });
    const convos = await convResp.json();
    const convoIds: string[] = (Array.isArray(convos) ? convos : []).map((c: any) => c.id);

    // 2. Delete messages
    if (convoIds.length > 0) {
      await fetch(`${supabaseUrl}/rest/v1/messages?conversation_id=in.(${convoIds.join(",")})`, { method: "DELETE", headers });
    }

    // 3. Delete conversations
    await fetch(`${supabaseUrl}/rest/v1/conversations?user_id=eq.${userId}`, { method: "DELETE", headers });

    // 4. Delete usage_logs
    await fetch(`${supabaseUrl}/rest/v1/usage_logs?user_id=eq.${userId}`, { method: "DELETE", headers });

    // 5. Delete prompts
    await fetch(`${supabaseUrl}/rest/v1/prompts?user_id=eq.${userId}`, { method: "DELETE", headers });

    // 6. Delete profile
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, { method: "DELETE", headers });

    // 7. Delete auth user via Admin API
    const deleteResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    });
    if (!deleteResp.ok) {
      const err = await deleteResp.text();
      console.error(`[DELETE-ACCOUNT] Failed to delete auth user: ${err}`);
      throw new Error(`Failed to delete auth user: ${err}`);
    }

    console.log(`[DELETE-ACCOUNT] Successfully deleted user: ${userId}`);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE-ACCOUNT] ERROR: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
