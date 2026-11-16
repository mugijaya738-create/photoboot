"use client";
import { useEffect, useRef, useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"] as const;

/** Keypad PIN 6 digit (layar sentuh + keyboard fisik). Otomatis submit di digit ke-6. */
export function PinPad({ onSubmit, disabled }: { onSubmit: (pin: string) => void; disabled?: boolean }) {
  const [pin, setPin] = useState("");
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  const press = (k: string) => {
    if (disabled) return;
    if (k === "C") return setPin("");
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length < 6 ? p + k : p));
  };

  useEffect(() => {
    if (pin.length === 6 && !disabled) {
      submitRef.current(pin);
      const t = setTimeout(() => setPin(""), 400);
      return () => clearTimeout(t);
    }
  }, [pin, disabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Escape") press("C");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-3" aria-label="PIN">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`flex h-14 w-11 items-center justify-center rounded-xl border text-2xl font-medium transition-colors ${
              i < pin.length ? "border-gold-400 bg-gold-400/15 text-cream-50" : "border-cream-50/20 text-cream-50/30"
            }`}
          >
            {i < pin.length ? "•" : ""}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={disabled}
            className={`h-16 w-20 rounded-2xl text-2xl font-medium transition active:scale-95 disabled:opacity-40 ${
              k === "C" || k === "⌫" ? "bg-transparent text-cream-50/70 ring-1 ring-cream-50/15" : "bg-cream-50/10 text-cream-50 ring-1 ring-cream-50/10 hover:bg-cream-50/20"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
