"use client";
import type { Musteri } from "@/lib/tasarim";
import { waNumarasi } from "@/lib/telefon";

type Alan = Exclude<keyof Musteri, "tip">;

const KISI: [Alan, string, string, string][] = [
  ["ad", "Ad soyad", "text", "col-span-2"],
  ["telefon", "Telefon", "tel", ""],
  ["eposta", "E-posta", "email", ""],
  ["adres", "Adres / konum", "text", "col-span-2"],
];
const FIRMA: [Alan, string, string, string][] = [
  ["ad", "Firma unvanı", "text", "col-span-2"],
  ["yetkili", "Yetkili kişi", "text", "col-span-2"],
  ["telefon", "Telefon", "tel", ""],
  ["eposta", "E-posta", "email", ""],
  ["adres", "Adres / konum", "text", "col-span-2"],
  ["vergiDairesi", "Vergi dairesi", "text", ""],
  ["vergiNo", "Vergi no", "text", ""],
];

/** Teklif verilecek kişi ya da firmanın bilgileri (yeni teklif penceresi ve teklif detayları). */
export function MusteriFormu({
  musteri: m,
  degistir,
  ilkAlanaOdak,
}: {
  musteri: Musteri;
  degistir: (m: Musteri) => void;
  ilkAlanaOdak?: boolean;
}) {
  const alanlar = m.tip === "firma" ? FIRMA : KISI;
  const telefonUyari = m.telefon.trim() && !waNumarasi(m.telefon);
  const epostaUyari = m.eposta.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.eposta.trim());
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10" role="radiogroup" aria-label="Müşteri tipi">
        {(
          [
            ["kisi", "Kişi"],
            ["firma", "Firma"],
          ] as const
        ).map(([tip, ad]) => (
          <button
            key={tip}
            type="button"
            role="radio"
            aria-checked={m.tip === tip}
            onClick={() => degistir({ ...m, tip })}
            className={`rounded-lg py-2 text-sm font-bold transition ${m.tip === tip ? "bg-ac-kirmizi text-white" : "text-[var(--metin-2)] hover:text-white"}`}
          >
            {ad}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {alanlar.map(([alan, ad, tip, sinif], i) => (
          <input
            key={alan}
            type={tip}
            autoFocus={ilkAlanaOdak && i === 0}
            aria-label={ad}
            placeholder={ad}
            value={m[alan]}
            onChange={(e) => degistir({ ...m, [alan]: e.target.value })}
            className={`${sinif} w-full rounded-lg bg-white/5 px-3 py-2 text-base outline-none ring-1 ring-white/10 placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi sm:text-sm`}
          />
        ))}
        <textarea
          aria-label="Not (PDF'te görünür)"
          placeholder="Not (PDF'te görünür)"
          rows={2}
          value={m.not}
          onChange={(e) => degistir({ ...m, not: e.target.value })}
          className="col-span-2 w-full resize-none rounded-lg bg-white/5 px-3 py-2 text-base outline-none ring-1 ring-white/10 placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi sm:text-sm"
        />
      </div>
      {(telefonUyari || epostaUyari) && (
        <p className="text-xs text-amber-200">
          {telefonUyari && "Telefon tanınmadı (WhatsApp için 05xx xxx xx xx yazın). "}
          {epostaUyari && "E-posta adresi eksik görünüyor."}
        </p>
      )}
    </div>
  );
}
