import { useCallback, useEffect } from "react";
import { speak, stopSpeaking, ttsSupported } from "../lib/tts";

export function useTTS() {
  useEffect(() => () => stopSpeaking(), []);
  const say = useCallback((text: string, force = false) => speak(text, { force }), []);
  return { speak: say, stop: stopSpeaking, supported: ttsSupported };
}
