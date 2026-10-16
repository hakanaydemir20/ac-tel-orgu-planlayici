"use client";
import { useEffect } from "react";
import type { Kalem, Sonuc } from "@/lib/hesap";
import { useEtkinAyarlar } from "@/lib/ayarlar";
import { useTasarim } from "@/lib/store";
import type { Tasarim } from "@/lib/tasarim";
import { MusteriFormu } from "./MusteriFormu";
import { waNumarasi } from "@/lib/telefon";
import { whatsappMetni } from "./pdf";
import { teklifiKaydet, type useTeklifCikti } from "./TeklifYazdir";
import { sayi, tl } from "./ui";

const GRUPLAR: Kalem["grup"][] = ["Tel", "Direk", "Bağlantı", "Kapı", "Hizmet"];

/** Ekrana yakın pencere: solda kalem kalem tablo, sağda müşteri, toplam ve işlemler. */
export function TeklifDetay({
  sonuc: s,
  tasarim: t,
  cikti,
  kapat,
}: {
  sonuc: Sonuc;
  tasarim: Tasarim;
  cikti: Pick<ReturnType<typeof useTeklifCikti>, "yazdir" | "indir" | "hazirlanan">;
  kapat: () => void;
}) {
  const ayarlar = useEtkinAyarlar(t);
  const kdvYuzde = ayarlar.kdvYuzde;
  const guncelle = useTasarim((x) => x.guncelle);
  const numara = waNumarasi(t.musteri.telefon);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  // Müşteri telefonu geçerliyse doğrudan ona; değilse WhatsApp kişi seçtirir
  const whatsapp = () => window.open(`https://wa.me/${numara}?text=${encodeURIComponent(whatsappMetni(t, s, ayarlar))}`, "_blank");
  const bos = !s.kenarlar.length;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 backdrop-blur-sm sm:p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Teklif detayları"
        className="yukari flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold uppercase tracking-wider sm:text-2xl">Teklif detayları</h2>
            <p className="truncate text-sm text-[var(--metin-2)] sm:text-base">
              {t.teklifNo ? `Kayıtlı · ${t.teklifNo}` : "Henüz kaydedilmedi"}
              {t.musteri.ad.trim() && ` · ${t.musteri.ad.trim()}`}
            </p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={kapat}
            className="shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold ring-1 ring-white/15 hover:bg-white/20"
          >
            Kapat ✕
          </button>
        </header>

        <div className="ince-kaydirma min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:overflow-hidden">
          {/* Kalemler */}
          <section className="ince-kaydirma px-4 py-4 sm:px-6 lg:overflow-y-auto lg:py-5">
            <table className="w-full text-base lg:text-lg">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-[var(--metin-2)] sm:text-sm">
                  <th className="pb-2 text-left font-semibold">Kalem</th>
                  <th className="pb-2 text-right font-semibold">Miktar</th>
                  <th className="hidden pb-2 pl-4 text-right font-semibold sm:table-cell">Birim fiyat</th>
                  <th className="pb-2 pl-4 text-right font-semibold">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {GRUPLAR.map((g) => {
                  const ks = s.kalemler.filter((k) => k.grup === g);
                  if (!ks.length) return null;
                  return [
                    <tr key={g}>
                      <td colSpan={2} className="pb-2 pt-6 text-sm font-extrabold uppercase tracking-widest text-ac-mavi sm:text-base">
                        {g}
                      </td>
                      <td className="hidden sm:table-cell" />
                      <td className="pb-2 pt-6 text-right text-sm font-extrabold tabular-nums text-ac-mavi sm:text-base">{tl(s.grupToplam[g] ?? 0)}</td>
                    </tr>,
                    ...ks.map((k) => (
                      <tr key={k.ad} className="border-b border-white/10 align-top odd:bg-white/[0.03]">
                        <td className="py-3 pl-2 pr-3">
                          {k.ad}
                          <div className="text-sm text-[var(--metin-2)] sm:hidden">{tl(k.birimFiyat, true)} / {k.birim}</div>
                        </td>
                        <td className="whitespace-nowrap py-3 text-right font-bold tabular-nums">
                          {sayi(k.miktar)} <span className="font-normal text-[var(--metin-2)]">{k.birim}</span>
                        </td>
                        <td className="hidden whitespace-nowrap py-3 pl-4 text-right tabular-nums text-[var(--metin-2)] sm:table-cell">{tl(k.birimFiyat, true)}</td>
                        <td className="whitespace-nowrap py-3 pl-4 pr-2 text-right font-semibold tabular-nums">{tl(k.tutar)}</td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
            {bos && <p className="py-10 text-center text-lg text-[var(--metin-2)]">Henüz çit çizilmedi.</p>}
          </section>

          {/* Toplam, işlemler, müşteri */}
          <aside className="ince-kaydirma space-y-5 border-t border-white/10 bg-white/[0.03] px-4 py-5 sm:px-6 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <div className="cam space-y-2 rounded-2xl p-5 text-lg">
              <div className="flex justify-between">
                <span className="text-[var(--metin-2)]">Ara toplam</span>
                <span className="tabular-nums">{tl(s.araToplam)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--metin-2)]">KDV %{sayi(kdvYuzde)}</span>
                <span className="tabular-nums">{tl(s.kdv)}</span>
              </div>
              <div className="flex items-end justify-between border-t border-white/10 pt-3">
                <span className="font-bold uppercase tracking-wider">Toplam</span>
                <span className="text-4xl font-extrabold text-ac-kirmizi-acik tabular-nums">{tl(s.toplam)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-base">
              <button
                type="button"
                onClick={cikti.indir}
                disabled={!!cikti.hazirlanan || bos}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-ac-kirmizi py-4 text-lg font-extrabold uppercase tracking-wider hover:bg-ac-kirmizi-acik disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
                {cikti.hazirlanan === "indir" ? "PDF hazırlanıyor…" : "Teklif PDF indir"}
              </button>
              <button
                type="button"
                onClick={cikti.yazdir}
                disabled={!!cikti.hazirlanan || bos}
                className="rounded-xl bg-white/10 py-4 font-extrabold uppercase tracking-wider ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-60"
              >
                {cikti.hazirlanan === "yazdir" ? "Hazırlanıyor…" : "Yazdır"}
              </button>
              <button
                type="button"
                onClick={whatsapp}
                title={numara ? `${t.musteri.telefon} numarasına gönderilir` : "Kişiyi WhatsApp'ta seçersiniz"}
                className="rounded-xl bg-[#1fa855] py-4 font-extrabold uppercase tracking-wider hover:bg-[#25c062]"
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => teklifiKaydet(t, s, ayarlar)}
                disabled={bos}
                className="col-span-2 rounded-xl bg-white/10 py-4 font-extrabold uppercase tracking-wider ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-60"
              >
                {t.teklifNo ? "Kaydı güncelle" : "Teklifi kaydet"}
              </button>
            </div>

            <section className="space-y-3">
              <div className="text-sm font-extrabold uppercase tracking-widest text-ac-mavi">Müşteri</div>
              <MusteriFormu musteri={t.musteri} degistir={(m) => guncelle((x) => void (x.musteri = m))} />
            </section>
            <p className="text-sm text-[var(--metin-2)]">
              {numara ? `WhatsApp ${t.musteri.telefon} numarasına gider. ` : ""}PDF tek sayfa A4 dikey hazırlanır. Fiyatlar Ayarlar penceresinden değiştirilir.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
