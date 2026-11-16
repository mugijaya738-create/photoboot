import {
  collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, where, type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { COL } from "./paths";
import { EXTRA_PRINT_PRICE, PACKAGES, type PackageId } from "./constants";
import type { PaymentMethod, Ticket } from "./types";

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

export function generatePin(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

/** PIN tidak boleh kembar dengan tiket yang masih punya sisa sesi */
async function uniquePin(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const pin = generatePin();
    const snap = await getDocs(query(collection(getDb(), COL.tickets), where("pin", "==", pin)));
    const clash = snap.docs.some((d) => (d.data() as Ticket).remaining_sessions > 0);
    if (!clash) return pin;
  }
  throw new Error("Gagal membuat PIN unik, coba lagi.");
}

export interface CreateTicketInput {
  packageId: PackageId;
  extraPrints: number;
  paymentMethod: PaymentMethod;
}

/** Buat tiket + nomor antrean harian secara atomik */
export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const db = getDb();
  const pkg = PACKAGES.find((p) => p.id === input.packageId);
  if (!pkg) throw new Error("Paket tidak dikenal");
  const pin = await uniquePin();
  const ticketRef = doc(collection(db, COL.tickets));
  const counterRef = doc(db, COL.counters, `ticket-${dayKey()}`);

  return runTransaction(db, async (tx) => {
    const c = await tx.get(counterRef);
    const queueNo = ((c.exists() ? (c.data().value as number) : 0) || 0) + 1;
    const ticket: Ticket = {
      id: ticketRef.id,
      pin,
      queue_no: queueNo,
      package_id: pkg.id,
      package_name: pkg.name,
      package_price: pkg.price,
      total_sessions: pkg.sessions,
      remaining_sessions: pkg.sessions,
      extra_prints: input.extraPrints,
      extra_prints_remaining: input.extraPrints,
      extra_print_price: EXTRA_PRINT_PRICE,
      total_price: pkg.price + input.extraPrints * EXTRA_PRINT_PRICE,
      payment_method: input.paymentMethod,
      status: "WAITING",
      created_at: Date.now(),
      last_used_at: null,
    };
    tx.set(counterRef, { value: queueNo });
    tx.set(ticketRef, ticket);
    return ticket;
  });
}

export async function findTicketIdByPin(pin: string): Promise<string | null> {
  const snap = await getDocs(query(collection(getDb(), COL.tickets), where("pin", "==", pin)));
  const live = snap.docs.filter((d) => (d.data() as Ticket).remaining_sessions > 0);
  return live.length ? live[0].id : null;
}

/** Realtime: tiket terbaru (untuk kasir) */
export function subscribeRecentTickets(n: number, cb: (t: Ticket[]) => void, onErr?: (e: Error) => void): Unsubscribe {
  const q = query(collection(getDb(), COL.tickets), orderBy("created_at", "desc"), limit(n));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => d.data() as Ticket)), (e) => onErr?.(e));
}

/** Realtime: tiket WAITING (untuk /queue). Diurutkan di klien agar tidak butuh composite index. */
export function subscribeWaiting(cb: (t: Ticket[]) => void, onErr?: (e: Error) => void): Unsubscribe {
  const q = query(collection(getDb(), COL.tickets), where("status", "==", "WAITING"));
  return onSnapshot(
    q,
    (s) => {
      const list = s.docs.map((d) => d.data() as Ticket);
      list.sort((a, b) => (a.last_used_at ?? a.created_at) - (b.last_used_at ?? b.created_at));
      cb(list);
    },
    (e) => onErr?.(e)
  );
}

/** Realtime: transaksi sejak `since` (untuk /admin) */
export function subscribeTicketsSince(since: number, cb: (t: Ticket[]) => void, onErr?: (e: Error) => void): Unsubscribe {
  const q = query(collection(getDb(), COL.tickets), where("created_at", ">=", since), orderBy("created_at", "desc"));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => d.data() as Ticket)), (e) => onErr?.(e));
}
