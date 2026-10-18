"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { KAPI_DOLGULARI, KAPI_GENISLIKLERI, KAPI_TIPLERI, KAPI_YUKSEKLIKLERI, aracKapiHesapla, surgulu } from "@/lib/aracKapi";
import { kapiFiyatlari, kapiTeklifiKaydet, useAracKapi } from "@/lib/aracKapiStore";
import { useAyarlar } from "@/lib/ayarlar";
import type { Musteri } from "@/lib/tasarim";
import { teklifNo as yeniNo } from "@/lib/teklifKaydi";
import { useTeklifler } from "@/lib/teklifler";
import { aracKapiHtml, aracKapiWhatsapp } from "./aracKapiPdf";
import { MusteriSor } from "./MusteriSor";
import { TeklifListesi } from "./TeklifListesi";
import { TeklifPenceresi } from "./TeklifPenceresi";
import { pdfIndir, yazdir as htmlYazdir } from "./TeklifYazdir";
import { UstMenu } from "./UstMenu";
import { YeniTeklif } from "./YeniTeklif";
import { DIREK_RENKLERI } from "@/lib/katalog";
import { AyarPaneli } from "./AyarPaneli";
import { Adim, Anahtar, Etiket, Kart, SayiGiris, Secici, sayi, tl } from "./ui";

const Sahne = dynamic(() => import("./sahne/AracKapiSahne"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-[var(--metin-2)]">3D hazırlanıyor…</div>,
});

/** Basit tip çizimleri (kart resmi). */
function TipCizimi({ tip }: { tip: string }) {
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full" aria-hidden>
      <path d="M4 44h72" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
      <rect x="8" y="10" width="4" height="34" fill="currentColor" />
      <rect x="68" y="10" width="4" height="34" fill="currentColor" />
      {tip === "surgulu" && (
        <>
          <rect x="14" y="14" width="52" height="27" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M2 43h66" stroke="var(--color-ac-kirmizi)" strokeWidth="2" />
          <path d="M30 27h-12m4-4-4 4 4 4" stroke="var(--color-ac-kirmizi)" strokeWidth="2" fill="none" />
        </>
      )}
      {tip === "konsol" && (
        <>
          <rect x="0" y="14" width="66" height="25" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M0 41h40" stroke="currentColor" strokeWidth="3" />
          <path d="M30 27h-12m4-4-4 4 4 4" stroke="var(--color-ac-kirmizi)" strokeWidth="2" fill="none" />
        </>
      )}
      {tip === "cift" && (
        <>
          <rect x="13" y="14" width="26" height="27" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="41" y="14" width="26" height="27" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M26 6a14 14 0 0 1 14 0" stroke="var(--color-ac-kirmizi)" strokeWidth="2" fill="none" />
        </>
      )}
      {tip === "tek" && (
        <>
          <rect x="13" y="14" width="54" height="27" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M14 6a26 26 0 0 1 26 4" stroke="var(--color-ac-kirmizi)" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
}

function DolguCizimi({ dolgu }: { dolgu: string }) {
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full" aria-hidden>
      <defs>
        <pattern id={`k-${dolgu}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v8M0 0h8" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        </pattern>
      </defs>
      <rect x="14" y="6" width="52" height="36" fill={dolgu === "sac" ? "currentColor" : dolgu === "kafes" ? `url(#k-${dolgu})` : "none"} fillOpacity={dolgu === "sac" ? 0.35 : 1} stroke="currentColor" strokeWidth="2.5" />
      {dolgu === "profil" && Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${19 + i * 5} 6v36`} stroke="currentColor" strokeWidth="2" />)}
      {dolgu === "panel" && (
        <>
          {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${18 + i * 5} 6v36`} stroke="currentColor" strokeWidth="1.2" />)}
          {[14, 24, 34].map((y) => <path key={y} d={`M14 ${y}h52`} stroke="currentColor" strokeWidth="1.2" />)}
        </>
      )}
    </svg>
  );
}

