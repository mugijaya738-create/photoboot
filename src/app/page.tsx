import Link from "next/link";
import { BRAND } from "@/lib/constants";

const LINKS = [
  { href: "/kasir", title: "Kasir", desc: "Jual tiket sesi & cetak struk 58mm" },
  { href: "/booth", title: "Booth", desc: "Layar fullscreen di dalam bilik" },
  { href: "/queue", title: "Antrean", desc: "Monitor publik di luar bilik" },
  { href: "/admin", title: "Admin", desc: "Omzet, riwayat, stok kertas" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-berry-500">{BRAND.toUpperCase()}</p>
        <h1 className="font-script text-7xl text-pine-800">Merry Christmas</h1>
        <p className="mt-1 font-serif text-xl text-pine-700">Photobooth system</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-pine-700/10 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="font-serif text-3xl font-bold text-pine-800">{l.title}</p>
            <p className="text-pine-700/70">{l.desc}</p>
            <p className="mt-3 text-sm text-gold-500">{l.href} →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
