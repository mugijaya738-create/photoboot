"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConfigGuard } from "@/components/ui/ConfigGuard";
import { Button } from "@/components/ui/Button";
import { subscribeTicketsSince } from "@/lib/tickets";
import { setPaper, subscribePaper } from "@/lib/booth";
import { BRAND, DEFAULT_PAPER_CAPACITY, PAPER_CRITICAL_PERCENT, PAPER_WARN_PERCENT, rupiah } from "@/lib/constants";
import { fmtDateTime, pad3, startOfDay } from "@/lib/format";
import type { PaperDoc, Ticket } from "@/lib/types";

const RANGES = [
  { id: "today", label: "Hari ini", days: 0 },
  { id: "7d", label: "7 hari", days: 6 },
  { id: "30d", label: "30 hari", days: 29 },
] as const;

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "";

function StatCard({ label, value, sub, tone = "pine" }: { label: string; value: string; sub?: string; tone?: "pine" | "gold" | "berry" }) {
  const tones = { pine: "bg-pine-700 text-cream-50", gold: "bg-gold-300/50 text-pine-900", berry: "bg-berry-500 text-white" } as const;
  return (
    <div className={`rounded-3xl p-5 ${tones[tone]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold md:text-4xl">{value}</p>
      {sub && <p className="mt-1 text-sm opacity-70">{sub}</p>}
    </div>
  );
}

function PaperCard({ paper }: { paper: PaperDoc }) {
  const pct = paper.paper_capacity > 0 ? Math.round((paper.paper_remaining / paper.paper_capacity) * 100) : 0;
  const level = pct <= PAPER_CRITICAL_PERCENT ? "critical" : pct <= PAPER_WARN_PERCENT ? "warn" : "ok";
  const bar = { ok: "bg-pine-500", warn: "bg-gold-500", critical: "bg-berry-500" }[level];
  const [cap, setCap] = useState(String(paper.paper_capacity));
  const [rem, setRem] = useState(String(paper.paper_remaining));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setCap(String(paper.paper_capacity)); setRem(String(paper.paper_remaining)); }, [paper.paper_capacity, paper.paper_remaining]);

  const save = async (r: number, c: number) => {
    setSaving(true);
    try { await setPaper(Math.max(0, r), Math.max(1, c)); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-pine-800">Stok kertas printer</h2>
          <p className="text-sm text-pine-700/70">Berkurang otomatis setiap sesi selesai (1 lembar + extra print).</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${level === "ok" ? "bg-pine-100 text-pine-700" : level === "warn" ? "bg-gold-300/60 text-pine-900" : "animate-pulse bg-berry-500 text-white"}`}>
          {level === "ok" ? "Aman" : level === "warn" ? "Segera isi" : paper.paper_remaining === 0 ? "HABIS" : "Kritis"}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-serif text-5xl font-bold text-pine-800">{paper.paper_remaining}<span className="ml-2 text-xl font-normal text-pine-700/60">/ {paper.paper_capacity} lembar</span></p>
        <p className="text-2xl font-medium">{pct}%</p>
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full bg-cream-200">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label className="text-xs text-pine-700">Sisa<input inputMode="numeric" value={rem} onChange={(e) => setRem(e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl bg-cream-50 p-2.5 text-base ring-1 ring-pine-700/15" /></label>
        <label className="text-xs text-pine-700">Kapasitas kaset<input inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl bg-cream-50 p-2.5 text-base ring-1 ring-pine-700/15" /></label>
        <Button variant="light" className="self-end" disabled={saving} onClick={() => save(Number(rem) || 0, Number(cap) || DEFAULT_PAPER_CAPACITY)}>Simpan</Button>
        <Button className="self-end" disabled={saving} onClick={() => save(Number(cap) || DEFAULT_PAPER_CAPACITY, Number(cap) || DEFAULT_PAPER_CAPACITY)}>Isi penuh</Button>
      </div>
    </div>
  );
}

