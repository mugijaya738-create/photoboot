"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const CAMERA_PREF_KEY = "photobooth.cameraId";

export const getPreferredCamera = () => {
  try {
    return localStorage.getItem(CAMERA_PREF_KEY) || undefined;
  } catch {
    return undefined;
  }
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface UseCameraOptions {
  deviceId?: string;
  idealWidth?: number;
  idealHeight?: number;
}

/**
 * Mengelola MediaStream kamera: membuka, menempel ke <video>, dan mematikan track saat unmount.
 * Mencoba ulang bila kamera masih "sibuk" (mis. baru saja dilepas oleh pemindai QR).
 */
export function useCamera({ deviceId, idealWidth = 1920, idealHeight = 1080 }: UseCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Browser ini tidak mendukung kamera (butuh HTTPS atau localhost).");
        return;
      }
      const id = deviceId ?? getPreferredCamera();
      const video: MediaTrackConstraints = {
        width: { ideal: idealWidth },
        height: { ideal: idealHeight },
        ...(id ? { deviceId: { exact: id } } : { facingMode: "user" }),
      };
      let lastErr: unknown;
      for (let i = 0; i < 6 && !cancelled; i++) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const el = videoRef.current;
          if (el) {
            el.srcObject = stream;
            el.onloadedmetadata = () => {
              el.play().catch(() => {});
              if (!cancelled) setReady(true);
            };
          }
          return;
        } catch (e) {
          lastErr = e;
          const name = (e as DOMException)?.name;
          if (name === "NotReadableError" || name === "AbortError") await sleep(450);
          else break;
        }
      }
      if (!cancelled) {
        const name = (lastErr as DOMException)?.name;
        setError(
          name === "NotAllowedError" ? "Izin kamera ditolak. Izinkan akses kamera di browser."
          : name === "NotFoundError" || name === "OverconstrainedError" ? "Kamera tidak ditemukan."
          : "Kamera tidak bisa dibuka (mungkin sedang dipakai aplikasi lain)."
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [deviceId, idealWidth, idealHeight, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { videoRef, ready, error, retry };
}
