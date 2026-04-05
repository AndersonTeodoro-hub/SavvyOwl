import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCharacter } from "@/contexts/CharacterContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Video, Download,
  Users, Sparkles, Mic, Upload, FileText, Film, Coins, Play,
} from "lucide-react";

type Step = "upload" | "character" | "voice" | "text" | "generate" | "result";

const STEP_KEYS: Step[] = ["upload", "character", "voice", "text", "generate", "result"];

export default function DubbingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { characters } = useCharacter();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const STEPS = STEP_KEYS.map((key) => ({ key, label: t(`dubbing.steps.${key}`) }));

  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);

  // Step 1 — Upload
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(10);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — Character
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedCharName, setSelectedCharName] = useState<string | null>(null);
  const [selectedCharImageUrl, setSelectedCharImageUrl] = useState<string | null>(null);

  // Step 3 — Voice
  const [voiceMode, setVoiceMode] = useState<"character" | "upload" | null>(null);
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Step 4 — Text
  const [dubText, setDubText] = useState("");

  // Step 5/6 — Generate & Result
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const getHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  // ── Step 1: Upload video ──
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error(t("dubbing.upload.fileTooLarge"));
      return;
    }

    setVideoFile(file);
    setVideoPreviewUrl(URL.createObjectURL(file));

    // Detect duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration);
      if (dur > 30) {
        toast.error(t("dubbing.upload.tooLong"));
        setVideoFile(null);
        setVideoPreviewUrl(null);
        return;
      }
      setVideoDuration(dur);
    };
    video.src = URL.createObjectURL(file);
  };

  const handleUploadVideo = async () => {
    if (!videoFile || !user?.id) return;
    setLoading(true);
    try {
      const storagePath = `dubbing/${user.id}/${Date.now()}.mp4`;
      const { error } = await supabase.storage
        .from("character-references")
        .upload(storagePath, videoFile, { contentType: videoFile.type, upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("character-references")
        .getPublicUrl(storagePath);

      setVideoUrl(urlData?.publicUrl || null);
      toast.success(t("dubbing.upload.uploaded"));
      setStep("character");
    } catch (e: any) {
      toast.error(e.message || t("dubbing.upload.uploadError"));
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Select character ──
  const handleSelectChar = async (charId: string, charName: string, imageUrl: string | null) => {
    setSelectedCharId(charId);
    setSelectedCharName(charName);
    setSelectedCharImageUrl(imageUrl);

    // Fetch voice ID
    const { data } = await supabase
      .from("characters")
      .select("elevenlabs_voice_id")
      .eq("id", charId)
      .single();

    if (data?.elevenlabs_voice_id) {
      toast.success(t("dubbing.character.voiceDetected", { name: charName }));
    }

    setStep("voice");
  };

  // ── Step 3: Voice ──
  const handleVoiceFromCharacter = async () => {
    if (!selectedCharId) return;
    setVoiceLoading(true);
    try {
      const headers = await getHeaders();
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      // Generate 10s voice sample via generate-voice
      const { data: charData } = await supabase
        .from("characters")
        .select("elevenlabs_voice_id")
        .eq("id", selectedCharId)
        .single();

      if (!charData?.elevenlabs_voice_id) {
        toast.error(t("dubbing.voice.noVoiceConfigured"));
        setVoiceLoading(false);
        return;
      }

      // Generate a short sample
      const voiceResp = await fetch(`${baseUrl}/generate-voice`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: "This is a voice sample for character dubbing. The voice should sound natural and expressive.",
          voiceId: charData.elevenlabs_voice_id,
          provider: "elevenlabs",
        }),
      });
      const voiceData = await voiceResp.json();
      if (voiceData.error) throw new Error(voiceData.error);

      // Upload voice sample to storage
      const audioBytes = Uint8Array.from(atob(voiceData.audio), (c) => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: "audio/mpeg" });
      const samplePath = `dubbing/${user!.id}/voice_sample_${Date.now()}.mp3`;
      await supabase.storage
        .from("character-references")
        .upload(samplePath, audioBlob, { contentType: "audio/mpeg", upsert: true });

      const { data: sampleUrlData } = supabase.storage
        .from("character-references")
        .getPublicUrl(samplePath);

      const sampleUrl = sampleUrlData?.publicUrl;
      if (!sampleUrl) throw new Error("Falha ao obter URL da amostra");

      // Create voice on Kling
      const cvResp = await fetch(`${baseUrl}/generate-video`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "create-voice", voiceUrl: sampleUrl }),
      });
      const cvData = await cvResp.json();
      if (cvData.error) throw new Error(cvData.error);
      if (!cvData.voiceId) throw new Error("Sem voiceId retornado");

      setVoiceId(cvData.voiceId);
      setVoiceMode("character");
      toast.success(t("dubbing.voice.voiceCreated"));
      setStep("text");
    } catch (e: any) {
      toast.error(e.message || t("dubbing.voice.voiceError"));
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoiceAudioFile(file);
  };

  const handleSubmitVoiceUpload = async () => {
    if (!voiceAudioFile || !user?.id) return;
    setVoiceLoading(true);
    try {
      const headers = await getHeaders();
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      // Upload to storage
      const ext = voiceAudioFile.name.endsWith(".wav") ? "wav" : "mp3";
      const samplePath = `dubbing/${user.id}/voice_upload_${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("character-references")
        .upload(samplePath, voiceAudioFile, { contentType: voiceAudioFile.type, upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("character-references")
        .getPublicUrl(samplePath);
      const sampleUrl = urlData?.publicUrl;
      if (!sampleUrl) throw new Error("Falha ao obter URL");

      // Create voice on Kling
      const cvResp = await fetch(`${baseUrl}/generate-video`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "create-voice", voiceUrl: sampleUrl }),
      });
      const cvData = await cvResp.json();
      if (cvData.error) throw new Error(cvData.error);
      if (!cvData.voiceId) throw new Error("Sem voiceId retornado");

      setVoiceId(cvData.voiceId);
      setVoiceMode("upload");
      toast.success(t("dubbing.voice.voiceCreated"));
      setStep("text");
    } catch (e: any) {
      toast.error(e.message || t("dubbing.voice.voiceError"));
    } finally {
      setVoiceLoading(false);
    }
  };

  // ── Step 5: Generate ──
  const handleGenerate = async () => {
    if (!videoUrl || !selectedCharImageUrl || !dubText.trim()) return;
    setGenerating(true);
    setProgress(t("dubbing.generate.generating"));
    try {
      const headers = await getHeaders();
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`;

      const submitBody: Record<string, unknown> = {
        prompt: dubText,
        model: "kling-motion-pro",
        referenceImageUrl: selectedCharImageUrl,
        referenceVideoUrl: videoUrl,
        generate_audio: true,
        aspectRatio: "9:16",
        duration: videoDuration,
      };
      if (voiceId) {
        submitBody.voiceIds = [voiceId];
      }

      const submitResp = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(submitBody),
      });
      const submitData = await submitResp.json();

      if (submitData.error === "insufficient_credits") {
        toast.error(submitData.message);
        setGenerating(false);
        return;
      }
      if (submitData.error) throw new Error(submitData.error);
      if (submitData.status !== "SUBMITTED") throw new Error("Falha ao submeter");

      const { statusUrl, responseUrl } = submitData;
      setProgress(t("dubbing.generate.generatingProgress"));

      // Poll
      const maxWait = 900000;
      let elapsed = 0;
      while (elapsed < maxWait) {
        await new Promise((r) => setTimeout(r, 5000));
        elapsed += 5000;

        const pollResp = await fetch(baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "poll", requestId: "poll", statusUrl, responseUrl }),
        });
        const pollData = await pollResp.json();

        if (pollData.status === "COMPLETED" && pollData.videoUrl) {
          setResultVideoUrl(pollData.videoUrl);
          setStep("result");
          toast.success(t("dubbing.generate.success", { seconds: Math.round(elapsed / 1000) }));
          return;
        }
        if (pollData.status === "FAILED") {
          // Refund credits
          try {
            await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify({ action: "refund", model: "kling-motion-pro" }) });
            refreshProfile();
            toast.warning(t("dubbing.generate.refunded"));
          } catch {}
          throw new Error(pollData.error || t("dubbing.generate.failed"));
        }
        setProgress(t("dubbing.generate.generatingElapsed", { seconds: Math.round(elapsed / 1000) }));
      }
      throw new Error(t("dubbing.generate.timeout"));
    } catch (e: any) {
      toast.error(e.message || t("dubbing.generate.error"));
    } finally {
      setGenerating(false);
      setProgress("");
    }
  };

  const handleDownload = () => {
    if (!resultVideoUrl) return;
    const a = document.createElement("a");
    a.href = resultVideoUrl;
    a.download = `savvyowl-dubbing-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Header */}
      <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/chat")} className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />{t("dubbing.back")}
          </Button>
          <Mic className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-foreground">{t("dubbing.title")}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-0.5">
            <Coins className="h-3 w-3 text-orange-500" />
            <span className="text-[11px] font-bold text-orange-500">{profile?.credits_balance ?? 0}</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 rounded-full transition-all ${
                i <= currentStepIndex ? "bg-orange-500 w-6" : "bg-border w-3"
              }`}
            />
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">

          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <Upload className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.upload.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("dubbing.upload.subtitle")}</p>
              </div>

              {videoPreviewUrl ? (
                <div className="space-y-3">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full rounded-xl border border-border max-h-64 object-contain bg-black"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {videoFile?.name} · {videoDuration}s · {Math.round((videoFile?.size || 0) / 1024 / 1024)}MB
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }} className="text-xs">
                      {t("dubbing.upload.changeVideo")}
                    </Button>
                    <Button onClick={handleUploadVideo} disabled={loading} className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700 text-sm">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      {loading ? t("dubbing.upload.uploading") : t("dubbing.upload.uploadAndNext")}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full p-8 rounded-xl border-2 border-dashed border-border hover:border-orange-400/40 transition-colors text-center"
                >
                  <Video className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t("dubbing.upload.selectVideo")}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{t("dubbing.upload.formats")}</p>
                </button>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoSelect}
              />
            </div>
          )}

          {/* ── STEP: CHARACTER ── */}
          {step === "character" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Users className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.character.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("dubbing.character.subtitle")}</p>
              </div>

              <div className="space-y-2">
                {characters.filter((c) => c.referenceImageUrl).map((char) => (
                  <button
                    key={char.id}
                    onClick={() => handleSelectChar(char.id, char.name, char.referenceImageUrl || null)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedCharId === char.id
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-border/50 bg-secondary/20 hover:bg-secondary/40"
                    }`}
                  >
                    {char.referenceImageUrl && (
                      <img src={char.referenceImageUrl} alt={char.name} className="h-10 w-10 rounded-lg object-cover border border-border/50" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block">{char.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate block">{char.summary}</span>
                    </div>
                    <span className="text-[9px] text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">ref ✓</span>
                  </button>
                ))}
              </div>

              {characters.filter((c) => c.referenceImageUrl).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">{t("dubbing.character.noCharacters")}</p>
                  <Button variant="outline" onClick={() => navigate("/dashboard/characters")} className="gap-2 text-xs">
                    <Sparkles className="h-3.5 w-3.5" />{t("dubbing.character.createCharacter")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: VOICE ── */}
          {step === "voice" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Mic className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.voice.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("dubbing.voice.subtitle")}</p>
              </div>

              {/* Option 1: Character voice */}
              <button
                onClick={handleVoiceFromCharacter}
                disabled={voiceLoading}
                className="w-full p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("dubbing.voice.useCharacterVoice")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("dubbing.voice.useCharacterVoiceDesc")}</p>
                  </div>
                  {voiceLoading && voiceMode !== "upload" && <Loader2 className="h-4 w-4 animate-spin text-orange-500 ml-auto" />}
                </div>
              </button>

              {/* Option 2: Upload voice */}
              <div className="p-4 rounded-xl border border-border/50 bg-secondary/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("dubbing.voice.uploadVoice")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("dubbing.voice.uploadVoiceDesc")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => voiceInputRef.current?.click()} className="text-xs gap-1.5">
                    <Upload className="h-3 w-3" />{voiceAudioFile ? voiceAudioFile.name : t("dubbing.voice.selectFile")}
                  </Button>
                  {voiceAudioFile && (
                    <Button size="sm" onClick={handleSubmitVoiceUpload} disabled={voiceLoading} className="text-xs gap-1.5 bg-orange-600 hover:bg-orange-700">
                      {voiceLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                      {t("dubbing.voice.registerVoice")}
                    </Button>
                  )}
                </div>
                <input
                  ref={voiceInputRef}
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp3"
                  className="hidden"
                  onChange={handleVoiceUpload}
                />
              </div>

              {/* Skip */}
              <Button variant="ghost" size="sm" onClick={() => setStep("text")} className="w-full text-xs text-muted-foreground">
                {t("dubbing.voice.skipVoice")}
              </Button>

              {voiceId && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-green-500">{t("dubbing.voice.voiceRegistered")}</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: TEXT ── */}
          {step === "text" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <FileText className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.text.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("dubbing.text.subtitle")}</p>
              </div>

              <textarea
                value={dubText}
                onChange={(e) => setDubText(e.target.value)}
                placeholder={t("dubbing.text.placeholder")}
                rows={5}
                className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-orange-400/40 resize-y"
              />

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("dubbing.text.cost")}:</span>
                  <span className="text-orange-500 font-bold">30 {t("dubbing.text.credits")}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">{t("dubbing.text.balance")}:</span>
                  <span className={`font-bold ${(profile?.credits_balance ?? 0) >= 30 ? "text-green-500" : "text-destructive"}`}>
                    {profile?.credits_balance ?? 0} {t("dubbing.text.credits")}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Kling Motion Pro · {videoDuration}s · {selectedCharName} · {voiceId ? t("dubbing.text.customVoice") : t("dubbing.text.noVoice")}
                </p>
              </div>

              <Button
                onClick={() => setStep("generate")}
                disabled={!dubText.trim()}
                className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <ArrowRight className="h-4 w-4" />{t("dubbing.text.nextStep")}
              </Button>
            </div>
          )}

          {/* ── STEP: GENERATE ── */}
          {step === "generate" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Film className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.generate.title")}</h2>
                <p className="text-xs text-muted-foreground">{t("dubbing.generate.subtitle")}</p>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-muted-foreground">{t("dubbing.generate.video")}:</span>
                  <span className="text-foreground">{videoDuration}s</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-muted-foreground">{t("dubbing.generate.character")}:</span>
                  <span className="text-foreground">{selectedCharName}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-muted-foreground">{t("dubbing.generate.voice")}:</span>
                  <span className="text-foreground">{voiceId ? t("dubbing.generate.custom") : t("dubbing.generate.noVoice")}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-muted-foreground">{t("dubbing.generate.model")}:</span>
                  <span className="text-foreground">Kling Motion Pro</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <span className="text-muted-foreground">{t("dubbing.generate.cost")}:</span>
                  <span className="text-orange-500 font-bold">30 {t("dubbing.text.credits")}</span>
                </div>
              </div>

              {generating ? (
                <div className="text-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-3" />
                  <p className="text-sm text-foreground">{progress}</p>
                </div>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={!videoUrl || !selectedCharImageUrl || !dubText.trim()}
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-700 text-sm"
                >
                  <Play className="h-4 w-4" />{t("dubbing.generate.generateButton")}
                </Button>
              )}
            </div>
          )}

          {/* ── STEP: RESULT ── */}
          {step === "result" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-foreground">{t("dubbing.result.title")}</h2>
              </div>

              {resultVideoUrl && (
                <video
                  src={resultVideoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-xl border border-border max-h-96 object-contain bg-black"
                />
              )}

              <div className="flex gap-2">
                <Button onClick={handleDownload} className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700">
                  <Download className="h-4 w-4" />{t("dubbing.result.download")}
                </Button>
                <Button variant="outline" onClick={() => { setStep("upload"); setResultVideoUrl(null); setVideoFile(null); setVideoPreviewUrl(null); setVideoUrl(null); }}>
                  {t("dubbing.result.newDubbing")}
                </Button>
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
