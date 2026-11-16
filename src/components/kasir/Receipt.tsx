import { QRCodeSVG } from "qrcode.react";
import { BRAND, rupiah } from "@/lib/constants";
import { fmtDateTime, pad3 } from "@/lib/format";
import type { Ticket } from "@/lib/types";

/** Struk thermal 58mm. Dipakai untuk pratinjau layar dan area cetak. */
export function Receipt({ ticket }: { ticket: Ticket }) {
  return (
    <div className="receipt">
      <div className="center" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{BRAND.toUpperCase()}</div>
      <div className="center">TIKET PHOTOBOOTH</div>
      <div className="center" style={{ fontSize: 10 }}>{fmtDateTime(ticket.created_at)}</div>
      <div className="dash" />
      <div className="row"><span>No. Antrean</span><b>#{pad3(ticket.queue_no)}</b></div>
      <div className="dash" />
      <div className="row"><span>{ticket.package_name}</span><span>{rupiah(ticket.package_price)}</span></div>
      {ticket.extra_prints > 0 && (
        <div className="row"><span>Extra Print x{ticket.extra_prints}</span><span>{rupiah(ticket.extra_prints * ticket.extra_print_price)}</span></div>
      )}
      <div className="dash" />
      <div className="row" style={{ fontWeight: 700 }}><span>TOTAL</span><span>{rupiah(ticket.total_price)}</span></div>
      <div className="row"><span>Bayar</span><span>{ticket.payment_method === "QRIS" ? "QRIS" : "Cash"}</span></div>
      <div className="dash" />
      <div className="center" style={{ margin: "6px 0 2px" }}>
        <QRCodeSVG value={ticket.id} size={148} level="M" style={{ display: "inline-block" }} />
      </div>
      <div className="center" style={{ fontSize: 9, wordBreak: "break-all" }}>{ticket.id}</div>
      <div className="center" style={{ marginTop: 6, fontSize: 10 }}>PIN</div>
      <div className="center pin">{ticket.pin}</div>
      <div className="dash" />
      <div className="center" style={{ fontSize: 10 }}>
        Scan QR atau masukkan PIN di bilik.<br />
        Berlaku untuk {ticket.total_sessions} sesi · 1 kali pakai per sesi.<br />
        Terima kasih &amp; Selamat Natal!
      </div>
    </div>
  );
}