/** Araç kapısı planlayıcı: tip, dolgu, ölçü, renk ve aksesuar; canlı 3D ve fiyat. */
export function AracKapiPlanlayici() {
  const { kapi: k, teklif, guncelle, teklifGuncelle, sifirla } = useAracKapi();
  const ayarlar = useAyarlar((a) => a.ayarlar);
  const fiyat = useMemo(() => kapiFiyatlari(teklif, ayarlar), [teklif, ayarlar]);
  const s = useMemo(() => aracKapiHesapla(k, fiyat), [k, fiyat]);
  const kayitSayisi = useTeklifler((x) => x.liste.length);
  const [acik, setAcik] = useState(0);
  const [ayar, setAyar] = useState(false);
  const [detay, setDetay] = useState(false);
  const [liste, setListe] = useState(false);
  const [yeni, setYeni] = useState(false);
  const [sor, setSor] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [hazirlanan, setHazirlanan] = useState<"yazdir" | "indir" | null>(null);

  useEffect(() => {
    useAyarlar.persist.rehydrate();
    useAracKapi.persist.rehydrate();
    useTeklifler.persist.rehydrate();
  }, []);
  useEffect(() => {
    if (!kaydedildi) return;
    const z = setTimeout(() => setKaydedildi(false), 2000);
    return () => clearTimeout(z);
  }, [kaydedildi]);

  // Müşteri adı ya da satışçı eksikse önce sorar; sonra arşive kaydeder
  const kaydet = (m?: Musteri, satisci?: string) => {
    if (!m && (!teklif.musteri.ad.trim() || !teklif.satisci)) return setSor(true);
    const t = m ? { ...teklif, musteri: m, satisci: satisci ?? teklif.satisci } : teklif;
    if (m) teklifGuncelle((x) => void ((x.musteri = t.musteri), (x.satisci = t.satisci)));
    kapiTeklifiKaydet(k, t, ayarlar);
    setSor(false);
    setKaydedildi(true);
  };

  // Teklif çıktısı: ekrandaki 3D görüntü sayfaya eklenir, teklif arşive kaydedilir
  const cikti = async (tur: "yazdir" | "indir") => {
    if (hazirlanan) return;
    setHazirlanan(tur);
    try {
      const tarih = new Date();
      const no = teklif.teklifNo || yeniNo(tarih);
      kapiTeklifiKaydet(k, { ...teklif, teklifNo: no }, ayarlar, tarih);
      const tuval = document.querySelector<HTMLCanvasElement>("#arac-kapi-3d canvas");
      const resim = tuval ? tuval.toDataURL("image/jpeg", 0.9) : null;
      const html = aracKapiHtml({ k, t: { ...useAracKapi.getState().teklif, teklifNo: no }, ayarlar, no, tarih, resim });
      if (tur === "yazdir") await htmlYazdir(html);
      else await pdfIndir(html, `AC-Tel-Orgu-Kapi-Teklif-${no.replace(/^AC-/, "")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Teklif hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setHazirlanan(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <UstMenu
        baslik="Araç Kapısı Planlayıcı"
        kaydet={() => kaydet()}
        kayitli={!!teklif.teklifNo}
        kaydedildi={kaydedildi}
        yazdir={() => void cikti("yazdir")}
        hazirlanan={hazirlanan}
        bos={false}
        teklifler={() => setListe(true)}
        kayitSayisi={kayitSayisi}
        yeni={() => setYeni(true)}
        ayarlar={() => setAyar(true)}
      />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[46vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <div id="arac-kapi-3d" className="h-full w-full">
            <Sahne kapi={k} acik={acik} />
          </div>
          {/* Fiyat */}
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
            {teklif.fiyatlar && (
              <span className="cam pointer-events-auto flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold">
                <span title="Ayarlar'daki fiyat değişiklikleri bu teklifi etkilemez">🔒 {new Date(teklif.fiyatlar.tarih).toLocaleDateString("tr-TR")} fiyatları</span>
                <button
                  type="button"
                  onClick={() => confirm("Bu teklif güncel fiyatlarla yeniden hesaplansın mı?") && teklifGuncelle((x) => void (x.fiyatlar = null))}
                  className="rounded-full bg-white/10 px-2 py-0.5 font-bold hover:bg-white/20"
                >
                  Güncelle
                </button>
              </span>
            )}
            {[
              ["Ölçü", `${sayi(k.genislik)} × ${sayi(k.yukseklik)} m`],
              ["Kanat", `${sayi(s.alan)} m²`],
            ].map(([a, b]) => (
              <span key={a} className="cam whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold">
                <span className="text-[var(--metin-2)]">{a}</span> <b>{b}</b>
              </span>
            ))}
          </div>
          {/* Aç / kapat */}
          <div className="cam absolute bottom-3 left-3 z-20 flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold">
            <span>Kapalı</span>
            <input type="range" min={0} max={1} step={0.01} value={acik} onChange={(e) => setAcik(+e.target.value)} aria-label="Kapıyı aç / kapat" className="w-32 accent-[var(--color-ac-kirmizi)]" />
            <span>Açık</span>
          </div>
        </div>

        <aside className="ince-kaydirma flex flex-col gap-3 p-3 pb-8 sm:p-4 lg:order-1 lg:w-[460px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/10">
          <Adim no={1} baslik="Kapı tipi" ipucu="Kapı nasıl açılacak?">
            <div className="grid grid-cols-2 gap-2">
              {KAPI_TIPLERI.map((t) => (
                <Kart key={t.id} buyuk secili={k.tip === t.id} onClick={() => guncelle((x) => void (x.tip = t.id))} resim={<TipCizimi tip={t.id} />} ad={t.ad} alt={t.aciklama} />
              ))}
            </div>
          </Adim>

          <Adim no={2} baslik="Dolgu" ipucu="Kapının görünümü">
            <div className="grid grid-cols-4 gap-2">
              {KAPI_DOLGULARI.map((d) => (
                <Kart key={d.id} secili={k.dolgu === d.id} onClick={() => guncelle((x) => void (x.dolgu = d.id))} resim={<DolguCizimi dolgu={d.id} />} ad={d.ad} />
              ))}
            </div>
          </Adim>

          <Adim no={3} baslik="Ölçü" ipucu="Hazır ölçüden seçin ya da yazın">
            <div>
              <Etiket>Geçiş genişliği</Etiket>
              <Secici degerler={KAPI_GENISLIKLERI} secili={k.genislik} bicim={(v) => `${sayi(v)} m`} onChange={(v) => guncelle((x) => void (x.genislik = v))} />
            </div>
            <div>
              <Etiket>Yükseklik</Etiket>
              <Secici degerler={KAPI_YUKSEKLIKLERI} secili={k.yukseklik} bicim={(v) => `${sayi(v)} m`} onChange={(v) => guncelle((x) => void (x.yukseklik = v))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SayiGiris etiket="Genişlik (serbest)" adim={0.1} min={1} max={20} deger={k.genislik} onChange={(v) => guncelle((x) => void (x.genislik = v))} />
              <SayiGiris etiket="Yükseklik (serbest)" adim={0.1} min={0.8} max={4} deger={k.yukseklik} onChange={(v) => guncelle((x) => void (x.yukseklik = v))} />
            </div>
          </Adim>

          <Adim no={4} baslik="Renk" ipucu="Çerçeve ve dolgu rengi">
            <div className="flex flex-wrap gap-1.5">
              {DIREK_RENKLERI.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  title={r.kod}
                  onClick={() => guncelle((x) => void (x.renk = r.id))}
                  className={`cam flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-bold transition hover:bg-[var(--yuzey-2)] ${k.renk === r.id ? "secili" : ""}`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/30"
                    style={{ background: r.id === "galvaniz" ? "linear-gradient(135deg,#e3e9f0,#8f9bab)" : r.renk }}
                  />
                  {r.ad}
                </button>
              ))}
            </div>
          </Adim>

          <Adim no={5} baslik="Motor ve aksesuar" ipucu="Otomasyon ve hizmetler">
            <div className="cam divide-y divide-white/5 rounded-xl px-3 py-1">
              <Anahtar acik={k.motor} onChange={(v) => guncelle((x) => void (x.motor = v))}>
                {surgulu(k) ? "Sürgü motoru + 2 kumanda" : `Kanat kol motoru${k.tip === "cift" ? " (2 adet)" : ""}`}
              </Anahtar>
              <Anahtar acik={k.mizrak} onChange={(v) => guncelle((x) => void (x.mizrak = v))}>
                Mızrak uç (kanat üstü)
              </Anahtar>
              <Anahtar acik={k.fotosel} onChange={(v) => guncelle((x) => void (x.fotosel = v))}>
                Fotosel (çift)
              </Anahtar>
              <Anahtar acik={k.flasor} onChange={(v) => guncelle((x) => void (x.flasor = v))}>
                Flaşör lamba
              </Anahtar>
              {surgulu(k) && (
                <Anahtar acik={k.ray} onChange={(v) => guncelle((x) => void (x.ray = v))}>
                  {k.tip === "surgulu" ? "Ray ve beton temel" : "Konsol taşıyıcı temel"}
                </Anahtar>
              )}
              <Anahtar acik={k.montaj} onChange={(v) => guncelle((x) => void (x.montaj = v))}>
                Montaj
              </Anahtar>
            </div>
            <p className="text-xs text-[var(--metin-2)]">Fiyatlar Ayarlar → Araç kapısı bölümünden değiştirilir.</p>
          </Adim>
        </aside>
      </main>

      {ayar && <AyarPaneli ilkBolum="aracKapi" kapat={() => setAyar(false)} />}
      {liste && <TeklifListesi kapat={() => setListe(false)} />}
      {yeni && (
        <YeniTeklif
          kapat={() => setYeni(false)}
          ilkSatisci={teklif.satisci}
          baslat={(m, satisci) => sifirla(m, satisci)}
        />
      )}
      {sor && <MusteriSor musteri={teklif.musteri} satisci={teklif.satisci} kaydet={kaydet} kapat={() => setSor(false)} />}
      {detay && (
        <TeklifPenceresi
          teklifNo={teklif.teklifNo}
          gruplar={["Kapı", "Motor ve aksesuar", "Hizmet"]}
          kalemler={s.kalemler}
          araToplam={s.araToplam}
          kdv={s.kdv}
          toplam={s.toplam}
          kdvYuzde={fiyat.kdvYuzde}
          musteri={teklif.musteri}
          musteriDegistir={(m) => teklifGuncelle((x) => void (x.musteri = m))}
          satisci={teklif.satisci}
          satisciDegistir={(v) => teklifGuncelle((x) => void (x.satisci = v))}
          indir={() => void cikti("indir")}
          yazdir={() => void cikti("yazdir")}
          hazirlanan={hazirlanan}
          kaydet={() => kaydet()}
          whatsappMetni={() => aracKapiWhatsapp(k, teklif, ayarlar)}
          bos={false}
          kapat={() => setDetay(false)}
        />
      )}
    </div>
  );
}