function AdminApp() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("today");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [paper, setPaperState] = useState<PaperDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const since = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    const d = new Date();
    d.setDate(d.getDate() - r.days);
    return startOfDay(d);
  }, [range]);

  useEffect(() => subscribeTicketsSince(since, setTickets, (e) => setError(e.message)), [since]);
  useEffect(() => subscribePaper(setPaperState, (e) => setError(e.message)), []);

  const stats = useMemo(() => {
    const sum = (f: (t: Ticket) => boolean) => tickets.filter(f).reduce((a, t) => a + t.total_price, 0);
    const cash = sum((t) => t.payment_method === "CASH");
    const qris = sum((t) => t.payment_method === "QRIS");
    const sessionsUsed = tickets.reduce((a, t) => a + (t.total_sessions - t.remaining_sessions - (t.status === "IN_USE" ? 0 : 0)), 0);
    return { cash, qris, total: cash + qris, count: tickets.length, sessionsUsed, extra: tickets.reduce((a, t) => a + t.extra_prints, 0) };
  }, [tickets]);

  const exportCsv = () => {
    const head = ["waktu", "no_antrean", "paket", "extra_print", "metode", "total", "status", "ticket_id"];
    const rows = tickets.map((t) => [fmtDateTime(t.created_at), t.queue_no, t.package_name, t.extra_prints, t.payment_method, t.total_price, t.status, t.id]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `transaksi-${range}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="flex items-center justify-between border-b border-pine-700/10 bg-cream-100/70 px-8 py-4">
        <div className="flex items-baseline gap-4">
          <h1 className="font-serif text-3xl font-bold text-pine-800">Admin</h1>
          <span className="font-script text-2xl text-berry-500">{BRAND}</span>
        </div>
        <nav className="flex gap-4 text-sm text-pine-700">
          <Link href="/kasir" className="hover:underline">Kasir</Link>
          <Link href="/queue" className="hover:underline">Antrean</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {error && <p className="rounded-xl bg-berry-500/10 p-3 text-sm text-berry-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl bg-cream-200 p-1">
            {RANGES.map((r) => (
              <button key={r.id} onClick={() => setRange(r.id)} className={`rounded-xl px-5 py-2 text-sm font-medium transition ${range === r.id ? "bg-pine-700 text-cream-50 shadow" : "text-pine-700 hover:bg-cream-100"}`}>{r.label}</button>
            ))}
          </div>
          <Button variant="light" size="sm" onClick={exportCsv} disabled={!tickets.length}>Unduh CSV</Button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total omzet" value={rupiah(stats.total)} sub={`${stats.count} transaksi`} />
          <StatCard label="Omzet Cash" value={rupiah(stats.cash)} tone="gold" />
          <StatCard label="Omzet QRIS" value={rupiah(stats.qris)} tone="gold" />
          <StatCard label="Extra print terjual" value={String(stats.extra)} sub={rupiah(stats.extra * 15_000)} tone="berry" />
        </div>

        {paper && <PaperCard paper={paper} />}

        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10">
          <h2 className="mb-3 font-serif text-2xl font-bold text-pine-800">Riwayat transaksi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-pine-700/60">
                <tr><th className="py-2">Waktu</th><th>No</th><th>Paket</th><th>Extra</th><th>Bayar</th><th>Sisa sesi</th><th>Status</th><th className="text-right">Total</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-t border-pine-700/10">
                    <td className="py-2">{fmtDateTime(t.created_at)}</td>
                    <td className="font-medium">#{pad3(t.queue_no)}</td>
                    <td>{t.package_name}</td>
                    <td>{t.extra_prints || "–"}</td>
                    <td><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.payment_method === "QRIS" ? "bg-sky-100 text-sky-800" : "bg-gold-300/50 text-pine-800"}`}>{t.payment_method}</span></td>
                    <td>{t.remaining_sessions}/{t.total_sessions}</td>
                    <td>{t.status}</td>
                    <td className="text-right font-medium">{rupiah(t.total_price)}</td>
                  </tr>
                ))}
                {tickets.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-pine-700/50">Belum ada transaksi pada rentang ini.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function PinGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(!ADMIN_PIN);
  const [val, setVal] = useState("");
  const [bad, setBad] = useState(false);
  useEffect(() => {
    try { if (sessionStorage.getItem("admin.ok") === "1") setOk(true); } catch {}
  }, []);
  if (ok) return <>{children}</>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (val === ADMIN_PIN) { try { sessionStorage.setItem("admin.ok", "1"); } catch {} setOk(true); } else setBad(true);
        }}
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow ring-1 ring-pine-700/10"
      >
        <h1 className="font-serif text-3xl font-bold text-pine-800">Admin</h1>
        <input type="password" autoFocus value={val} onChange={(e) => { setVal(e.target.value); setBad(false); }} placeholder="PIN admin" className="w-full rounded-xl bg-cream-50 p-3 text-lg ring-1 ring-pine-700/20" />
        {bad && <p className="text-sm text-berry-600">PIN salah.</p>}
        <Button className="w-full" size="lg" type="submit">Masuk</Button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ConfigGuard>
      <PinGate>
        <AdminApp />
      </PinGate>
    </ConfigGuard>
  );
}
