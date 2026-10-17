"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { etkinAyarlar, useAyarlar } from "@/lib/ayarlar";
import { hesapla } from "@/lib/hesap";
import { useTasarim } from "@/lib/store";
import { type KayitliTeklif, useTeklifler } from "@/lib/teklifler";
import { A4, teklifHtml } from "./pdf";
import { useTeklifCikti } from "./TeklifYazdir";
import { sayi, tl } from "./ui";

/** Kayıtlı teklifler: solda liste (ara, sil), sağda seçilen teklifin PDF önizlemesi. */
export function TeklifListesi({ kapat }: { kapat: () => void }) {
  const { liste, sil } = useTeklifler();
  const acikNo = useTasarim((s) => s.tasarim.teklifNo);
  const [ara, setAra] = useState("");
  const [secili, setSecili] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  const bulunan = useMemo(() => {
    const q = ara.trim().toLocaleLowerCase("tr");
    return q ? liste.filter((k) => `${k.musteri} ${k.no} ${k.satisci ?? ""}`.toLocaleLowerCase("tr").includes(q)) : liste;
  }, [liste, ara]);
  const kayit = liste.find((k) => k.no === secili) ?? null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 backdrop-blur-sm sm:p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Teklifler"
        className="yukari flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold uppercase tracking-wider sm:text-2xl">Teklifler</h2>
            <p className="truncate text-sm text-[var(--metin-2)]">{liste.length} kayıtlı teklif · bu cihazda saklanır, verildiği tarihteki fiyatlarla</p>
          </div>
          <button type="button" autoFocus onClick={kapat} className="shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold ring-1 ring-white/15 hover:bg-white/20">
            Kapat ✕
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(340px,440px)_1fr]">
          {/* Liste — telefonda teklif seçilince gizlenir */}
          <section className={`ince-kaydirma min-h-0 flex-1 space-y-2 overflow-y-auto p-4 lg:border-r lg:border-white/10 ${kayit ? "hidden lg:block" : ""}`}>
            {liste.length > 0 && (
              <input
                type="search"
                value={ara}
                onChange={(e) => setAra(e.target.value)}
                placeholder="Müşteri, satışçı ya da teklif no ile ara"
                aria-label="Teklif ara"
                className="cam mb-2 w-full rounded-xl px-4 py-3 text-base outline-none placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi"
              />
            )}
            {liste.length === 0 && (
              <p className="cam rounded-xl p-5 text-base text-[var(--metin-2)]">
                Henüz kayıtlı teklif yok. <b className="text-white">Kaydet</b>, <b className="text-white">PDF indir</b> ya da <b className="text-white">Yazdır</b> dediğinizde burada
                listelenir.
              </p>
            )}
            {liste.length > 0 && bulunan.length === 0 && <p className="text-base text-[var(--metin-2)]">“{ara}” ile eşleşen teklif yok.</p>}
            {bulunan.map((k) => (
              <button
                key={k.no}
                type="button"
                onClick={() => setSecili(k.no)}
                aria-pressed={k.no === secili}
                className={`cam flex w-full items-center gap-3 rounded-xl p-3.5 text-left transition hover:bg-[var(--yuzey-2)] ${k.no === secili ? "secili" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold">{k.musteri || "İsimsiz müşteri"}</div>
                  <div className="truncate text-sm text-[var(--metin-2)]">
                    {k.satisci && <>{k.satisci} · </>}
                    {new Date(k.tarih).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })} · {sayi(k.telUzunluk)} m
                  </div>
                  <div className="truncate text-xs text-[var(--metin-2)]">
                    {k.no}
                    {!!k.gecmis?.length && <> · {k.gecmis.length} önceki revizyon</>}
                    {k.no === acikNo && <span className="font-bold text-red-200"> · ekranda</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right text-lg font-extrabold tabular-nums text-ac-kirmizi-acik">{tl(k.toplam)}</div>
              </button>
            ))}
          </section>

          {/* Detay: PDF önizleme + işlemler */}
          <section className={`min-h-0 flex-1 flex-col ${kayit ? "flex" : "hidden lg:flex"}`}>
            {kayit ? (
              <TeklifOnizleme
                key={kayit.no}
                k={kayit}
                ekranda={kayit.no === acikNo}
                geri={() => setSecili(null)}
                sil={() => {
                  if (!confirm(`${kayit.musteri || kayit.no} teklifi silinsin mi?`)) return;
                  sil(kayit.no);
                  setSecili(null);
                }}
                kapat={kapat}
              />
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center text-lg text-[var(--metin-2)]">
                {liste.length ? "Detayını görmek için soldan bir teklif seçin." : ""}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TeklifOnizleme({ k, ekranda, geri, sil, kapat }: { k: KayitliTeklif; ekranda: boolean; geri: () => void; sil: () => void; kapat: () => void }) {
  const guncel = useAyarlar((a) => a.ayarlar);
  const yukle = useTasarim((s) => s.yukle);
  const ay = useMemo(() => ({ ...etkinAyarlar(k.tasarim, guncel), ...(k.firma && { firma: k.firma }) }), [k, guncel]);
  const s = useMemo(() => hesapla(k.tasarim, ay), [k, ay]);
  const html = useMemo(() => teklifHtml({ t: k.tasarim, s, ayarlar: ay, detayResim: null, no: k.no, tarih: new Date(k.tarih) }), [k, s, ay]);
  const cikti = useTeklifCikti(k.tasarim, s);

  // A4 sayfayı kutunun genişliğine sığdır
  const kutu = useRef<HTMLDivElement>(null);
  const [olcek, setOlcek] = useState(0.6);
  useLayoutEffect(() => {
    const el = kutu.current;
    if (!el) return;
    const ayarla = () => setOlcek(Math.min(1.2, (el.clientWidth - 32) / A4.w));
    ayarla();
    const g = new ResizeObserver(ayarla);
    g.observe(el);
    return () => g.disconnect();
  }, []);

  const ac = () => {
    if (!confirm(ekranda ? "Bu teklif zaten ekranda. Kayıtlı haline dönülsün mü? Kaydedilmemiş değişiklikler kaybolur." : "Teklif 3D planlayıcıda açılsın mı? Ekrandaki çizimin yerine geçer."))
      return;
    yukle(k.tasarim);
    kapat();
  };
  const dugme = "rounded-xl px-4 py-3 text-sm font-extrabold uppercase tracking-wider transition disabled:opacity-60 sm:text-base";

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 p-3 sm:px-5">
        <button type="button" onClick={geri} className={`${dugme} bg-white/10 ring-1 ring-white/15 hover:bg-white/20 lg:hidden`}>
          ← Liste
        </button>
        <div className="mr-auto min-w-0">
          <div className="truncate text-lg font-extrabold">{k.musteri || "İsimsiz müşteri"}</div>
          <div className="truncate text-sm text-[var(--metin-2)]">
            {k.no}
            {k.satisci && ` · Teklifi veren: ${k.satisci}`}
            {k.tasarim.fiyatlar && ` · 🔒 ${new Date(k.tasarim.fiyatlar.tarih).toLocaleDateString("tr-TR")} fiyatları`}
          </div>
        </div>
        <button type="button" onClick={ac} className={`${dugme} flex items-center gap-2 bg-ac-mavi hover:brightness-110`}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
            <path d="m12 2 9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12 3 7" />
          </svg>
          3D'de aç
        </button>
        <button type="button" onClick={cikti.indir} disabled={!!cikti.hazirlanan} className={`${dugme} bg-ac-kirmizi hover:bg-ac-kirmizi-acik`}>
          {cikti.hazirlanan === "indir" ? "Hazırlanıyor…" : "PDF indir"}
        </button>
        <button type="button" onClick={cikti.yazdir} disabled={!!cikti.hazirlanan} className={`${dugme} bg-white/10 ring-1 ring-white/15 hover:bg-white/20`}>
          {cikti.hazirlanan === "yazdir" ? "Hazırlanıyor…" : "Yazdır"}
        </button>
        <button type="button" onClick={sil} className={`${dugme} text-[var(--metin-2)] hover:bg-ac-kirmizi/25 hover:text-white`}>
          Sil
        </button>
      </div>
      <div ref={kutu} className="ince-kaydirma min-h-0 flex-1 overflow-auto bg-black/20 p-4">
        <div className="mx-auto overflow-hidden rounded-sm bg-[#fff] shadow-2xl" style={{ width: A4.w * olcek, height: A4.h * olcek }}>
          <iframe
            title={`${k.no} teklif önizleme`}
            srcDoc={html}
            className="origin-top-left border-0"
            style={{ width: A4.w, height: A4.h, transform: `scale(${olcek})` }}
          />
        </div>
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-[var(--metin-2)]">
          Önizlemede köşe yakın çekim resmi yer almaz; PDF indir ve Yazdır'da 3D'den çizilip eklenir.
        </p>
      </div>
      {cikti.cizici}
    </>
  );
}
