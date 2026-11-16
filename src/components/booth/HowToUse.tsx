const STEPS = [
  { id: "01", en: "Scan ticket", id_: "Scan tiket" },
  { id: "02", en: "Choose design", id_: "Pilih desain" },
  { id: "03", en: "Take 6 photos", id_: "Foto 6 kali" },
  { id: "04", en: "Select 4 photos", id_: "Pilih 4 foto" },
  { id: "05", en: "Pick a filter", id_: "Pilih filter" },
  { id: "06", en: "Print & download", id_: "Cetak & unduh" },
];

/** Strip "HOW TO USE" dwibahasa di bagian bawah layar standby */
export function HowToUse({ active }: { active?: number }) {
  return (
    <div className="rounded-3xl bg-cream-50/[0.06] px-6 py-4 ring-1 ring-cream-50/10">
      <p className="mb-3 font-serif text-xl font-bold tracking-[0.2em] text-cream-50">HOW TO USE PHOTOBOOTH</p>
      <ol className="grid grid-cols-3 gap-x-4 gap-y-3 lg:grid-cols-6">
        {STEPS.map((s, i) => (
          <li key={s.id} className={`border-l pl-3 ${active === i ? "border-gold-400" : "border-cream-50/20"}`}>
            <p className="text-[10px] font-bold tracking-[0.25em] text-gold-400">STEP.{s.id}</p>
            <p className="text-sm font-medium text-cream-50">{s.en}</p>
            <p className="text-xs text-cream-50/55">{s.id_}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
