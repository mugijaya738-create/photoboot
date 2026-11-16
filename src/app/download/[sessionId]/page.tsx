"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ConfigGuard } from "@/components/ui/ConfigGuard";
import { Button } from "@/components/ui/Button";
import { getSession } from "@/lib/booth";
import { BRAND } from "@/lib/constants";
import type { SessionDoc } from "@/lib/types";

/** Unduh lewat fetch→blob agar benar-benar tersimpan; bila CORS belum diatur, buka di tab baru */
async function download(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch gagal");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(await res.blob());
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch {
    window.open(url, "_blank");
  }
}

function DownloadApp() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [tab, setTab] = useState<"photo" | "gif">("photo");

  useEffect(() => {
    let alive = true;
    getSession(sessionId)
      .then((s) => { if (!alive) return; setSession(s); setState(s ? "ready" : "missing"); })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-cream-50">
      <header className="px-6 pb-2 pt-8 text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-berry-500">{BRAND.toUpperCase()}</p>
        <h1 className="font-script text-5xl text-pine-800">Merry Christmas</h1>
      </header>

      <main className="mx-auto max-w-md space-y-5 px-5 pb-12">
        {state === "loading" && <p className="py-20 text-center text-pine-700/60">Memuat fotomu…</p>}
        {state === "missing" && <p className="py-20 text-center text-pine-700">Foto tidak ditemukan. Pastikan QR yang kamu scan benar.</p>}
        {state === "error" && <p className="py-20 text-center text-berry-600">Gagal memuat. Periksa koneksi lalu muat ulang.</p>}

        {session && (
          <>
            <div className="mx-auto flex w-fit rounded-2xl bg-cream-200 p-1">
              {(["photo", "gif"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-6 py-2 text-sm font-medium ${tab === t ? "bg-pine-700 text-cream-50 shadow" : "text-pine-700"}`}>
                  {t === "photo" ? "Foto" : "GIF"}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-lg ring-1 ring-pine-700/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tab === "photo" ? session.image_url : session.gif_url} alt={tab === "photo" ? "Hasil foto" : "GIF animasi"} className="mx-auto max-h-[70vh] w-auto rounded-lg" />
            </div>

            <Button size="lg" className="w-full" onClick={() => download(tab === "photo" ? session.image_url : session.gif_url, tab === "photo" ? `photobooth-${session.id}.jpg` : `photobooth-${session.id}.gif`)}>
              Unduh {tab === "photo" ? "foto" : "GIF"}
            </Button>
            <p className="text-center text-xs text-pine-700/60">Jika unduhan tidak mulai, tekan &amp; tahan gambar lalu pilih “Simpan”.</p>
          </>
        )}
      </main>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <ConfigGuard>
      <DownloadApp />
    </ConfigGuard>
  );
}
