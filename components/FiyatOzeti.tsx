"use client";
import { useState } from "react";
import { useTasarim } from "@/lib/store";
import type { Sonuc } from "@/lib/hesap";
import type { Tasarim } from "@/lib/tasarim";
import { TeklifDetay } from "./TeklifDetay";
import type { useTeklifCikti } from "./TeklifYazdir";
import { sayi, tl } from "./ui";

/** 3D alanın üstünde tek satır: solda toplam + Teklif detayları, yanında adet kutuları. */
export function FiyatOzeti({
  sonuc: s,
  tasarim: t,
  cikti,
}: {
  sonuc: Sonuc;
  tasarim: Tasarim;
  cikti: ReturnType<typeof useTeklifCikti>;
}) {
  const [detay, setDetay] = useState(false);
  const guncelle = useTasarim((x) => x.guncelle);

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex flex-wrap items-center gap-1.5 sm:inset-x-3 sm:top-3">
      <div className="cam pointer-events-auto flex items-center gap-2.5 rounded-2xl bg-ac-gece/85 py-1.5 pl-3.5 pr-1.5 shadow-2xl">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--metin-2)]">Toplam · KDV dahil</div>
          <div className="text-xl font-extrabold leading-tight text-ac-kirmizi-acik tabular-nums sm:text-2xl">{tl(s.toplam)}</div>
        </div>
        <button
          type="button"
          onClick={() => setDetay(true)}
          aria-label="Teklif detayları"
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider ring-1 ring-white/15 transition hover:bg-white/20 sm:px-4 sm:text-sm"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
          <span className="hidden sm:inline">Teklif </span>detayları
        </button>
      </div>

      {t.fiyatlar && (
        <span className="cam pointer-events-auto flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold">
          <span title="Ayarlar'daki fiyat değişiklikleri bu teklifi etkilemez">
            🔒 {new Date(t.fiyatlar.tarih).toLocaleDateString("tr-TR")} fiyatları
          </span>
          <button
            type="button"
            onClick={() =>
              confirm("Bu teklif güncel fiyatlarla yeniden hesaplansın mı? Kaydedince arşivde yeni revizyon olur.") &&
              guncelle((x) => void (x.fiyatlar = null))
            }
            className="rounded-full bg-white/10 px-2 py-0.5 font-bold hover:bg-white/20"
          >
            Güncelle
          </button>
        </span>
      )}

      {[
        ["Çit", `${sayi(s.telUzunluk)} m`],
        ["Direk", s.sayilar.toplamDirek],
        ["Payanda", s.sayilar.payanda],
        [s.paket.birim === "panel" ? "Panel" : "Rulo", s.paket.adet],
      ].map(([a, b]) => (
        <span key={a} className="cam whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold lg:px-3.5 lg:py-1.5 lg:text-base 2xl:text-lg">
          <span className="text-[var(--metin-2)]">{a}</span> <b>{b}</b>
        </span>
      ))}

      {cikti.cizici}
      {detay && <TeklifDetay sonuc={s} tasarim={t} cikti={cikti} kapat={() => setDetay(false)} />}
    </div>
  );
}
