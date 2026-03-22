import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleApiKey } from "@/hooks/useGoogleApiKey";
import { Loader2, ImageIcon, Download, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  prompt: string;
};

export function GenerateImageButton({ prompt }: Props) {
  const apiKey = useGoogleApiKey();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!apiKey) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            prompt,
            apiKey,
          }),
        }
      );

      const data = await resp.json();

      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      if (data.image) {
        const url = `data:${data.image.mimeType};base64,${data.image.data}`;
        setImageUrl(url);
        toast.success("Imagem gerada!");
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate image");
      toast.error("Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `savvyowl-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="mt-2">
      {!imageUrl && (
        <Button
          onClick={handleGenerate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
        >
          {loading ? (
            <><Loader2 className="h-3 w-3 animate-spin" />A gerar imagem...</>
          ) : (
            <><ImageIcon className="h-3 w-3" />Gerar Imagem (Nano Banana)</>
          )}
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {imageUrl && (
        <div className="mt-2 relative inline-block">
          <img
            src={imageUrl}
            alt="Generated"
            className="rounded-lg max-w-full max-h-[400px] border border-border/50"
          />
          <div className="flex gap-1.5 mt-2">
            <Button onClick={handleDownload} size="sm" variant="outline" className="text-xs gap-1">
              <Download className="h-3 w-3" />Download
            </Button>
            <Button onClick={() => { setImageUrl(null); setError(null); }} size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground">
              <X className="h-3 w-3" />Fechar
            </Button>
            <Button onClick={handleGenerate} disabled={loading} size="sm" variant="outline" className="text-xs gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              Gerar outra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
