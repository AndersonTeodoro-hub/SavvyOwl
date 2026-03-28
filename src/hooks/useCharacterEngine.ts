import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const ENGINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/character-engine`;

async function getAccessToken(): Promise<string> {
  // Try to get session, with retry for race condition on page load
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      return sessionData.session.access_token;
    }
    // Wait before retry
    if (attempt < 2) await new Promise(r => setTimeout(r, 500));
  }
  throw new Error("Not authenticated. Please login first.");
}

async function callEngine(action: string, payload: Record<string, any> = {}) {
  const token = await getAccessToken();

  const resp = await fetch(ENGINE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  // If 401, session may have expired — try refreshing once
  if (resp.status === 401) {
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) {
      const retryResp = await fetch(ENGINE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshData.session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action, ...payload }),
      });
      const retryData = await retryResp.json();
      if (!retryResp.ok) throw new Error(retryData.error || "Request failed");
      return retryData;
    }
    throw new Error("Session expired. Please login again.");
  }

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || "Request failed");
  return data;
}

export interface CharacterData {
  id: string;
  user_id: string;
  original_input: string;
  expanded: any;
  status: "pending" | "locked";
  locked_at: string | null;
  history: any[];
  created_at: string;
  updated_at: string;
}

export function useCharacterEngine() {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const list = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEngine("list");
      setCharacters(data.characters || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const expand = useCallback(async (input: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEngine("expand", { input });
      const char = data.character;
      setCharacters((prev) => [char, ...prev]);
      return char;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refine = useCallback(async (characterId: string, adjustment: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callEngine("refine", { characterId, adjustment });
      const updated = data.character;
      setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const lock = useCallback(async (characterId: string) => {
    setError(null);
    try {
      const data = await callEngine("lock", { characterId });
      const updated = data.character;
      setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const unlock = useCallback(async (characterId: string) => {
    setError(null);
    try {
      const data = await callEngine("unlock", { characterId });
      const updated = data.character;
      setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      return updated;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const remove = useCallback(async (characterId: string) => {
    setError(null);
    try {
      await callEngine("delete", { characterId });
      setCharacters((prev) => prev.filter((c) => c.id !== characterId));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  return { characters, loading, error, clearError, list, expand, refine, lock, unlock, remove };
}
