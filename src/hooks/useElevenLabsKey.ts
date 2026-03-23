import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useElevenLabsKey() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [voiceName, setVoiceName] = useState("");

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`savvyowl_elevenlabs_key_${user.id}`);
      if (stored) setApiKey(stored);
      const storedVoice = localStorage.getItem(`savvyowl_elevenlabs_voice_${user.id}`);
      if (storedVoice) {
        try {
          const parsed = JSON.parse(storedVoice);
          setVoiceId(parsed.id || "");
          setVoiceName(parsed.name || "");
        } catch {
          setVoiceId(storedVoice);
        }
      }
    }
  }, [user?.id]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (user?.id) {
      if (key) {
        localStorage.setItem(`savvyowl_elevenlabs_key_${user.id}`, key);
      } else {
        localStorage.removeItem(`savvyowl_elevenlabs_key_${user.id}`);
      }
    }
  };

  const saveVoice = (id: string, name: string) => {
    setVoiceId(id);
    setVoiceName(name);
    if (user?.id) {
      localStorage.setItem(`savvyowl_elevenlabs_voice_${user.id}`, JSON.stringify({ id, name }));
    }
  };

  return { apiKey, voiceId, voiceName, saveApiKey, saveVoice, hasKey: !!apiKey, hasVoice: !!voiceId };
}
