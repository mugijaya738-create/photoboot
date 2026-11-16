"use client";
import { useEffect, useId, useRef, useState } from "react";
import { getPreferredCamera } from "@/hooks/useCamera";

/** Pemindai QR berbasis html5-qrcode. Kamera dilepas penuh saat unmount. */
export function QrScanner({ onScan, deviceId }: { onScan: (text: string) => void; deviceId?: string }) {
  const rawId = useId();
  const elId = "qr-" + rawId.replace(/[^a-zA-Z0-9]/g, "");
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let started = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null;
    let lastText = "";
    let lastAt = 0;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode(elId, { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
        const id = deviceId ?? getPreferredCamera();
        await scanner.start(
          id ? { deviceId: { exact: id } } : { facingMode: "user" },
          { fps: 12, qrbox: (w: number, h: number) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; } },
          (text: string) => {
            const now = Date.now();
            if (text === lastText && now - lastAt < 2500) return; // redam pemindaian ganda
            lastText = text;
            lastAt = now;
            onScanRef.current(text);
          },
          () => {}
        );
        started = true;
        if (cancelled) {
          await scanner.stop();
          scanner.clear();
        }
      } catch (e) {
        if (!cancelled) setError(typeof e === "string" ? e : (e as Error)?.message || "Kamera tidak bisa dibuka");
      }
    })();

    return () => {
      cancelled = true;
      if (scanner && started) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      }
    };
  }, [elId, deviceId]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-black">
      <div id={elId} className="qr-reader h-full w-full" />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-pine-950/90 p-6 text-center text-cream-50/90">
          {error}. Gunakan PIN 6 digit di samping.
        </div>
      )}
      {/* siku pemindai */}
      {(["left-5 top-5 border-l-4 border-t-4 rounded-tl-2xl", "right-5 top-5 border-r-4 border-t-4 rounded-tr-2xl", "left-5 bottom-5 border-l-4 border-b-4 rounded-bl-2xl", "right-5 bottom-5 border-r-4 border-b-4 rounded-br-2xl"] as const).map((c) => (
        <span key={c} aria-hidden className={`pointer-events-none absolute h-12 w-12 border-gold-400 ${c}`} />
      ))}
    </div>
  );
}
