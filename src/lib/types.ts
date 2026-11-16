import type { PackageId } from "./constants";

export type PaymentMethod = "CASH" | "QRIS";
export type TicketStatus = "WAITING" | "IN_USE" | "DONE";
export type Orientation = "PORTRAIT" | "LANDSCAPE";
export type FilterId = "original" | "bw" | "warm";

export interface Ticket {
  id: string; // = ticket_id, isi QR Code
  pin: string; // 6 digit
  queue_no: number; // nomor antrean harian
  package_id: PackageId;
  package_name: string;
  package_price: number;
  total_sessions: number;
  remaining_sessions: number;
  extra_prints: number;
  extra_prints_remaining: number;
  extra_print_price: number;
  total_price: number;
  payment_method: PaymentMethod;
  status: TicketStatus;
  created_at: number; // epoch ms
  last_used_at: number | null;
}

export interface BoothDoc {
  status: "IDLE" | "IN_USE";
  active_ticket_id: string | null;
  active_queue_no: number | null;
  session_started_at: number | null;
  session_ends_at: number | null;
  updated_at: number;
}

export interface PaperDoc {
  paper_remaining: number;
  paper_capacity: number;
  updated_at: number;
}

export interface SessionDoc {
  id: string;
  ticket_id: string;
  queue_no: number;
  orientation: Orientation;
  template_id: string;
  filter: FilterId;
  image_url: string;
  gif_url: string;
  copies: number; // lembar 4R yang dicetak
  created_at: number;
}
