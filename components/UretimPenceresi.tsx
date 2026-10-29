"use client";
import { useEffect, useState } from "react";
import { BOY_CM, type UretimPlani } from "@/lib/uretim";
import { A4Onizleme } from "./TeklifListesi";
import { pdfIndir, yazdir } from "./TeklifYazdir";

const s = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

/**
 * Üretim planı penceresi (tam ekran): ortada A4 teknik resim ve kesim listesi PDF önizlemesi;
 * PDF indir ve yazdır.
 */
export function UretimPenceresi({ plan, html, dosyaAdi, kapat }: { plan: UretimPlani; html: string; dosyaAdi: string; kapat: () => void }) {
  const [hazir, setHazir] = useState<"indir" | "yazdir" | null>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);
  const cikti = async (tur: "indir" | "yazdir") => {
    setHazir(tur);
    try {
      if (tur === "indir") await pdfIndir(html, dosyaAdi);
      else await yazdir(html);
    } finally {
      setHazir(null);
    }
  };
  const toplamBoy = plan.alim.reduce((a, x) => a + x.boy, 0);
  const dugme = "rounded-xl px-4 py-2.5 text-sm font-extrabold uppercase tracking-wider transition disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ac-gece" role="dialog" aria-modal="true" aria-label="Üretim planı">
      <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="mr-auto min-w-0">
          <h2 className="text-xl font-extrabold uppercase tracking-wider sm:text-2xl">Üretim planı · {plan.baslik}</h2>
          <p className="text-sm text-[var(--metin-2)]">
            {plan.alim.length} profil · toplam {toplamBoy} boy ({BOY_CM / 100} m) · {plan.sarf.length} hırdavat kalemi
          </p>
        </div>
        <button type="button" onClick={() => void cikti("indir")} disabled={!!hazir} className={`${dugme} bg-ac-kirmizi hover:bg-ac-kirmizi-acik`}>
          {hazir === "indir" ? "Hazırlanıyor…" : "PDF indir"}
        </button>
        <button type="button" onClick={() => void cikti("yazdir")} disabled={!!hazir} className={`${dugme} bg-white/10 ring-1 ring-white/15 hover:bg-white/20`}>
          {hazir === "yazdir" ? "Hazırlanıyor…" : "Yazdır"}
        </button>
        <button type="button" autoFocus onClick={kapat} className={`${dugme} bg-white/10 ring-1 ring-white/15 hover:bg-white/20`}>
          Kapat ✕
        </button>
      </header>

      {/* Yalnız A4 teknik resim, ekranın ortasında (kesim listesi PDF'in içinde) */}
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
          <A4Onizleme html={html} baslik="Üretim planı teknik resim" />
        </section>
      </div>
    </div>
  );
}
