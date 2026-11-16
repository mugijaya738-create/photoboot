/**
 * window.print() dengan ukuran kertas yang tepat.
 * Menyuntik @page sementara, lalu mencetak. Untuk cetak otomatis tanpa dialog
 * jalankan Chrome dengan flag --kiosk-printing (lihat README).
 */
export function printWithPage(size: string) {
  const style = document.createElement("style");
  style.id = "dynamic-page-size";
  style.textContent = `@page { size: ${size}; margin: 0; }`;
  document.head.appendChild(style);
  const cleanup = () => {
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  // beri waktu browser menerapkan style & memuat gambar
  setTimeout(() => window.print(), 150);
}

export const RECEIPT_PAGE = "58mm auto";
export const PAGE_4R_PORTRAIT = "4in 6in";
export const PAGE_4R_LANDSCAPE = "6in 4in";
