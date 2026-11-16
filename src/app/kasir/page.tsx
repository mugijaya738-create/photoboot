"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ConfigGuard } from "@/components/ui/ConfigGuard";
import { Button } from "@/components/ui/Button";
import { PrintPortal } from "@/components/ui/PrintPortal";
import { Receipt } from "@/components/kasir/Receipt";
import { createTicket, subscribeRecentTickets } from "@/lib/tickets";
import { printWithPage, RECEIPT_PAGE } from "@/lib/printing";
import { BRAND, EXTRA_PRINT_PRICE, MAX_EXTRA_PRINT, PACKAGES, rupiah, type PackageId } from "@/lib/constants";
import { fmtTime, pad3 } from "@/lib/format";
import type { PaymentMethod, Ticket } from "@/lib/types";

const STATUS_STYLE: Record<Ticket["status"], string> = {
  WAITING: "bg-gold-300/40 text-pine-800",
  IN_USE: "bg-berry-500/15 text-berry-600",
  DONE: "bg-pine-100 text-pine-700",
};

function KasirApp() {
  const [pkg, setPkg] = useState<PackageId>("PKG_1");
  const [extra, setExtra] = useState(0);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Ticket | null>(null);
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [autoPrint, setAutoPrint] = useState(true);
  const printedFor = useRef<string | null>(null);

  useEffect(() => {
    try { setAutoPrint(localStorage.getItem("kasir.autoPrint") !== "0"); } catch {}
  }, []);
  useEffect(() => subscribeRecentTickets(12, setRecent, (e) => setError(e.message)), []);

  const selected = PACKAGES.find((p) => p.id === pkg)!;
  const total = selected.price + extra * EXTRA_PRINT_PRICE;
  const cashNum = Number(cash.replace(/\D/g, "")) || 0;
  const change = cashNum - total;

  const print = () => printWithPage(RECEIPT_PAGE);

  // cetak otomatis begitu tiket baru terbit
  useEffect(() => {
    if (issued && autoPrint && printedFor.current !== issued.id) {
      printedFor.current = issued.id;
      const t = setTimeout(print, 400);
      return () => clearTimeout(t);
    }
  }, [issued, autoPrint]);

  const submit = async () => {
    if (!method || busy) return;
    setBusy(true);
    setError(null);
    try {
      setIssued(await createTicket({ packageId: pkg, extraPrints: extra, paymentMethod: method }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setIssued(null); setPkg("PKG_1"); setExtra(0); setMethod(null); setCash(""); setError(null);
  };

  const toggleAuto = (v: boolean) => {
    setAutoPrint(v);
    try { localStorage.setItem("kasir.autoPrint", v ? "1" : "0"); } catch {}
  };

  const receiptTicket = issued;
  const lines = useMemo(() => [
    { label: selected.name, amount: selected.price },
    ...(extra ? [{ label: `Extra Print × ${extra}`, amount: extra * EXTRA_PRINT_PRICE }] : []),
  ], [selected, extra]);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="flex items-center justify-between border-b border-pine-700/10 bg-cream-100/70 px-8 py-4">
        <div className="flex items-baseline gap-4">
          <h1 className="font-serif text-3xl font-bold text-pine-800">Kasir</h1>
          <span className="font-script text-2xl text-berry-500">{BRAND}</span>
        </div>
        <nav className="flex gap-4 text-sm text-pine-700">
          <Link href="/queue" className="hover:underline">Antrean</Link>
          <Link href="/admin" className="hover:underline">Admin</Link>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ---------- kiri: pilih produk ---------- */}
        <section className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
            <h2 className="mb-4 font-serif text-2xl font-bold text-pine-800">Paket sesi</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {PACKAGES.map((p) => {
                const on = p.id === pkg;
                return (
                  <button
                    key={p.id}
                    disabled={!!issued}
                    onClick={() => setPkg(p.id)}
                    className={`rounded-2xl p-5 text-left transition disabled:opacity-60 ${on ? "bg-pine-700 text-cream-50 shadow-lg" : "bg-cream-50 ring-1 ring-pine-700/15 hover:bg-cream-100"}`}
                  >
                    <p className="text-sm opacity-70">{p.sessions} sesi foto</p>
                    <p className="font-serif text-2xl font-bold">{p.name}</p>
                    <p className={`mt-2 text-2xl font-medium ${on ? "text-gold-300" : "text-berry-500"}`}>{rupiah(p.price)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
            <h2 className="mb-1 font-serif text-2xl font-bold text-pine-800">Tambahan</h2>
            <p className="mb-4 text-sm text-pine-700/70">Extra Print = 1 lembar 4R tambahan, ikut tercetak di sesi pertama.</p>
            <div className="flex items-center justify-between rounded-2xl bg-cream-50 p-4 ring-1 ring-pine-700/15">
              <div>
                <p className="text-lg font-medium">Extra Print</p>
                <p className="text-berry-500">{rupiah(EXTRA_PRINT_PRICE)} / lembar</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="light" disabled={!!issued || extra <= 0} onClick={() => setExtra((x) => x - 1)} className="h-12 w-12 !px-0 text-2xl">−</Button>
                <span className="w-8 text-center text-2xl font-medium tabular-nums">{extra}</span>
                <Button variant="light" disabled={!!issued || extra >= MAX_EXTRA_PRINT} onClick={() => setExtra((x) => x + 1)} className="h-12 w-12 !px-0 text-2xl">+</Button>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- kanan: ringkasan / struk ---------- */}
        <section className="space-y-4">
          {!issued ? (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
              <h2 className="mb-4 font-serif text-2xl font-bold text-pine-800">Ringkasan</h2>
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li key={l.label} className="flex justify-between"><span>{l.label}</span><span>{rupiah(l.amount)}</span></li>
                ))}
              </ul>
              <div className="my-4 border-t border-dashed border-pine-700/30" />
              <div className="flex items-baseline justify-between">
                <span className="text-lg">Total</span>
                <span className="font-serif text-4xl font-bold text-pine-800">{rupiah(total)}</span>
              </div>

              <p className="mb-2 mt-6 text-sm font-medium text-pine-700">Metode bayar</p>
              <div className="grid grid-cols-2 gap-3">
                {(["CASH", "QRIS"] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`h-14 rounded-2xl text-lg font-medium transition ${method === m ? "bg-gold-400 text-pine-950 shadow" : "bg-cream-50 ring-1 ring-pine-700/15 hover:bg-cream-100"}`}
                  >
                    {m === "CASH" ? "Cash" : "QRIS"}
                  </button>
                ))}
              </div>

              {method === "CASH" && (
                <div className="mt-4 rounded-2xl bg-cream-50 p-4 ring-1 ring-pine-700/10">
                  <label className="text-sm text-pine-700">Uang diterima (opsional)</label>
                  <input
                    inputMode="numeric"
                    value={cash ? rupiah(cashNum) : ""}
                    onChange={(e) => setCash(e.target.value)}
                    placeholder="Rp0"
                    className="mt-1 w-full rounded-xl bg-white p-3 text-xl ring-1 ring-pine-700/15 focus:outline-none focus:ring-2 focus:ring-pine-500"
                  />
                  {cashNum > 0 && (
                    <p className={`mt-2 text-lg ${change < 0 ? "text-berry-500" : "text-pine-700"}`}>
                      {change < 0 ? `Kurang ${rupiah(-change)}` : `Kembalian ${rupiah(change)}`}
                    </p>
                  )}
                </div>
              )}

              {error && <p className="mt-4 rounded-xl bg-berry-500/10 p-3 text-sm text-berry-600">{error}</p>}
              <Button size="xl" className="mt-6 w-full" disabled={!method || busy || (method === "CASH" && cashNum > 0 && change < 0)} onClick={submit}>
                {busy ? "Membuat tiket…" : "Buat Tiket"}
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-pine-800">Tiket #{pad3(issued.queue_no)} dibuat ✓</h2>
              </div>
              <div className="mx-auto w-fit rounded-xl bg-white p-1 shadow ring-1 ring-black/10">
                <Receipt ticket={issued} />
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-pine-700">
                <input type="checkbox" checked={autoPrint} onChange={(e) => toggleAuto(e.target.checked)} /> Cetak otomatis saat tiket dibuat
              </label>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="light" size="lg" onClick={print}>Cetak struk</Button>
                <Button size="lg" onClick={reset}>Transaksi baru</Button>
              </div>
            </div>
          )}
        </section>

        {/* ---------- riwayat singkat ---------- */}
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10 lg:col-span-2">
          <h2 className="mb-3 font-serif text-2xl font-bold text-pine-800">Tiket terbaru</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-pine-700/60">
                <tr><th className="py-2">No</th><th>Jam</th><th>Paket</th><th>Bayar</th><th>Sisa sesi</th><th>Status</th><th className="text-right">Total</th><th /></tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id} className="border-t border-pine-700/10">
                    <td className="py-2 font-medium">#{pad3(t.queue_no)}</td>
                    <td>{fmtTime(t.created_at)}</td>
                    <td>{t.package_name}{t.extra_prints ? ` +${t.extra_prints} print` : ""}</td>
                    <td>{t.payment_method}</td>
                    <td>{t.remaining_sessions}/{t.total_sessions}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[t.status]}`}>{t.status}</span></td>
                    <td className="text-right">{rupiah(t.total_price)}</td>
                    <td className="text-right">
                      <button className="text-pine-500 hover:underline" onClick={() => { printedFor.current = t.id; setIssued(t); setTimeout(print, 300); }}>Cetak ulang</button>
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-pine-700/50">Belum ada tiket.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* area cetak struk 58mm */}
      <PrintPortal>{receiptTicket && <Receipt ticket={receiptTicket} />}</PrintPortal>
    </div>
  );
}

export default function KasirPage() {
  return (
    <ConfigGuard>
      <KasirApp />
    </ConfigGuard>
  );
}
