"use client";
import { useEffect, useMemo, useState } from "react";
import { useTasarim } from "@/lib/store";
import { useTeklifler } from "@/lib/teklifler";
import { sayi, tl } from "./ui";

/** Kayıtlı teklifler: ara, aç, sil. */
export function TeklifListesi({ kapat }: { kapat: () => void }) {
  const { liste, sil } = useTeklifler();
  const yukle = useTasarim((s) => s.yukle);
  const acikNo = useTasarim((s) => s.tasarim.teklifNo);
  const [ara, setAra] = useState("");

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  const bulunan = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return q ? liste.filter((k) => `${k.musteri} ${k.no} ${k.satisci ?? ""}`.toLocaleLowerCase("tr").includes(q)) : liste;
  }, [liste, ara]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Teklifler"
        className="ince-kaydirma yukari flex h-full w-full max-w-xl flex-col overflow-y-auto bg-ac-gece/95 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
        <header className="sticky top-0 z-10 space-y-3 bg-ac-gece/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold uppercase tracking-wider">Teklifler</h2>
              <p className="text-xs text-[var(--metin-2)]">Arşiv · kaydedilen, yazdırılan ve indirilen her teklif bu cihazda saklanır</p>
            </div>
            <button type="button" autoFocus onClick={kapat} className="rounded-lg px-3 py-1 text-xl text-[var(--metin-2)] hover:bg-white/10 hover:text-white" aria-label="Kapat">
              ✕
            </button>
          </div>
          {liste.length > 0 && (
            <input
              type="search"
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="Müşteri adı ya da teklif no ile ara"
              aria-label="Teklif ara"
              className="cam w-full rounded-xl px-4 py-2.5 text-base outline-none sm:text-sm placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi"
            />
          )}
        </header>

        <div className="space-y-2 px-5 pb-8">
          {liste.length === 0 && (
            <p className="cam rounded-xl p-4 text-sm text-[var(--metin-2)]">
              Henüz kayıtlı teklif yok. Teklif detaylarından <b className="text-white">Kaydet</b>, <b className="text-white">PDF indir</b> ya da{" "}
              <b className="text-white">Yazdır</b> dediğinizde burada listelenir.
            </p>
          )}
          {liste.length > 0 && bulunan.length === 0 && <p className="text-sm text-[var(--metin-2)]">“{ara}” ile eşleşen teklif yok.</p>}
          {bulunan.map((k) => (
            <div key={k.no} className={`cam flex items-center gap-3 rounded-xl p-3 ${k.no === acikNo ? "ring-1 ring-ac-kirmizi" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{k.musteri || "İsimsiz müşteri"}{k.satisci && <span className="font-normal text-[var(--metin-2)]"> · {k.satisci}</span>}</div>
                <div className="text-xs text-[var(--metin-2)]">
                  {k.no} · {new Date(k.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} · {sayi(k.telUzunluk)} m
                  {k.tasarim.fiyatlar && <> · 🔒 {new Date(k.tasarim.fiyatlar.tarih).toLocaleDateString("tr-TR")} fiyatları</>}
                  {!!k.gecmis?.length && <> · {k.gecmis.length} önceki revizyon</>}
                  {k.no === acikNo && <span className="text-red-200"> · ekranda</span>}
                </div>
              </div>
              <div className="shrink-0 text-right font-extrabold tabular-nums text-ac-kirmizi-acik">{tl(k.toplam)}</div>
              <button
                type="button"
                onClick={() => {
                  const soru =
                    k.no === acikNo
                      ? "Bu teklif zaten ekranda. Kayıtlı haline dönülsün mü? Kaydedilmemiş değişiklikler kaybolur."
                      : "Bu teklif açılsın mı? Ekrandaki çizimin yerine geçer.";
                  if (!confirm(soru)) return;
                  yukle(k.tasarim);
                  kapat();
                }}
                className="shrink-0 rounded-lg bg-ac-kirmizi px-3 py-2 text-xs font-extrabold uppercase tracking-wider hover:bg-ac-kirmizi-acik"
              >
                Aç
              </button>
              <button
                type="button"
                aria-label={`${k.musteri || k.no} teklifini sil`}
                onClick={() => confirm(`${k.musteri || k.no} teklifi silinsin mi?`) && sil(k.no)}
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold text-[var(--metin-2)] hover:bg-white/10 hover:text-white"
              >
                Sil
              </button>
            </div>
          ))}
          {liste.length > 0 && (
            <p className="pt-2 text-xs text-[var(--metin-2)]">
              Her teklif verildiği tarihteki fiyatlarla saklanır ve öyle açılır; Ayarlar'daki fiyat değişiklikleri eski teklifleri etkilemez.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
