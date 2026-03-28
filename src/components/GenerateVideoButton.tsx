import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useGoogleApiKey } from "@/hooks/useGoogleApiKey";
import { useCharacter } from "@/contexts/CharacterContext";
import { Loader2, Video, Download, X, Users, Coins, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Props = { prompt: string };

const VIDEO_MODELS = [
  { id: "wan26-t2v-flash", label: "Wan 2.6 Flash", desc: "Rápido · 15s · 5 créd", credits: 5, maxDur: 15, hasRef: false },
  { id: "wan26-i2v-flash", label: "Wan 2.6 I2V Flash", desc: "Img→Vídeo · 15s · 5 créd", credits: 5, maxDur: 15, hasRef: true },
  { id: "wan26-r2v-flash", label: "Wan 2.6 R2V Flash", desc: "Consistência máx · 15s · 7 créd", credits: 7, maxDur: 15, hasRef: true },
  { id: "veo3-fast",       label: "Veo3 Fast", desc: "Google · 8s · 10 créd", credits: 10, maxDur: 8, hasRef: false },
  { id: "wan26-t2v",       label: "Wan 2.6", desc: "Qualidade alta · 15s · 8 créd", credits: 8, maxDur: 15, hasRef: false },
  { id: "wan26-r2v",       label: "Wan 2.6 R2V", desc: "Consistência + qualidade · 10 créd", credits: 10, maxDur: 15, hasRef: true },
  { id: "veo3",            label: "Veo3", desc: "Premium · 8s · 15 créd", credits: 15, maxDur: 8, hasRef: false },
] as const;

const DURATIONS = [5, 8, 10, 15] as const;

export function GenerateVideoButton({ prompt }: Props) {
  const apiKey = useGoogleApiKey();
  const navigate = useNavigate();
  const { identityBlock, activeCharacterName, referenceImageUrl } = useCharacter();
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [selectedModel, setSelectedModel] = useState("wan26-t2v-flash");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [credits, setCredits] = useState<{ balance: number; cost: number } | null>(null);
  const [noCredits, setNoCredits] = useState(false);

  const currentModelConfig = VIDEO_MODELS.find((m) => m.id === selectedModel) || VIDEO_MODELS[0];

  // Auto-select best model when character reference exists
  const getSmartModel = () => {
    if (referenceImageUrl) {
      // If user picked a non-ref model but has reference, suggest R2V
      const model = VIDEO_MODELS.find((m) => m.id === selectedModel);
      if (model && !model.hasRef) return "wan26-r2v-flash";
    }
    return selectedModel;
  };

  const buildFinalPrompt = (): string => {
    if (!identityBlock) return prompt;
    return `${identityBlock}\n\n── SCENE DIRECTION ──\n${prompt}`;
  };

  const handleGenerate = async () => {
    const modelToUse = getSmartModel();
    const config = VIDEO_MODELS.find((m) => m.id === modelToUse) || VIDEO_MODELS[0];
    const finalDuration = Math.min(duration, config.maxDur);

    setLoading(true);
    setError(null);
    setVideoUrl(null);
    setNoCredits(false);
    setProgress(`A gerar com ${config.label} (${finalDuration}s)...`);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const finalPrompt = buildFinalPrompt();

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            apiKey: apiKey || undefined,
            aspectRatio,
            duration: finalDuration,
            model: modelToUse,
            referenceImageUrl: (config.hasRef && referenceImageUrl) ? referenceImageUrl : undefined,
          }),
        }
      );

      const data = await resp.json();

      if (data.error === "insufficient_credits") {
        setNoCredits(true);
        setError(data.message);
        return;
      }
      if (data.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      if (data.video?.uri) {
        setVideoUrl(data.video.uri);
        if (data.credits) setCredits(data.credits);
        toast.success(`Vídeo gerado em ${data.generationTime}s com ${data.backend}!`);
      } else if (data.video?.data) {
        setVideoUrl(`data:${data.video.mimeType};base64,${data.video.data}`);
        if (data.credits) setCredits(data.credits);
        toast.success(`Vídeo gerado em ${data.generationTime}s!`);
      } else {
        setError("Vídeo gerado mas sem dados. Tenta novamente.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toast.error("Erro ao gerar vídeo");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `savvyowl-${selectedModel}-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="mt-1">
      {/* Trigger button */}
      {!videoUrl && !loading && !showOptions && !noCredits && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            onClick={() => setShowOptions(true)}
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-purple-400/30 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
          >
            <Video className="h-3 w-3" />Gerar Vídeo
          </Button>
          {activeCharacterName && (
            <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
              <Users className="h-2.5 w-2.5" />{activeCharacterName}
              {referenceImageUrl && " · ref ✓"}
            </span>
          )}
        </div>
      )}

      {/* Options panel */}
      {showOptions && !loading && !videoUrl && (
        <div className="bg-secondary/30 rounded-xl p-3 space-y-3 border border-border/50">
          {/* Model selector */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Modelo</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {VIDEO_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                const needsRef = m.hasRef && !referenceImageUrl;
                return (
                  <button
                    key={m.id}
                    onClick={() => !needsRef && setSelectedModel(m.id)}
                    className={`text-left p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10"
                        : needsRef
                        ? "border-border/30 opacity-40 cursor-not-allowed"
                        : "border-border/50 hover:border-purple-400/40 hover:bg-secondary/50"
                    }`}
                    title={needsRef ? "Precisa de personagem com imagem de referência" : ""}
                  >
                    <span className="font-medium block text-[11px]">{m.label}</span>
                    <span className="text-[9px] text-muted-foreground">{m.desc}</span>
                    {needsRef && <span className="text-[8px] text-amber-500 block mt-0.5">Precisa ref image</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect ratio + Duration */}
          <div className="flex gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Formato</p>
              <div className="flex gap-1">
                {([
                  { value: "9:16", label: "9:16", desc: "Reels" },
                  { value: "16:9", label: "16:9", desc: "YT" },
                  { value: "1:1", label: "1:1", desc: "Feed" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAspectRatio(opt.value)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      aspectRatio === opt.value
                        ? "bg-purple-600 text-white"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Duração</p>
              <div className="flex gap-1">
                {DURATIONS.filter((d) => d <= currentModelConfig.maxDur).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      duration === d
                        ? "bg-purple-600 text-white"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Smart model suggestion */}
          {referenceImageUrl && !currentModelConfig.hasRef && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-[10px] text-green-700 dark:text-green-400">
              Tens imagem de referência de <strong>{activeCharacterName}</strong>. Para máxima consistência, usa <strong>Wan 2.6 R2V Flash</strong>.
              <button
                onClick={() => setSelectedModel("wan26-r2v-flash")}
                className="ml-1 underline font-medium"
              >
                Usar R2V
              </button>
            </div>
          )}

          {/* Generate + cancel */}
          <div className="flex gap-2 items-center">
            <Button
              onClick={() => { setShowOptions(false); handleGenerate(); }}
              size="sm"
              className="text-xs gap-1.5 bg-purple-600 text-white hover:bg-purple-700"
            >
              <Video className="h-3 w-3" />
              Gerar · {currentModelConfig.credits} créditos
            </Button>
            <button
              onClick={() => setShowOptions(false)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {noCredits && (
        <div className="bg-secondary/30 rounded-lg p-3 text-xs space-y-2 mt-1">
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate("/dashboard/settings")} size="sm" className="text-xs gap-1.5 bg-purple-600 text-white">
            <Coins className="h-3 w-3" />Carregar créditos
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{progress}</span>
        </div>
      )}

      {error && !noCredits && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {videoUrl && (
        <div className="mt-2">
          <video src={videoUrl} controls autoPlay loop className="rounded-lg max-w-full max-h-[400px] border border-border/50" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Button onClick={handleDownload} size="sm" variant="outline" className="text-xs gap-1">
              <Download className="h-3 w-3" />Download MP4
            </Button>
            <Button onClick={() => { setVideoUrl(null); setError(null); setShowOptions(true); }} size="sm" variant="ghost" className="text-xs gap-1 text-muted-foreground">
              <X className="h-3 w-3" />Fechar
            </Button>
          </div>
          {activeCharacterName && (
            <p className="text-[10px] text-green-600/70 dark:text-green-400/70 mt-1">
              Identity lock: {activeCharacterName}{referenceImageUrl ? " · ref frame ✓" : ""}
            </p>
          )}
          {credits && (
            <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1">
              <Coins className="h-2.5 w-2.5" />{credits.balance} créditos restantes
            </p>
          )}
        </div>
      )}
    </div>
  );
}
