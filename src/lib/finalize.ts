import { canvasToBlob, composeSheet, makeGif } from "./imaging";
import { completeSession } from "./booth";
import { uploadSessionFiles } from "./storage";
import { slotAspect, type FrameTemplate } from "./templates";
import type { FilterId, Ticket } from "./types";

export interface Artifacts {
  sheetBlob: Blob;
  gifBlob: Blob;
}

/** Langkah berat (lokal, tanpa jaringan): gabung canvas resolusi cetak + GIF animasi */
export async function buildArtifacts(opts: {
  template: FrameTemplate;
  images: HTMLImageElement[]; // 4 foto terpilih, urut slot
  filter: FilterId;
}): Promise<Artifacts> {
  const canvas = await composeSheet({ template: opts.template, photos: opts.images, filter: opts.filter });
  const sheetBlob = await canvasToBlob(canvas, "image/jpeg", 0.95);
  const gifBlob = makeGif(opts.images, opts.filter, slotAspect(opts.template));
  return { sheetBlob, gifBlob };
}

/** Langkah jaringan (bisa diulang bila gagal): upload ke Storage + simpan sesi di Firestore */
export async function publishArtifacts(opts: {
  sessionId: string;
  ticket: Ticket;
  template: FrameTemplate;
  filter: FilterId;
  artifacts: Artifacts;
}) {
  const { imageUrl, gifUrl } = await uploadSessionFiles(opts.sessionId, opts.artifacts.sheetBlob, opts.artifacts.gifBlob);
  const { copies, paperRemaining } = await completeSession({
    sessionId: opts.sessionId,
    ticketId: opts.ticket.id,
    queueNo: opts.ticket.queue_no,
    orientation: opts.template.orientation,
    templateId: opts.template.id,
    filter: opts.filter,
    imageUrl,
    gifUrl,
  });
  return { imageUrl, gifUrl, copies, paperRemaining };
}
