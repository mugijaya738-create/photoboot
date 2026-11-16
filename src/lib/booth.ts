import {
  collection, doc, getDoc, onSnapshot, runTransaction, setDoc, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { BOOTH_ID, COL, PAPER_DOC } from "./paths";
import { DEFAULT_PAPER_CAPACITY, SESSION_SECONDS, STALE_SESSION_GRACE_MS } from "./constants";
import { findTicketIdByPin } from "./tickets";
import type { BoothDoc, FilterId, Orientation, PaperDoc, SessionDoc, Ticket } from "./types";

const boothRef = () => doc(getDb(), COL.booths, BOOTH_ID);
const paperRef = () => doc(getDb(), COL.settings, PAPER_DOC);
const ticketRef = (id: string) => doc(getDb(), COL.tickets, id);

export class BoothError extends Error {}

export function subscribeBooth(cb: (b: BoothDoc) => void, onErr?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    boothRef(),
    (s) =>
      cb(
        s.exists()
          ? (s.data() as BoothDoc)
          : { status: "IDLE", active_ticket_id: null, active_queue_no: null, session_started_at: null, session_ends_at: null, updated_at: 0 }
      ),
    (e) => onErr?.(e)
  );
}

export function subscribePaper(cb: (p: PaperDoc) => void, onErr?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    paperRef(),
    (s) =>
      cb(
        s.exists()
          ? (s.data() as PaperDoc)
          : { paper_remaining: DEFAULT_PAPER_CAPACITY, paper_capacity: DEFAULT_PAPER_CAPACITY, updated_at: 0 }
      ),
    (e) => onErr?.(e)
  );
}

/** Admin: isi ulang / koreksi stok kertas */
export async function setPaper(remaining: number, capacity: number) {
  await setDoc(paperRef(), { paper_remaining: remaining, paper_capacity: capacity, updated_at: Date.now() } satisfies PaperDoc);
}

export interface RedeemResult {
  ticket: Ticket; // sudah berisi remaining_sessions terbaru (sudah dikurangi 1)
  endsAt: number; // epoch ms habisnya timer 4 menit
}

/**
 * Validasi tiket (via QR → ticket_id, atau PIN 6 digit), kurangi remaining_sessions 1,
 * tandai tiket IN_USE, kunci bilik, dan tetapkan batas waktu 240 detik — semua dalam satu transaksi.
 */
export async function redeemTicket(by: { ticketId: string } | { pin: string }): Promise<RedeemResult> {
  const db = getDb();
  let ticketId: string;
  if ("ticketId" in by) {
    ticketId = by.ticketId.trim();
  } else {
    const found = await findTicketIdByPin(by.pin);
    if (!found) throw new BoothError("PIN tidak ditemukan atau tiket sudah habis.");
    ticketId = found;
  }
  if (!ticketId || ticketId.includes("/")) throw new BoothError("QR Code tidak valid.");

  return runTransaction(db, async (tx) => {
    const tRef = ticketRef(ticketId);
    const bRef = boothRef();
    const [tSnap, bSnap] = await Promise.all([tx.get(tRef), tx.get(bRef)]);
    if (!tSnap.exists()) throw new BoothError("Tiket tidak ditemukan.");
    const ticket = tSnap.data() as Ticket;
    if (ticket.remaining_sessions <= 0) throw new BoothError("Sesi pada tiket ini sudah habis.");

    const now = Date.now();
    const booth = bSnap.exists() ? (bSnap.data() as BoothDoc) : null;

    // bilik masih dipakai? (kecuali sesi lama sudah lewat batas + toleransi → anggap nyangkut)
    let staleTicket: { ref: ReturnType<typeof ticketRef>; data: Ticket } | null = null;
    if (booth?.status === "IN_USE") {
      const ends = booth.session_ends_at ?? 0;
      if (now < ends + STALE_SESSION_GRACE_MS) throw new BoothError("Bilik sedang dipakai. Mohon tunggu giliran.");
      if (booth.active_ticket_id && booth.active_ticket_id !== ticketId) {
        const sRef = ticketRef(booth.active_ticket_id);
        const sSnap = await tx.get(sRef);
        if (sSnap.exists()) staleTicket = { ref: sRef, data: sSnap.data() as Ticket };
      }
    }

    const endsAt = now + SESSION_SECONDS * 1000;
    const updated: Ticket = { ...ticket, remaining_sessions: ticket.remaining_sessions - 1, status: "IN_USE", last_used_at: now };

    if (staleTicket) {
      tx.update(staleTicket.ref, { status: staleTicket.data.remaining_sessions > 0 ? "WAITING" : "DONE" });
    }
    tx.update(tRef, { remaining_sessions: updated.remaining_sessions, status: "IN_USE", last_used_at: now });
    tx.set(bRef, {
      status: "IN_USE",
      active_ticket_id: ticketId,
      active_queue_no: ticket.queue_no,
      session_started_at: now,
      session_ends_at: endsAt,
      updated_at: now,
    } satisfies BoothDoc);
    return { ticket: updated, endsAt };
  });
}

