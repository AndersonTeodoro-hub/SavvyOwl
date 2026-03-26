import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildCharacterIdentityBlock, buildNegativePrompt } from "@/lib/character-engine/generation";
import type { ExpandedCharacter } from "@/types/character";

interface CharacterData {
  id: string;
  name: string;
  summary: string;
  expanded: ExpandedCharacter;
}

interface CharacterContextType {
  /** All locked characters for the current user */
  characters: CharacterData[];
  /** Currently active character (selected) */
  activeCharacter: CharacterData | null;
  /** The identity block text for the active character */
  identityBlock: string | null;
  /** The negative prompt for the active character */
  negativePrompt: string | null;
  /** Display name of the active character */
  activeCharacterName: string | null;
  /** Select a character by ID */
  selectCharacter: (id: string) => void;
  /** Clear selection */
  clearCharacter: () => void;
  /** Refresh characters from DB */
  refreshCharacters: () => Promise<void>;
  /** Loading state */
  loading: boolean;
}

const CharacterContext = createContext<CharacterContextType>({
  characters: [],
  activeCharacter: null,
  identityBlock: null,
  negativePrompt: null,
  activeCharacterName: null,
  selectCharacter: () => {},
  clearCharacter: () => {},
  refreshCharacters: async () => {},
  loading: false,
});

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCharacters = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("characters")
        .select("id, expanded, status")
        .eq("user_id", user.id)
        .eq("status", "locked")
        .order("created_at", { ascending: false });

      if (data) {
        const mapped = data.map((c: any) => ({
          id: c.id,
          name: c.expanded?.name || "?",
          summary: c.expanded?.summary || "",
          expanded: c.expanded as ExpandedCharacter,
        }));
        setCharacters(mapped);

        // If active character was deleted or unlocked, clear it
        if (activeCharacter && !mapped.find((c) => c.id === activeCharacter.id)) {
          setActiveCharacter(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, [user]);

  const selectCharacter = (id: string) => {
    const found = characters.find((c) => c.id === id);
    if (found) setActiveCharacter(found);
  };

  const clearCharacter = () => {
    setActiveCharacter(null);
  };

  const identityBlock = activeCharacter
    ? buildCharacterIdentityBlock(activeCharacter.expanded)
    : null;

  const negativePrompt = activeCharacter
    ? buildNegativePrompt(activeCharacter.expanded)
    : null;

  return (
    <CharacterContext.Provider
      value={{
        characters,
        activeCharacter,
        identityBlock,
        negativePrompt,
        activeCharacterName: activeCharacter?.name || null,
        selectCharacter,
        clearCharacter,
        refreshCharacters: fetchCharacters,
        loading,
      }}
    >
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharacterContext);
}
