// Nama koleksi/dokumen Firestore & path Storage di satu tempat
export const COL = {
  tickets: "tickets",
  sessions: "sessions",
  counters: "counters",
  booths: "booths",
  settings: "settings",
} as const;

export const BOOTH_ID = "main";
export const PAPER_DOC = "printer";

export const storagePath = (sessionId: string, file: "final.jpg" | "animation.gif") => `sessions/${sessionId}/${file}`;
