"use client";
import { useEffect } from "react";
import { Button } from "../ui/Button";
import { loadFrame } from "@/lib/imaging";
import { ORIENTATION_LABEL, TEMPLATES, templatesFor, type FrameTemplate } from "@/lib/templates";
import type { Orientation } from "@/lib/types";

/** Orientasi kecil (ikon) agar jelas bedanya portrait vs landscape */
function OrientationGlyph({ o }: { o: Orientation }) {
  return o === "PORTRAIT" ? (
    <div className="flex gap-1.5">
      {[0, 1].map((i) => (
        <div key={i} className="flex h-16 w-6 flex-col gap-0.5 rounded-sm bg-cream-50 p-0.5">
          {[0, 1, 2, 3].map((j) => <span key={j} className="flex-1 rounded-[1px] bg-pine-300/60" />)}
        </div>
      ))}
    </div>
  ) : (
    <div className="grid h-16 w-24 grid-cols-2 gap-0.5 rounded-sm bg-cream-50 p-1">
      {[0, 1, 2, 3].map((j) => <span key={j} className="rounded-[1px] bg-pine-300/60" />)}
    </div>
  );
}

export function DesignSelect({
  orientation, templateId, onOrientation, onTemplate, onConfirm,
}: {
  orientation: Orientation;
  templateId: string | null;
  onOrientation: (o: Orientation) => void;
  onTemplate: (t: FrameTemplate) => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    TEMPLATES.forEach((t) => loadFrame(t).catch(() => {})); // preload agar compose nanti cepat
  }, []);

  const list = templatesFor(orientation);
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-5 px-4 pb-6 pt-2 sm:px-6 lg:h-full">
      <div>
        <p className="text-xs font-bold tracking-[0.3em] text-gold-400">STEP.02</p>
        <h1 className="font-serif text-3xl font-bold text-cream-50 sm:text-5xl">Pilih desain cetak</h1>
      </div>

      {/* orientasi */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["PORTRAIT", "LANDSCAPE"] as Orientation[]).map((o) => {
          const on = o === orientation;
          return (
            <button
              key={o}
              onClick={() => onOrientation(o)}
              className={`flex items-center gap-5 rounded-3xl p-5 text-left transition ${on ? "bg-gold-400/15 ring-2 ring-gold-400" : "bg-cream-50/[0.06] ring-1 ring-cream-50/15 hover:bg-cream-50/10"}`}
            >
              <OrientationGlyph o={o} />
              <div>
                <p className="font-serif text-2xl font-bold text-cream-50">{ORIENTATION_LABEL[o].title}</p>
                <p className="text-sm text-cream-50/60">{ORIENTATION_LABEL[o].desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* template */}
      <div className="flex h-[360px] items-stretch gap-5 overflow-x-auto pb-1 lg:h-auto lg:min-h-0 lg:flex-1">
        {list.map((t) => {
          const on = t.id === templateId;
          return (
            <button
              key={t.id}
              onClick={() => onTemplate(t)}
              className={`group relative flex h-full shrink-0 flex-col items-center gap-3 rounded-3xl p-4 transition ${on ? "bg-gold-400/15 ring-2 ring-gold-400" : "bg-cream-50/[0.06] ring-1 ring-cream-50/15 hover:bg-cream-50/10"}`}
            >
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-[#c9c3b3]" style={{ aspectRatio: `${t.width}/${t.height}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.src} alt={t.name} className="h-full w-full object-contain" />
              </div>
              <span className="font-medium text-cream-50">{t.name}</span>
              {on && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gold-400 text-pine-950">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="gold" size="xl" disabled={!templateId} onClick={onConfirm}>Mulai foto →</Button>
      </div>
    </div>
  );
}
