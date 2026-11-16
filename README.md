# Photobooth Natal — Next.js + Tailwind + Firebase

Sistem photobooth lengkap bertema Natal yang clean (krem, hijau pine, merah berry, aksen emas).
UI booth mengikuti referensi kiosk Plan.B Studio (layar gelap, langkah "STEP.01–06", QR + keypad PIN).

| Halaman | Fungsi |
|---|---|
| `/kasir` | Jual tiket (1 Sesi Rp35.000, 2 Sesi Rp60.000, Extra Print Rp15.000), Cash/QRIS, cetak struk 58mm berisi QR `ticket_id` + PIN 6 digit |
| `/booth` | Layar fullscreen di bilik: scan QR/PIN → desain → 6 jepretan → pilih 4 foto + filter → cetak & QR unduh |
| `/queue` | Monitor antrean publik realtime (tiket `WAITING` + status bilik `IN_USE`) |
| `/admin` | Omzet Cash/QRIS, riwayat transaksi (CSV), stok kertas printer yang berkurang otomatis |
| `/download/[session_id]` | Halaman unduh foto & GIF animasi (dibuka dari QR di layar booth) |

## Menjalankan

```bash
npm install
cp .env.example .env.local      # isi kunci web app Firebase
npm run dev                     # http://localhost:3000
```

1. Firebase Console → buat proyek → aktifkan **Firestore** dan **Storage** → tambahkan Web App → salin config ke `.env.local`.
   (Storage pada proyek baru bisa mensyaratkan paket Blaze.)
2. Deploy aturan: `firebase deploy --only firestore:rules,storage`.
3. Agar tombol unduh di `/download` menyimpan file langsung: `gsutil cors set cors.json gs://<bucket>`.
4. Kamera butuh **HTTPS atau localhost**. Buka `/booth` sekali, izinkan kamera, lalu pilih kamera di ikon pengaturan bila ada lebih dari satu.

`NEXT_PUBLIC_ADMIN_PIN` (opsional) memasang PIN sederhana di `/admin`. Ini hanya penghalang tampilan di sisi klien.
Untuk produksi, aktifkan Firebase Auth + App Check lalu perketat `firestore.rules` (petunjuknya ada di file itu).

## Alur & aturan bisnis

- **Tiket**: nomor antrean harian atomik (`counters`), PIN 6 digit unik di antara tiket yang masih punya sisa sesi.
  Extra Print = lembar 4R tambahan yang ikut tercetak pada sesi pertama.
- **Scan** (`redeemTicket`, satu transaksi): cek `remaining_sessions > 0` dan bilik kosong, kurangi 1, tiket → `IN_USE`, bilik → `IN_USE`, timer 240 detik.
- **Timer habis**: di layar pilih foto → 4 foto diisi otomatis lalu dicetak; di desain/kamera → sesi dilepas.
- **Selesai** (`completeSession`, satu transaksi): simpan sesi, bilik → `IDLE`, tiket → `WAITING`/`DONE`, stok kertas berkurang sebanyak lembar yang dicetak.
- **Refresh di tengah sesi**: saat `/booth` dibuka lagi, bilik yang tertinggal `IN_USE` dilepas dan 1 sesi dikembalikan ke tiket.

## Frame & template

Frame ada di `public/templates/` (PNG transparan asli) dan koordinat slotnya di `src/lib/template-slots.json`.

| ID | Orientasi | Keterangan |
|---|---|---|
| `noel-strip` | Portrait 2-Strip | Desain Natal milikmu. Kotak-kotak "transparan" di PNG aslinya dilubangi jadi alpha 0 sungguhan |
| `snow-strip` | Portrait 2-Strip | Varian minimal |
| `noel-land` | Landscape 4R | Desain baru bergaya sama (krem, pine, pita merah) |
| `snow-land` | Landscape 4R | Varian minimal |

- Portrait = 1 strip 600×1800 px, dicetak 2 strip identik pada lembar 4R 1200×1800 (300 dpi) lalu dipotong dua.
- Landscape = 1800×1200 px, 4 foto grid 2×2.
- Foto digambar **di bawah** frame, jadi cukup buat PNG dengan lubang transparan.

Menambah template: siapkan PNG, jalankan `python3 scripts/prepare-frame.py in.png out.png W H` (melubangi checkerboard dan mengukur slot),
tempel hasilnya ke `template-slots.json`, daftarkan di `src/lib/templates.ts`.
`scripts/make-templates.mjs` membuat ulang varian Snow dan landscape.

## Struktur kode

```
src/lib/        firebase (lazy), tickets, booth (transaksi), finalize (compose+upload), imaging (canvas, filter, GIF), templates
src/components/camera/CameraCapture.tsx   komponen kamera mandiri (tanpa Firebase/tiket/template)
src/components/booth/                      Standby, QrScanner, PinPad, DesignSelect, PhotoSelect, ResultScreen, SessionTimer
src/components/kasir/Receipt.tsx           struk 58mm
src/hooks/                                 useCamera, useCountdown, useNow
```

**Menyesuaikan kamera**: semua ada di `CameraCapture.tsx`. Props utama: `aspectRatio`, `totalShots`, `countdownSeconds`,
`mirror` / `mirrorOutput`, `maxOutputWidth`, `jpegQuality`, `deviceId`, `onShot`, `onComplete`. Overlay (hitung mundur, kilat, filmstrip) ada di JSX paling bawah.

## Cetak otomatis tanpa dialog

`window.print()` biasanya memunculkan dialog. Untuk kiosk, jalankan Chrome dengan printer default yang sesuai dan flag:

```
chrome --kiosk --kiosk-printing http://localhost:3000/booth
```

- Struk di `/kasir`: set printer thermal 58mm sebagai default di PC kasir (ukuran `58mm auto` sudah diatur lewat `@page`).
- Foto di `/booth`: printer foto 4R (4×6 in). Ukuran halaman portrait/landscape diatur otomatis; jumlah lembar = 1 + extra print.

## Catatan pengujian

Sudah diuji di Chromium: komposisi semua template (portrait & landscape, tiga filter), pembuatan GIF, 6 jepretan otomatis dengan kamera palsu,
layar standby/desain/pilih foto/hasil, dan struk. Alur Firestore/Storage belum diuji terhadap proyek Firebase sungguhan
(emulator tidak tersedia di lingkungan pembuatan), jadi lakukan satu transaksi uji lengkap sebelum dipakai: kasir → scan → foto → cetak → unduh.
