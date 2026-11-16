"use client";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Render konten cetak langsung di <body>. Di layar tersembunyi; saat window.print()
 * hanya elemen .print-portal yang tampil (lihat globals.css).
 */
export function PrintPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<div className="print-portal">{children}</div>, document.body);
}
