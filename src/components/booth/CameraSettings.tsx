"use client";
import { useEffect, useState } from "react";
import { CAMERA_PREF_KEY, getPreferredCamera } from "@/hooks/useCamera";

/** Pilih kamera (disimpan di localStorage browser bilik). Muncul sebagai ikon kecil di pojok. */
export function CameraSettings({ onChange }: { onChange?: (id: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [current, setCurrent] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    setCurrent(getPreferredCamera());
    navigator.mediaDevices?.enumerateDevices().then((d) => setDevices(d.filter((x) => x.kind === "videoinput"))).catch(() => {});
  }, [open]);

  const choose = (id: string) => {
    try {
      if (id) localStorage.setItem(CAMERA_PREF_KEY, id);
      else localStorage.removeItem(CAMERA_PREF_KEY);
    } catch {}
    setCurrent(id || undefined);
    onChange?.(id || undefined);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Pengaturan" className="flex h-10 w-10 items-center justify-center rounded-full text-cream-50/60 ring-1 ring-cream-50/15 hover:bg-cream-50/10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl bg-pine-900 p-4 text-sm text-cream-50 shadow-2xl ring-1 ring-cream-50/15">
          <p className="mb-2 text-xs uppercase tracking-widest text-cream-50/50">Kamera</p>
          <select value={current ?? ""} onChange={(e) => choose(e.target.value)} className="mb-3 w-full rounded-lg bg-pine-950 p-2 ring-1 ring-cream-50/20">
            <option value="">Default</option>
            {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${i + 1}`}</option>)}
          </select>
          <button onClick={toggleFullscreen} className="w-full rounded-lg bg-cream-50/10 p-2 hover:bg-cream-50/20">Layar penuh</button>
        </div>
      )}
    </div>
  );
}
