import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { FilterId } from "./types";
import { sheetSize, type FrameTemplate, type Slot } from "./templates";

// ---------------------------------------------------------------- filter
export const FILTERS: { id: FilterId; label: string; css: string }[] = [
  { id: "original", label: "Original", css: "none" },
  { id: "bw", label: "B&W", css: "grayscale(1) contrast(1.08) brightness(1.03)" },
  { id: "warm", label: "Warm", css: "sepia(0.22) saturate(1.18) brightness(1.04) contrast(1.03)" },
];
export const filterCss = (id: FilterId) => FILTERS.find((f) => f.id === id)?.css ?? "none";

const supportsCtxFilter = (() => {
  if (typeof document === "undefined") return false;
  const ctx = document.createElement("canvas").getContext("2d");
  return !!ctx && "filter" in ctx;
})();

/** Fallback piksel untuk browser tanpa ctx.filter (mis. Safari) */
function pixelFilter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, id: FilterId) {
  if (id === "original") return;
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (id === "bw") {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = (l - 128) * 1.08 + 128 + 6;
    } else {
      const nr = r * 1.07 + 8, ng = g * 1.0 + 2, nb = b * 0.86;
      const l = 0.299 * nr + 0.587 * ng + 0.114 * nb;
      r = l + (nr - l) * 1.15; g = l + (ng - l) * 1.15; b = l + (nb - l) * 1.15;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(img, x, y);
}

// ---------------------------------------------------------------- util
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar: " + src));
    img.src = src;
  });
}

export const canvasToBlob = (c: HTMLCanvasElement, type = "image/jpeg", quality = 0.95) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob gagal"))), type, quality));

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** Gambar `img` memenuhi kotak (x,y,w,h) dengan crop tengah (object-fit: cover) */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const sw = (img as HTMLImageElement).naturalWidth || img.width;
  const sh = (img as HTMLImageElement).naturalHeight || img.height;
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale, ch = h / scale;
  ctx.drawImage(img, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
}

/** Gambar foto ke dalam slot dengan filter terpasang */
function drawPhotoInSlot(ctx: CanvasRenderingContext2D, img: HTMLImageElement, s: Slot, filter: FilterId) {
  const pad = 4; // sedikit meluber; tepi ditutup frame
  const x = s.x - pad, y = s.y - pad, w = s.w + pad * 2, h = s.h + pad * 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (supportsCtxFilter) {
    ctx.filter = filterCss(filter);
    drawCover(ctx, img, x, y, w, h);
    ctx.filter = "none";
  } else {
    drawCover(ctx, img, x, y, w, h);
    pixelFilter(ctx, Math.max(0, Math.floor(x)), Math.max(0, Math.floor(y)), Math.ceil(w), Math.ceil(h), filter);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- compose
let frameCache = new Map<string, Promise<HTMLImageElement>>();
export const loadFrame = (t: FrameTemplate) => {
  if (!frameCache.has(t.src)) frameCache.set(t.src, loadImage(t.src));
  return frameCache.get(t.src)!;
};

export interface ComposeInput {
  template: FrameTemplate;
  photos: (HTMLImageElement | null)[]; // urut sesuai slot; null = slot kosong (placeholder pratinjau)
  filter: FilterId;
}

/**
 * Gabungkan 4 foto + frame PNG pada canvas resolusi cetak 4R @300dpi.
 *  - PORTRAIT : 1200×1800 berisi 2 strip identik (600×1800) bersebelahan
 *  - LANDSCAPE: 1800×1200, 4 foto grid 2×2
 * Foto digambar DI BAWAH frame; lubang transparan pada PNG menampilkan foto.
 */
export async function composeSheet({ template, photos, filter }: ComposeInput): Promise<HTMLCanvasElement> {
  const frame = await loadFrame(template);
  const sheet = sheetSize(template.orientation);
  const canvas = makeCanvas(sheet.width, sheet.height);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fbf7ee";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const drawOne = (ox: number) => {
    template.slots.forEach((s, i) => {
      const photo = photos[i];
      if (photo) drawPhotoInSlot(ctx, photo, { ...s, x: s.x + ox }, filter);
      else {
        ctx.fillStyle = "#e7dfcb";
        ctx.fillRect(s.x + ox, s.y, s.w, s.h);
      }
    });
    ctx.drawImage(frame, ox, 0, template.width, template.height);
  };

  if (template.orientation === "PORTRAIT") {
    drawOne(0);
    drawOne(template.width); // strip kedua
  } else {
    drawOne(0);
  }
  return canvas;
}

// ---------------------------------------------------------------- GIF
/** GIF animasi dari 4 foto terpilih (dengan filter), diulang terus */
export function makeGif(photos: HTMLImageElement[], filter: FilterId, aspect: number, width = 540, delay = 700): Blob {
  const w = width;
  const h = Math.round(width / aspect);
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const gif = GIFEncoder();
  for (const img of photos) {
    ctx.clearRect(0, 0, w, h);
    if (supportsCtxFilter) {
      ctx.filter = filterCss(filter);
      drawCover(ctx, img, 0, 0, w, h);
      ctx.filter = "none";
    } else {
      drawCover(ctx, img, 0, 0, w, h);
      pixelFilter(ctx, 0, 0, w, h, filter);
    }
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay, repeat: 0 });
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
}

export const resetFrameCache = () => {
  frameCache = new Map();
};
