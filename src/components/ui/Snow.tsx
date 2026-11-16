"use client";
import { useEffect, useState } from "react";

/** Salju tipis & halus sebagai aksen Natal (dekoratif saja) */
export function Snow({ count = 28 }: { count?: number }) {
  const [flakes, setFlakes] = useState<{ left: number; size: number; dur: number; delay: number; op: number }[]>([]);
  useEffect(() => {
    setFlakes(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        dur: 14 + Math.random() * 18,
        delay: -Math.random() * 30,
        op: 0.15 + Math.random() * 0.35,
      }))
    );
  }, [count]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 animate-snow rounded-full bg-cream-50"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, opacity: f.op, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s` }}
        />
      ))}
    </div>
  );
}

export function Sparkle({ className = "", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="-10 -10 20 20" className={className}>
      <path fill="currentColor" d="M0,-10 Q1.2,-1.2 10,0 Q1.2,1.2 0,10 Q-1.2,1.2 -10,0 Q-1.2,-1.2 0,-10Z" />
    </svg>
  );
}
