import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "gold" | "ghost" | "danger" | "light";
type Size = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-pine-700 text-cream-50 hover:bg-pine-800 active:bg-pine-900 disabled:bg-pine-700/40",
  gold: "bg-gold-400 text-pine-950 hover:bg-gold-300 active:bg-gold-500 disabled:bg-gold-400/40",
  ghost: "bg-transparent text-current ring-1 ring-current/30 hover:bg-white/10 disabled:opacity-40",
  danger: "bg-berry-500 text-white hover:bg-berry-600 disabled:bg-berry-500/40",
  light: "bg-cream-50 text-pine-800 ring-1 ring-pine-700/15 hover:bg-cream-100 disabled:opacity-50",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-5 text-base rounded-xl",
  lg: "h-14 px-7 text-lg rounded-2xl",
  xl: "h-20 px-10 text-2xl rounded-3xl",
};

export function Button({
  variant = "primary", size = "md", className = "", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  );
}
