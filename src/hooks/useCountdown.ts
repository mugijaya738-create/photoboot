"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Hitung mundur menuju `endsAt` (epoch ms). Berbasis jam dinding, bukan akumulasi tick,
 * jadi tetap akurat walau tab di-throttle. `onExpire` dipanggil sekali.
 */
export function useCountdown(endsAt: number | null, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(() => (endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(0);
      return;
    }
    let fired = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !fired) {
        fired = true;
        expireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return secondsLeft;
}

export const formatMMSS = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
