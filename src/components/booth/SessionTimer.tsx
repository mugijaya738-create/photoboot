import { formatMMSS } from "@/hooks/useCountdown";

export function SessionTimer({ seconds }: { seconds: number }) {
  const low = seconds <= 30;
  return (
    <div
      className={`flex items-center gap-2 rounded-full px-5 py-2 font-medium tabular-nums tracking-widest ring-1 ${
        low ? "animate-pulse bg-berry-500/20 text-berry-400 ring-berry-400/50" : "bg-cream-50/10 text-cream-50 ring-cream-50/20"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" />
      </svg>
      {formatMMSS(seconds)}
    </div>
  );
}
