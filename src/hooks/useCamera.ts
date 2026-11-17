import { useCallback, useEffect, useRef, useState } from "react";

/** Live rear camera. Tracks are always stopped on stop() and on unmount. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setActive(false);
    }
  }, []);

  useEffect(() => stop, [stop]);
  return { videoRef, active, error, start, stop };
}

/** Grab the current video frame onto a canvas. */
export function grabFrame(video: HTMLVideoElement, maxW = 640): HTMLCanvasElement | null {
  if (!video.videoWidth) return null;
  const scale = Math.min(1, maxW / video.videoWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(video.videoWidth * scale);
  c.height = Math.round(video.videoHeight * scale);
  c.getContext("2d")?.drawImage(video, 0, 0, c.width, c.height);
  return c;
}
