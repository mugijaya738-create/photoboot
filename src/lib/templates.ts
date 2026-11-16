import slotData from "./template-slots.json";
import type { Orientation } from "./types";
import { SHEET_LANDSCAPE, SHEET_PORTRAIT } from "./constants";

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export interface FrameTemplate {
  id: string;
  name: string;
  orientation: Orientation;
  /** PNG transparan di /public */
  src: string;
  /** ukuran PNG frame (px). PORTRAIT = 1 strip (2 strip per lembar 4R), LANDSCAPE = 1 lembar penuh */
  width: number;
  height: number;
  slots: Slot[];
}

const slotsOf = (id: string) => (slotData as Record<string, { width: number; height: number; slots: Slot[] }>)[id];

const make = (id: string, name: string, orientation: Orientation): FrameTemplate => {
  const d = slotsOf(id);
  return { id, name, orientation, src: `/templates/${id}.png`, width: d.width, height: d.height, slots: d.slots };
};

/**
 * Tambah template baru: taruh PNG transparan di /public/templates, ukur slot-nya
 * (lihat scripts/prepare-frame.py), masukkan ke template-slots.json, lalu daftarkan di sini.
 */
export const TEMPLATES: FrameTemplate[] = [
  make("noel-strip", "Noel Klasik", "PORTRAIT"),
  make("snow-strip", "Snow Minimal", "PORTRAIT"),
  make("noel-land", "Noel Klasik", "LANDSCAPE"),
  make("snow-land", "Snow Minimal", "LANDSCAPE"),
];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);
export const templatesFor = (o: Orientation) => TEMPLATES.filter((t) => t.orientation === o);

export const sheetSize = (o: Orientation) => (o === "PORTRAIT" ? SHEET_PORTRAIT : SHEET_LANDSCAPE);

/** rasio lebar/tinggi rata-rata slot → dipakai CameraCapture agar preview = hasil akhir */
export const slotAspect = (t: FrameTemplate) =>
  t.slots.reduce((a, s) => a + s.w / s.h, 0) / t.slots.length;

export const ORIENTATION_LABEL: Record<Orientation, { title: string; desc: string }> = {
  PORTRAIT: { title: "Portrait 2-Strip", desc: "2 strip 4 foto, dipotong jadi dua" },
  LANDSCAPE: { title: "Landscape 4R", desc: "1 lembar 4R, 4 foto grid 2×2" },
};
