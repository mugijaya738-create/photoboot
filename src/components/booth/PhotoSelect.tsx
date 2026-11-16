"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { composeSheet, FILTERS, filterCss, loadImage } from "@/lib/imaging";
import { sheetSize, type FrameTemplate } from "@/lib/templates";
import { PICK_COUNT } from "@/lib/constants";
import type { CapturedShot } from "../camera/CameraCapture";
import type { FilterId } from "@/lib/types";

/** Muat <img> untuk setiap jepretan (dipakai pratinjau compose) */
export function useShotImages(shots: CapturedShot[]) {
  const [map, setMap] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(shots.map(async (s) => [s.id, await loadImage(s.url)] as const)).then((entries) => {
      if (alive) setMap(Object.fromEntries(entries));
    });
    return () => { alive = false; };
  }, [shots]);
  return map;
}

export function PhotoSelect({
  shots, template, selected, filter, onToggle, onFilter, onConfirm, images,
}: {
  shots: CapturedShot[];
  template: FrameTemplate;
  selected: string[]; // id jepretan, urut = urutan slot
  filter: FilterId;
  images: Record<string, HTMLImageElement>;
  onToggle: (id: string) => void;
  onFilter: (f: FilterId) => void;
  onConfirm: () => void;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const ready = shots.every((s) => images[s.id]);
  const sheet = sheetSize(template.orientation);

  // pratinjau langsung: compose canvas resolusi cetak lalu skala ke kanvas tampilan
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const photos = Array.from({ length: PICK_COUNT }, (_, i) => images[selected[i]] ?? null);
    composeSheet({ template, photos, filter }).then((full) => {
      const c = previewRef.current;
      if (!alive || !c) return;
      const scale = 720 / sheet.height;
      c.width = Math.round(sheet.width * scale);
      c.height = Math.round(sheet.height * scale);
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(full, 0, 0, c.width, c.height);
    });
    return () => { alive = false; };
  }, [ready, selected, filter, template, images, sheet.height, sheet.width]);

  const aspect = template.slots[0].w / template.slots[0].h;
  return (
    <div className="mx-auto grid h-full w-full max-w-[1500px] gap-6 px-6 pb-6 pt-2 lg:grid-cols-[1.25fr_1fr]">
      {/* ---- kiri: pilih foto + filter ---- */}
      <section className="flex min-h-0 flex-col gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.3em] text-gold-400">STEP.04 · 05</p>
          <h1 className="font-serif text-5xl font-bold text-cream-50">Pilih {PICK_COUNT} foto terbaik</h1>
          <p className="text-cream-50/60">Ketuk foto sesuai urutan yang kamu mau. Terpilih {selected.length}/{PICK_COUNT}.</p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-3 content-center gap-4">
          {shots.map((s) => {
            const idx = selected.indexOf(s.id);
            const on = idx >= 0;
            const full = !on && selected.length >= PICK_COUNT;
            return (
              <button
                key={s.id}
                onClick={() => onToggle(s.id)}
                className={`relative overflow-hidden rounded-2xl transition ${on ? "ring-4 ring-gold-400" : "ring-1 ring-cream-50/20"} ${full ? "opacity-45" : ""}`}
                style={{ aspectRatio: String(aspect) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="h-full w-full object-cover" style={{ filter: filterCss(filter) }} />
                {on && <span className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold-400 text-xl font-bold text-pine-950">{idx + 1}</span>}
              </button>
            );
          })}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium tracking-widest text-cream-50/60">FILTER</p>
          <div className="flex gap-3">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => onFilter(f.id)}
                className={`h-14 flex-1 rounded-2xl text-lg font-medium transition ${filter === f.id ? "bg-gold-400 text-pine-950" : "bg-cream-50/10 text-cream-50 ring-1 ring-cream-50/15 hover:bg-cream-50/20"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- kanan: pratinjau hasil ---- */}
      <section className="flex min-h-0 flex-col items-center gap-4 rounded-[2rem] bg-cream-50/[0.05] p-5 ring-1 ring-cream-50/10">
        <p className="text-sm font-medium tracking-widest text-cream-50/60">PRATINJAU CETAK</p>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <canvas ref={previewRef} className="max-h-full max-w-full rounded-lg shadow-2xl" style={{ aspectRatio: `${sheet.width}/${sheet.height}`, background: "#fbf7ee" }} />
        </div>
        <Button variant="gold" size="xl" className="w-full" disabled={selected.length < PICK_COUNT} onClick={onConfirm}>
          Cetak foto →
        </Button>
      </section>
    </div>
  );
}
