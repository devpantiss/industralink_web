import { useRef, useState } from "react";
import { getLang } from "@/lib/i18n";

/* The Web Speech API is not in TypeScript's DOM types yet, so describe the bits we use. */
interface Recognition {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
}
type RecognitionCtor = new () => Recognition;

const ctor = (): RecognitionCtor | undefined =>
  typeof window === "undefined" ? undefined : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ?? (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition);

/** Speak a job name instead of typing it. Uses the worker's chosen language. Works in Chrome and Edge on Android and desktop. */
export function useVoiceSearch(onText: (text: string) => void, onError?: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const supported = !!ctor();

  const start = () => {
    const C = ctor();
    if (!C) { onError?.("Voice search works in Chrome. Please type the job instead."); return; }
    if (listening) { rec.current?.stop(); return; }
    const r = new C();
    r.lang = `${getLang()}-IN`;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => { const text = e.results[0]?.[0]?.transcript?.trim(); if (text) onText(text); };
    r.onerror = (e) => { if (e.error !== "aborted" && e.error !== "no-speech") onError?.(e.error === "not-allowed" ? "Allow the microphone to search by voice." : "Couldn't hear that. Please try again."); };
    r.onend = () => setListening(false);
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  return { start, listening, supported };
}
