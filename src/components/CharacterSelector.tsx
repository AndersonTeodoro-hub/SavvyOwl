import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCharacter } from "@/contexts/CharacterContext";
import { Users, X, Lock, ChevronDown } from "lucide-react";

/**
 * CharacterSelector — dropdown para selecionar personagem locked.
 * Usa o CharacterContext global, permitindo que qualquer componente
 * (templates, botões de gerar, etc.) aceda ao personagem ativo.
 */
export function CharacterSelector() {
  const { i18n } = useTranslation();
  const isPT = i18n.language?.startsWith("pt");
  const [open, setOpen] = useState(false);
  const {
    characters,
    activeCharacterName,
    selectCharacter,
    clearCharacter,
  } = useCharacter();

  if (characters.length === 0) return null;

  const handleSelect = (id: string) => {
    selectCharacter(id);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearCharacter();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
          activeCharacterName
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
        }`}
      >
        <Users className="h-3 w-3" />
        {activeCharacterName || (isPT ? "Personagem" : "Character")}
        {activeCharacterName ? (
          <X className="h-3 w-3 ml-0.5 hover:text-destructive" onClick={handleClear} />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 z-50 w-64 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2">
                {isPT ? "Personagens Locked" : "Locked Characters"}
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => handleSelect(char.id)}
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
            {activeCharacterName && (
              <div className="p-2 border-t border-border">
                <button
                  onClick={() => { clearCharacter(); setOpen(false); }}
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
