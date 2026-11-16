"use client";
import { QrScanner } from "./QrScanner";
import { PinPad } from "./PinPad";
import { HowToUse } from "./HowToUse";
import { Sparkle } from "../ui/Snow";

export function StandbyScreen({
  onTicket, busy, error, cameraId,
}: {
  onTicket: (by: { ticketId: string } | { pin: string }) => void;
  busy: boolean;
  error: string | null;
  cameraId?: string;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col gap-5 px-4 pb-5 pt-2 sm:px-6 lg:h-full">
      <div className="grid flex-1 gap-6 lg:min-h-0 lg:grid-cols-[1.1fr_1fr]">
        {/* ---- kiri: QR ---- */}
        <section className="flex flex-col gap-4 rounded-[2rem] bg-cream-50/[0.05] p-5 sm:p-6 lg:min-h-0 ring-1 ring-cream-50/10">
          <div className="flex items-center gap-3 text-gold-400"><Sparkle /><span className="text-xs font-bold tracking-[0.3em]">STEP.01</span></div>
          <div>
            <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl text-cream-50">Scan QR tiketmu</h1>
            <p className="mt-1 text-cream-50/60">Arahkan QR pada struk ke kamera · <span className="text-cream-50/45">Show the QR on your receipt to the camera</span></p>
          </div>
          <div className="relative h-[300px] sm:h-[380px] lg:h-auto lg:min-h-0 lg:flex-1">
            <QrScanner deviceId={cameraId} onScan={(t) => !busy && onTicket({ ticketId: t })} />
          </div>
        </section>

        {/* ---- kanan: PIN ---- */}
        <section className="flex flex-col items-center justify-center gap-6 rounded-[2rem] bg-cream-50/[0.05] p-5 sm:p-6 lg:min-h-0 ring-1 ring-cream-50/10">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-cream-50">Atau masukkan PIN</h2>
            <p className="text-sm text-cream-50/55">6 digit di bawah QR pada struk</p>
          </div>
          <PinPad disabled={busy} onSubmit={(pin) => onTicket({ pin })} />
          <div className="h-12 text-center">
            {busy && <p className="animate-pulse text-gold-300">Memeriksa tiket…</p>}
            {!busy && error && <p className="max-w-sm rounded-xl bg-berry-500/15 px-4 py-2 text-berry-400 ring-1 ring-berry-400/30">{error}</p>}
          </div>
        </section>
      </div>
      <HowToUse active={0} />
    </div>
  );
}
