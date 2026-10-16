"use client";
import { useEffect, useState } from "react";
import { useTasarim } from "@/lib/store";
import { bosMusteri } from "@/lib/tasarim";
import { MusteriFormu } from "./MusteriFormu";

/** "+ Yeni teklif": teklif verilecek kişi/firmayı alır, ekranı temizleyip bu bilgilerle başlatır. */
export function YeniTeklif({ kapat }: { kapat: () => void }) {
  const sifirla = useTasarim((s) => s.sifirla);
  const kayitli = useTasarim((s) => !!s.tasarim.teklifNo);
  const [m, setM] = useState(bosMusteri);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  const baslat = () => {
    sifirla(m);
    kapat();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3 backdrop-blur-sm" onClick={kapat}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Yeni teklif"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          baslat();
        }}
        className="yukari w-full max-w-md overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
      >
        <div className="h-1.5 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
        <div className="space-y-4 p-5">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-wider">Yeni teklif</h2>
              <p className="text-xs text-[var(--metin-2)]">Teklif verilecek kişi ya da firma. Sonra da değiştirebilirsiniz.</p>
            </div>
            <button type="button" onClick={kapat} aria-label="Kapat" className="rounded-lg px-2 py-1 text-xl text-[var(--metin-2)] hover:bg-white/10 hover:text-white">
              ✕
            </button>
          </header>

          <MusteriFormu musteri={m} degistir={setM} ilkAlanaOdak />

          <p className="text-xs text-[var(--metin-2)]">
            Ekrandaki çizim temizlenir.{kayitli ? " Mevcut teklif Teklifler listesinde duruyor." : " Mevcut teklif kaydedilmediyse kaybolur."}
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button type="button" onClick={kapat} className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/15 hover:bg-white/20">
              Vazgeç
            </button>
            <button type="submit" className="rounded-xl bg-ac-kirmizi py-3 font-extrabold uppercase tracking-wider hover:bg-ac-kirmizi-acik">
              Teklife başla →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
