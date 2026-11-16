"use client";
import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "../ui/Button";
import { PrintPortal } from "../ui/PrintPortal";
import { useCountdown, formatMMSS } from "@/hooks/useCountdown";
import { printWithPage, PAGE_4R_LANDSCAPE, PAGE_4R_PORTRAIT } from "@/lib/printing";
import { RESULT_AUTO_RESET_SECONDS } from "@/lib/constants";
import type { Orientation } from "@/lib/types";
import { useMemo } from "react";

export function ResultScreen({
  sheetUrl, downloadUrl, copies, orientation, paperRemaining, remainingSessions, onDone,
}: {
  sheetUrl: string; // object URL JPEG hasil akhir
  downloadUrl: string; // https://…/download/[session_id]
  copies: number;
  orientation: Orientation;
  paperRemaining: number;
  remainingSessions: number;
  onDone: () => void;
}) {
  const pageSize = orientation === "PORTRAIT" ? PAGE_4R_PORTRAIT : PAGE_4R_LANDSCAPE;
  const printedRef = useRef(false);
  const endsAt = useMemo(() => Date.now() + RESULT_AUTO_RESET_SECONDS * 1000, []);
  const left = useCountdown(endsAt, onDone);

  // cetak otomatis sekali saat layar hasil muncul
  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => printWithPage(pageSize), 700);
    return () => clearTimeout(t);
  }, [pageSize]);

  return (
    <div className="mx-auto grid min-h-full w-full max-w-[1400px] gap-8 px-4 pb-6 pt-2 sm:px-6 lg:h-full lg:grid-cols-[1fr_1fr]">
      <section className="flex items-center justify-center rounded-[2rem] lg:min-h-0 bg-cream-50/[0.05] p-6 ring-1 ring-cream-50/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sheetUrl} alt="Hasil foto" className="max-h-[50vh] max-w-full rounded-lg shadow-2xl lg:max-h-full" />
      </section>

      <section className="flex flex-col items-center justify-center gap-6 text-center lg:min-h-0">
        <p className="text-xs font-bold tracking-[0.3em] text-gold-400">STEP.06</p>
        <h1 className="font-serif text-3xl font-bold text-cream-50 sm:text-5xl">Fotomu sedang dicetak</h1>
        <p className="text-cream-50/60">
          {copies} lembar 4R{copies > 1 ? ` (termasuk ${copies - 1} extra print)` : ""} · ambil di slot printer
        </p>

        <div className="rounded-3xl bg-cream-50 p-5 shadow-xl">
          <QRCodeSVG value={downloadUrl} size={210} fgColor="#17301f" bgColor="#fdfaf3" level="M" />
        </div>
        <div>
          <p className="text-lg font-medium text-cream-50">Scan untuk unduh foto &amp; GIF</p>
          <p className="text-sm text-cream-50/55">Download photo &amp; animated GIF on your phone</p>
        </div>

        {remainingSessions > 0 && (
          <p className="rounded-full bg-gold-400/15 px-5 py-2 text-gold-300 ring-1 ring-gold-400/40">
            Tiketmu masih punya {remainingSessions} sesi — scan lagi untuk lanjut
          </p>
        )}
        {paperRemaining <= 0 && (
          <p className="rounded-xl bg-berry-500/20 px-4 py-2 text-berry-400">Kertas printer habis — hubungi kasir.</p>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" size="lg" className="text-cream-50" onClick={() => printWithPage(pageSize)}>Cetak ulang</Button>
          <Button variant="gold" size="lg" onClick={onDone}>Selesai ({formatMMSS(left)})</Button>
        </div>
      </section>

      {/* area cetak: 1 halaman per lembar */}
      <PrintPortal>
        {Array.from({ length: copies }, (_, i) => (
          <div key={i} className="print-page" style={{ width: orientation === "PORTRAIT" ? "4in" : "6in", height: orientation === "PORTRAIT" ? "6in" : "4in", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sheetUrl} alt="" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        ))}
      </PrintPortal>
    </div>
  );
}
