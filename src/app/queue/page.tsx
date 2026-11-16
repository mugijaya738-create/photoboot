"use client";
import { useEffect, useState } from "react";
import { ConfigGuard } from "@/components/ui/ConfigGuard";
import { Snow, Sparkle } from "@/components/ui/Snow";
import { subscribeWaiting } from "@/lib/tickets";
import { subscribeBooth } from "@/lib/booth";
import { useNow } from "@/hooks/useNow";
import { formatMMSS } from "@/hooks/useCountdown";
import { BRAND } from "@/lib/constants";
import { pad3 } from "@/lib/format";
import type { BoothDoc, Ticket } from "@/lib/types";

const MIN_PER_SESSION = 6; // estimasi: sesi 4 menit + cetak + ganti orang

function QueueApp() {
  const [waiting, setWaiting] = useState<Ticket[]>([]);
  const [booth, setBooth] = useState<BoothDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useNow(1000);

  useEffect(() => subscribeWaiting(setWaiting, (e) => setError(e.message)), []);
  useEffect(() => subscribeBooth(setBooth, (e) => setError(e.message)), []);

  const inUse = booth?.status === "IN_USE";
  const left = inUse && booth?.session_ends_at ? Math.max(0, Math.ceil((booth.session_ends_at - now) / 1000)) : 0;
  const baseMin = inUse ? Math.ceil(left / 60) + 1 : 0;
  const shown = waiting.slice(0, 8);

  return (
    <div className="relative min-h-screen overflow-hidden bg-pine-950 text-cream-50">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(63,107,82,.35),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(184,58,53,.12),transparent_55%)]" />
      <Snow count={22} />

      <header className="relative z-10 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-4">
          <span className="font-serif text-3xl font-bold uppercase tracking-[0.25em]">{BRAND}</span>
          <span className="font-script text-3xl text-gold-400">Merry Christmas</span>
        </div>
        <span className="text-2xl font-medium tabular-nums text-cream-50/70">
          {new Date(now).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl gap-8 px-10 pb-10 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- status bilik ---------- */}
        <section className="flex flex-col justify-between rounded-[2rem] bg-cream-50/[0.06] p-10 ring-1 ring-cream-50/10">
          <div className="flex items-center gap-3 text-gold-400"><Sparkle /><span className="text-sm font-bold tracking-[0.3em]">STATUS BILIK</span></div>
          {inUse ? (
            <div className="py-8">
              <p className="text-xl text-cream-50/70">Sedang digunakan</p>
              <p className="font-serif text-[9rem] font-bold leading-none text-cream-50">#{pad3(booth?.active_queue_no ?? 0)}</p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-berry-500/20 px-6 py-3 text-berry-400 ring-1 ring-berry-400/40">
                <span className="h-3 w-3 animate-pulse rounded-full bg-berry-400" />
                <span className="text-2xl font-medium tabular-nums">sisa ± {formatMMSS(left)}</span>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <p className="text-xl text-cream-50/70">Bilik</p>
              <p className="font-serif text-8xl font-bold leading-none text-emerald-300">Kosong</p>
              <p className="mt-6 text-2xl text-cream-50/80">
                {waiting[0] ? <>Tiket <b className="text-gold-300">#{pad3(waiting[0].queue_no)}</b> silakan masuk</> : "Silakan beli tiket di kasir"}
              </p>
            </div>
          )}
          <p className="text-sm text-cream-50/50">Bawa struk tiketmu (QR / PIN) ke dalam bilik.</p>
        </section>

        {/* ---------- daftar antrean ---------- */}
        <section className="rounded-[2rem] bg-cream-50/[0.06] p-10 ring-1 ring-cream-50/10">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-serif text-4xl font-bold">Antrean menunggu</h2>
            <span className="text-cream-50/60">{waiting.length} tiket</span>
          </div>
          {error && <p className="mb-4 rounded-xl bg-berry-500/20 p-3 text-berry-400">{error}</p>}
          <ul className="space-y-3">
            {shown.map((t, i) => (
              <li key={t.id} className={`flex items-center justify-between rounded-2xl px-6 py-4 ${i === 0 ? "bg-gold-400/15 ring-2 ring-gold-400/60" : "bg-cream-50/[0.05] ring-1 ring-cream-50/10"}`}>
                <div className="flex items-center gap-5">
                  <span className="font-serif text-4xl font-bold tabular-nums">#{pad3(t.queue_no)}</span>
                  <div>
                    <p className="text-lg">{t.package_name}</p>
                    <p className="text-sm text-cream-50/55">sisa {t.remaining_sessions} sesi</p>
                  </div>
                </div>
                <span className={`rounded-full px-4 py-1.5 text-sm font-medium ${i === 0 ? "bg-gold-400 text-pine-950" : "bg-cream-50/10 text-cream-50/80"}`}>
                  {i === 0 && !inUse ? "Giliran kamu" : i === 0 ? "Berikutnya" : `± ${baseMin + i * MIN_PER_SESSION} mnt`}
                </span>
              </li>
            ))}
            {waiting.length === 0 && <li className="py-10 text-center text-xl text-cream-50/50">Tidak ada antrean 🎄</li>}
          </ul>
          {waiting.length > shown.length && <p className="mt-4 text-center text-cream-50/60">+ {waiting.length - shown.length} antrean lainnya</p>}
        </section>
      </main>
    </div>
  );
}

export default function QueuePage() {
  return (
    <ConfigGuard>
      <QueueApp />
    </ConfigGuard>
  );
}
