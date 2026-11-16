"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { COUNTDOWN_SECONDS, TOTAL_SHOTS } from "@/lib/constants";

/**
 * CameraCapture — komponen kamera yang berdiri sendiri (tanpa Firebase/tiket/template).
 * Mudah disesuaikan: ubah props, atau ganti tampilan overlay di bagian JSX bawah.
 *
 *  - live preview (mirror horizontal, bisa dimatikan lewat `mirror`)
 *  - `totalShots` jepretan otomatis, masing-masing didahului hitung mundur `countdownSeconds`
 *  - preview dan hasil jepretan di-crop ke `aspectRatio` yang sama (WYSIWYG terhadap slot frame)
 */
export interface CapturedShot {
  id: string;
  blob: Blob;
  /** object URL (sudah dibuat). Pemilik komponen induk bertanggung jawab me-revoke */
  url: string;
}

export interface CameraCaptureProps {
  /** lebar / tinggi area crop. Mis. 1.42 untuk slot landscape */
  aspectRatio: number;
  totalShots?: number;
  countdownSeconds?: number;
  /** jeda setelah jepretan sebelum hitung mundur berikutnya */
  betweenShotsMs?: number;
  /** jeda awal setelah kamera siap ("Bersiap…") */
  introMs?: number;
  /** cerminkan preview (seperti kaca) */
  mirror?: boolean;
  /** cerminkan juga file hasil jepretan agar sama dengan yang dilihat pengguna */
  mirrorOutput?: boolean;
  maxOutputWidth?: number;
  jpegQuality?: number;
  deviceId?: string;
  /** mulai otomatis begitu kamera siap */
  autoStart?: boolean;
  onShot?: (shot: CapturedShot, index: number) => void;
  onComplete: (shots: CapturedShot[]) => void;
  className?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CameraCapture({
  aspectRatio,
  totalShots = TOTAL_SHOTS,
  countdownSeconds = COUNTDOWN_SECONDS,
  betweenShotsMs = 1300,
  introMs = 1200,
  mirror = true,
  mirrorOutput = true,
  maxOutputWidth = 1800,
  jpegQuality = 0.92,
  deviceId,
  autoStart = true,
  onShot,
  onComplete,
  className = "",
}: CameraCaptureProps) {
  const { videoRef, ready, error, retry } = useCamera({ deviceId });
  const [phase, setPhase] = useState<"init" | "intro" | "countdown" | "captured" | "done">("init");
  const [count, setCount] = useState(0);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [flash, setFlash] = useState(0);

  const onShotRef = useRef(onShot);
  const onCompleteRef = useRef(onComplete);
  onShotRef.current = onShot;
  onCompleteRef.current = onComplete;

  /** Ambil 1 frame dari <video>, crop tengah ke aspectRatio, hasilkan JPEG */
  const captureFrame = useCallback(async (): Promise<CapturedShot> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) throw new Error("Kamera belum siap");
    const vw = video.videoWidth, vh = video.videoHeight;
    let sw = vw, sh = vw / aspectRatio;
    if (sh > vh) {
      sh = vh;
      sw = vh * aspectRatio;
    }
    const sx = (vw - sw) / 2, sy = (vh - sh) / 2;
    const outW = Math.min(Math.round(sw), maxOutputWidth);
    const outH = Math.round(outW / aspectRatio);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;
    if (mirrorOutput) {
      ctx.translate(outW, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("capture gagal"))), "image/jpeg", jpegQuality));
    return { id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) };
  }, [videoRef, aspectRatio, maxOutputWidth, mirrorOutput, jpegQuality]);

  // urutan otomatis: intro → (countdown → jepret → jeda) × totalShots → selesai
  useEffect(() => {
    if (!ready || !autoStart) return;
    let cancelled = false;
    const taken: CapturedShot[] = [];
    setShots([]);

    (async () => {
      setPhase("intro");
      await sleep(introMs);
      for (let i = 0; i < totalShots; i++) {
        if (cancelled) return;
        setPhase("countdown");
        for (let c = countdownSeconds; c > 0; c--) {
          setCount(c);
          await sleep(1000);
          if (cancelled) return;
        }
        setCount(0);
        let shot: CapturedShot;
        try {
          shot = await captureFrame();
        } catch {
          i--; // ulangi jepretan ini
          await sleep(500);
          continue;
        }
        if (cancelled) {
          URL.revokeObjectURL(shot.url);
          return;
        }
        taken.push(shot);
        setShots([...taken]);
        setFlash((f) => f + 1);
        setPhase("captured");
        onShotRef.current?.(shot, i);
        if (i < totalShots - 1) await sleep(betweenShotsMs);
      }
      if (cancelled) return;
      setPhase("done");
      await sleep(500);
      if (!cancelled) onCompleteRef.current(taken);
    })();

    return () => {
      cancelled = true;
      // bila dibatalkan di tengah jalan, lepaskan URL yang belum diserahkan ke induk
      if (taken.length < totalShots) taken.forEach((s) => URL.revokeObjectURL(s.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoStart]);

  return (
    <div className={`flex h-full min-h-0 flex-col items-center gap-4 ${className}`}>
      {/* ---------- area preview ---------- */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
        <div
          className="relative max-h-full max-w-full overflow-hidden rounded-3xl bg-black shadow-2xl ring-2 ring-gold-400/60"
          style={{ aspectRatio: String(aspectRatio), height: "100%" }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${mirror ? "-scale-x-100" : ""}`}
          />

          {/* pojok bingkai */}
          <div aria-hidden className="pointer-events-none absolute inset-4 rounded-2xl border border-cream-50/25" />

          {/* penghitung foto */}
          <div className="absolute left-4 top-4 rounded-full bg-black/45 px-4 py-1.5 text-sm font-medium tracking-widest text-cream-50 backdrop-blur">
            FOTO {Math.min(shots.length + (phase === "countdown" || phase === "intro" ? 1 : 0), totalShots)} / {totalShots}
          </div>

          {/* hitung mundur */}
          {phase === "countdown" && count > 0 && (
            <div key={count} className="absolute inset-0 flex items-center justify-center">
              <span className="animate-pop font-serif text-[min(34vh,22rem)] font-bold leading-none text-cream-50 drop-shadow-[0_6px_24px_rgba(0,0,0,.55)]">
                {count}
              </span>
            </div>
          )}
          {phase === "intro" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="animate-pop font-script text-6xl text-cream-50">Bersiap… senyum!</span>
            </div>
          )}
          {phase === "done" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="animate-pop font-script text-6xl text-cream-50">Selesai!</span>
            </div>
          )}

          {/* kilat */}
          {flash > 0 && <div key={flash} className="pointer-events-none absolute inset-0 animate-flash bg-white" />}

          {/* status kamera */}
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-cream-50/80">Membuka kamera…</div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-pine-950/90 p-8 text-center text-cream-50">
              <p className="max-w-md text-lg">{error}</p>
              <button onClick={retry} className="rounded-xl bg-gold-400 px-6 py-3 font-medium text-pine-950">Coba lagi</button>
            </div>
          )}
        </div>
      </div>

      {/* ---------- filmstrip jepretan ---------- */}
      <div className="flex h-[11vh] min-h-14 shrink-0 items-center gap-3">
        {Array.from({ length: totalShots }, (_, i) => {
          const s = shots[i];
          return (
            <div
              key={i}
              className={`h-full overflow-hidden rounded-lg ring-1 ${s ? "ring-gold-400" : "ring-cream-50/20"} bg-black/30`}
              style={{ aspectRatio: String(aspectRatio) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s && <img src={s.url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
