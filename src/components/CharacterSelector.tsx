import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Users, X, Lock, ChevronDown } from "lucide-react";
import { buildCharacterIdentityBlock } from "@/lib/character-engine/generation";

interface CharacterOption {
  id: string;
  name: string;
  summary: string;
  status: string;
  expanded: any;
}

type Props = {
  onSelect: (characterBlock: string | null, characterName: string | null) => void;
  selectedName: string | null;
};

export function CharacterSelector({ onSelect, selectedName }: Props) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isPT = i18n.language?.startsWith("pt");
  const [characters, setCharacters] = useState<CharacterOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("characters")
        .select("id, expanded, status")
        .eq("user_id", user.id)
        .eq("status", "locked")
        .order("created_at", { ascending: false });

      if (data) {
        setCharacters(
          data.map((c: any) => ({
            id: c.id,
            name: c.expanded?.name || "?",
            summary: c.expanded?.summary || "",
            status: c.status,
            expanded: c.expanded,
          }))
        );
      }
    })();
  }, [user]);

  if (characters.length === 0) return null;

  const handleSelect = (char: CharacterOption) => {
    const block = buildCharacterIdentityBlock(char.expanded);
    onSelect(block, char.name);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null, null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
          selectedName
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
        }`}
      >
        <Users className="h-3 w-3" />
        {selectedName || (isPT ? "Personagem" : "Character")}
        {selectedName ? (
          <X className="h-3 w-3 ml-0.5 hover:text-destructive" onClick={handleClear} />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                {isPT ? "Personagens Locked" : "Locked Characters"}
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelect(char)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                >
                  <Lock className="h-3 w-3 text-green-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{char.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{char.summary}</div>
                  </div>
                </button>
              ))}
            </div>
            {selectedName && (
              <div className="p-2 border-t border-border">
                <button
                  onClick={() => { onSelect(null, null); setOpen(false); }}
                  className="w-full text-xs text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  {isPT ? "Remover personagem" : "Remove character"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