const idleBooth = (now: number): BoothDoc => ({
  status: "IDLE", active_ticket_id: null, active_queue_no: null, session_started_at: null, session_ends_at: null, updated_at: now,
});

export interface CompleteSessionInput {
  sessionId: string;
  ticketId: string;
  queueNo: number;
  orientation: Orientation;
  templateId: string;
  filter: FilterId;
  imageUrl: string;
  gifUrl: string;
}

export interface CompleteSessionResult {
  copies: number;
  paperRemaining: number;
}

/**
 * Sesi selesai: simpan dokumen sesi, lepas bilik (IDLE), kembalikan tiket ke WAITING/DONE,
 * habiskan extra print, dan KURANGI stok kertas sebanyak lembar yang dicetak.
 */
export async function completeSession(input: CompleteSessionInput): Promise<CompleteSessionResult> {
  const db = getDb();
  return runTransaction(db, async (tx) => {
    const tRef = ticketRef(input.ticketId);
    const [tSnap, pSnap] = await Promise.all([tx.get(tRef), tx.get(paperRef())]);
    if (!tSnap.exists()) throw new BoothError("Tiket hilang saat menyimpan sesi.");
    const ticket = tSnap.data() as Ticket;

    const extra = ticket.extra_prints_remaining ?? 0;
    const copies = 1 + extra;
    const now = Date.now();

    const paper = pSnap.exists() ? (pSnap.data() as PaperDoc) : null;
    const capacity = paper?.paper_capacity ?? DEFAULT_PAPER_CAPACITY;
    const remaining = Math.max(0, (paper?.paper_remaining ?? capacity) - copies);

    const session: SessionDoc = {
      id: input.sessionId,
      ticket_id: input.ticketId,
      queue_no: input.queueNo,
      orientation: input.orientation,
      template_id: input.templateId,
      filter: input.filter,
      image_url: input.imageUrl,
      gif_url: input.gifUrl,
      copies,
      created_at: now,
    };
    tx.set(doc(db, COL.sessions, input.sessionId), session);
    tx.update(tRef, {
      status: ticket.remaining_sessions > 0 ? "WAITING" : "DONE",
      extra_prints_remaining: 0,
      last_used_at: now,
    });
    tx.set(boothRef(), idleBooth(now));
    tx.set(paperRef(), { paper_remaining: remaining, paper_capacity: capacity, updated_at: now } satisfies PaperDoc);
    return { copies, paperRemaining: remaining };
  });
}

/** Sesi dibatalkan / waktu habis tanpa hasil: lepas bilik (sesi tetap terpakai). */
export async function abortSession(ticketId: string) {
  const db = getDb();
  await runTransaction(db, async (tx) => {
    const tRef = ticketRef(ticketId);
    const tSnap = await tx.get(tRef);
    if (tSnap.exists()) {
      const t = tSnap.data() as Ticket;
      tx.update(tRef, { status: t.remaining_sessions > 0 ? "WAITING" : "DONE" });
    }
    tx.set(boothRef(), idleBooth(Date.now()));
  });
}

export async function getSession(id: string): Promise<SessionDoc | null> {
  const s = await getDoc(doc(getDb(), COL.sessions, id));
  return s.exists() ? (s.data() as SessionDoc) : null;
}


/** ID sesi acak (20 karakter, sulit ditebak) untuk path Storage & halaman /download */
export const newSessionId = () => doc(collection(getDb(), COL.sessions)).id;

/**
 * Dipanggil saat halaman /booth dibuka. Bila bilik tertinggal IN_USE (halaman di-refresh / mati di tengah sesi),
 * sesi itu tidak mungkin dilanjutkan → lepas bilik dan KEMBALIKAN 1 sesi ke tiketnya agar pelanggan tidak rugi.
 * Mengembalikan queue_no yang dipulihkan (atau null bila bilik memang kosong).
 */
export async function recoverInterruptedSession(): Promise<number | null> {
  const db = getDb();
  return runTransaction(db, async (tx) => {
    const bSnap = await tx.get(boothRef());
    if (!bSnap.exists()) return null;
    const booth = bSnap.data() as BoothDoc;
    if (booth.status !== "IN_USE") return null;

    if (booth.active_ticket_id) {
      const tRef = ticketRef(booth.active_ticket_id);
      const tSnap = await tx.get(tRef);
      if (tSnap.exists()) {
        const t = tSnap.data() as Ticket;
        tx.update(tRef, { remaining_sessions: Math.min(t.total_sessions, t.remaining_sessions + 1), status: "WAITING" });
      }
    }
    tx.set(boothRef(), idleBooth(Date.now()));
    return booth.active_queue_no ?? 0;
  });
}
