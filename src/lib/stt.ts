// Speech recognition feature detection (Chrome exposes webkitSpeechRecognition).
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SpeechRecognitionLike {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null; onstart: (() => void) | null;
}

export function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const sttSupported = Boolean(getRecognitionCtor());
export const vibrationSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

export function vibrate(pattern: number | number[]) {
  try { if (vibrationSupported) navigator.vibrate(pattern); } catch { /* ignore */ }
}
