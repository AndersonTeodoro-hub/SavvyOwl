import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Download, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useElevenLabsKey } from "@/hooks/useElevenLabsKey";
import { toast } from "sonner";

interface Props {
  text: string;
}

export function GenerateVoiceButton({ text }: Props) {
  const { apiKey, voiceId, voiceName, hasKey, hasVoice } = useElevenLabsKey();
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hasKey) return null; // Only show if user has ElevenLabs key

  const generate = async () => {
    if (!hasVoice) {
      toast.error("Seleciona uma voz nas Definicoes primeiro");
      return;
    }
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-voice", {
        body: { text, voiceId, apiKey },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (data?.audio) {
        const byteChars = atob(data.audio);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate voice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {!audioUrl && (
        <Button
          onClick={generate}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 text-xs border-orange-400/30 text-orange-500 hover:bg-orange-500/10"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando narracao...</>
          ) : (
            <><Mic className="h-3.5 w-3.5" />Gerar Narracao (ElevenLabs){voiceName ? ` - ${voiceName}` : ""}</>
          )}
        </Button>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {audioUrl && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/5 border border-orange-400/20">
          <Volume2 className="h-4 w-4 text-orange-400 shrink-0" />
          <audio controls src={audioUrl} className="flex-1 h-8" style={{ maxWidth: "100%" }} />
          <a
            href={audioUrl}
            download="narracao-savvyowl.mp3"
            className="shrink-0"
          >
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-orange-400">
              <Download className="h-3.5 w-3.5" />MP3
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-orange-400"
            onClick={() => { setAudioUrl(null); generate(); }}
          >
            Gerar outra
          </Button>
        </div>
      )}
    </div>
  );
}
