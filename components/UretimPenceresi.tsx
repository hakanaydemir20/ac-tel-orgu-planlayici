"use client";
import { useEffect, useState } from "react";
import { BOY_CM, type UretimPlani } from "@/lib/uretim";
import { A4Onizleme } from "./TeklifListesi";
import { pdfIndir, yazdir } from "./TeklifYazdir";

const s = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

/**
 * Üretim planı penceresi (tam ekran): solda kısa ve öz kesim listesi, profil alımı (6 m boy) ve
 * hırdavat; sağda teknik resim PDF önizlemesi, PDF indir ve yazdır.
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

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(380px,1fr)_minmax(0,1.1fr)]">
        {/* Liste: kısa ve öz */}
        <section className="ince-kaydirma min-h-0 space-y-6 overflow-y-auto p-4 sm:p-6 lg:border-r lg:border-white/10">
          <Bolum baslik="Kesim listesi" alt="Parça boyu cm, kesim payı 3 mm">
            <table className="w-full text-base">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-[var(--metin-2)]">
                  <th className="pb-2 text-left font-semibold">Parça</th>
                  <th className="pb-2 text-left font-semibold">Profil</th>
                  <th className="pb-2 text-right font-semibold">Boy</th>
                  <th className="pb-2 text-right font-semibold">Adet</th>
                </tr>
              </thead>
              <tbody>
                {plan.kesim.map((k, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="py-2 pr-2">{k.ad}</td>
                    <td className="py-2 pr-2 text-[var(--metin-2)]">
                      {k.profil}
                      {k.kesim && <div className={`text-xs font-bold ${k.kesim.includes("°") ? "text-amber-300" : "text-[var(--metin-2)]"}`}>{k.kesim}</div>}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right font-bold tabular-nums">{s(k.boyCm)} cm</td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right font-bold tabular-nums">× {k.adet}</td>
                  </tr>
                ))}
                {!plan.kesim.length && (
                  <tr>
                    <td colSpan={4} className="py-3 text-[var(--metin-2)]">
                      Kesilecek profil yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Bolum>

          {plan.olcuNotlari && plan.olcuNotlari.length > 0 && (
            <Bolum baslik="Ölçü notları" alt="Kesim ve kaynak için">
              <ul className="list-disc space-y-1 pl-5 text-base">
                {plan.olcuNotlari.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Bolum>
          )}

          <Bolum baslik={`Alınacak profil · ${BOY_CM / 100} m boy`} alt="Kesim optimizasyonu ile">
            <div className="grid gap-2">
              {plan.alim.map((a) => (
                <div key={a.profil} className="cam flex items-center gap-3 rounded-xl px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{a.profil}</div>
                    <div className="text-sm text-[var(--metin-2)]">
                      {a.parcaAdet} parça · {s(a.toplamCm / 100)} m · fire %{a.fireYuzde}
                    </div>
                  </div>
                  <div className="text-right text-2xl font-extrabold tabular-nums text-ac-kirmizi-acik">
                    {a.boy} <span className="text-sm font-bold text-[var(--metin-2)]">boy</span>
                  </div>
                </div>
              ))}
            </div>
          </Bolum>

          <Bolum baslik="Hırdavat ve hazır malzeme">
            <ul className="divide-y divide-white/10">
              {plan.sarf.map((x, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 text-base">
                  <span>{x.ad}</span>
                  <b className="whitespace-nowrap tabular-nums">
                    {s(x.adet)} {x.birim}
                  </b>
                </li>
              ))}
            </ul>
          </Bolum>
          {plan.notlar.length > 0 && <p className="text-sm text-[var(--metin-2)]">{plan.notlar.join(" ")}</p>}
        </section>

        {/* Teknik resim önizleme */}
        <section className="flex min-h-[60vh] flex-col lg:min-h-0">
          <A4Onizleme html={html} baslik="Üretim planı teknik resim" />
        </section>
      </div>
    </div>
  );
}

function Bolum({ baslik, alt, children }: { baslik: string; alt?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-ac-mavi">{baslik}</h3>
        {alt && <span className="text-xs text-[var(--metin-2)]">{alt}</span>}
      </div>
      {children}
    </section>
  );
}
