export const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Plan.B Studio";

export type PackageId = "PKG_1" | "PKG_2";

export interface PhotoPackage {
  id: PackageId;
  name: string;
  sessions: number;
  price: number;
}

export const PACKAGES: PhotoPackage[] = [
  { id: "PKG_1", name: "Paket 1 Sesi", sessions: 1, price: 35_000 },
  { id: "PKG_2", name: "Paket 2 Sesi", sessions: 2, price: 60_000 },
];

export const EXTRA_PRINT_PRICE = 15_000;
export const MAX_EXTRA_PRINT = 5;

// ---- alur booth ----
export const SESSION_SECONDS = 240; // 4 menit
export const TOTAL_SHOTS = 6;
export const PICK_COUNT = 4;
export const COUNTDOWN_SECONDS = 3;
export const RESULT_AUTO_RESET_SECONDS = 90;
// bilik dianggap "nyangkut" bila IN_USE melewati batas sesi + toleransi ini
export const STALE_SESSION_GRACE_MS = 5 * 60 * 1000;

// ---- stok kertas (kaset 4R) ----
export const DEFAULT_PAPER_CAPACITY = 700;
export const PAPER_WARN_PERCENT = 20;
export const PAPER_CRITICAL_PERCENT = 8;

// ---- ukuran cetak 4R @300dpi ----
export const SHEET_PORTRAIT = { width: 1200, height: 1800 }; // 4x6 in, berisi 2 strip 600x1800
export const SHEET_LANDSCAPE = { width: 1800, height: 1200 }; // 6x4 in

export const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");
