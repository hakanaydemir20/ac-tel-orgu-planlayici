"use client";
import { useAyarlar } from "@/lib/ayarlar";

/** "Teklifi veren": firmanın satışçılarından biri (liste Ayarlar → Firma'dan). */
export function SatisciSec({ deger, degistir, uyari }: { deger: string; degistir: (v: string) => void; uyari?: boolean }) {
  const liste = useAyarlar((a) => a.ayarlar.satiscilar);
  // Listeden çıkarılmış eski bir isim kayıtlı teklifte görünmeye devam etsin
  const secenekler = deger && !liste.includes(deger) ? [...liste, deger] : liste;
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--metin-2)]">Teklifi veren</span>
      <select
        value={deger}
        onChange={(e) => degistir(e.target.value)}
        aria-label="Teklifi veren satışçı"
        className={`w-full rounded-lg bg-white/5 px-3 py-2.5 text-base font-semibold outline-none ring-1 focus:ring-2 focus:ring-ac-kirmizi [&>option]:bg-ac-gece ${
          uyari ? "ring-amber-400" : "ring-white/10"
        }`}
      >
        <option value="">Satışçı seçin…</option>
        {secenekler.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
