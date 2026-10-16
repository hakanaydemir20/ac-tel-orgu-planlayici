"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAyarlar, useEtkinAyarlar } from "@/lib/ayarlar";
import { hesapla } from "@/lib/hesap";
import { kenarOlcusuYaz } from "@/lib/serbest";
import { useTasarim } from "@/lib/store";
import { useTeklifler } from "@/lib/teklifler";
import { AyarPaneli } from "./AyarPaneli";
import { TeklifListesi } from "./TeklifListesi";
import { YeniTeklif } from "./YeniTeklif";
import { AraziAdimi, DirekAdimi, EkstraAdimi, TelAdimi, ZeminAdimi } from "./form/Adimlar";
import { FiyatOzeti } from "./FiyatOzeti";
import { teklifiKaydet, useTeklifCikti } from "./TeklifYazdir";
import { MusteriSor } from "./MusteriSor";
import { TemaDugmesi } from "./TemaDugmesi";
import { SoruCevap } from "./SoruCevap";
import type { Musteri } from "@/lib/tasarim";
import { varlik } from "@/lib/yol";

const Sahne = dynamic(() => import("./sahne/Sahne"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-[var(--metin-2)]">3D sahne hazırlanıyor…</div>
  ),
});

export function Tasarimci() {
  const tasarim = useTasarim((s) => s.tasarim);
  const guncelle = useTasarim((s) => s.guncelle);
  const ayarlar = useEtkinAyarlar(tasarim); // kayıtlı teklifte kendi (donmuş) fiyatları
  const sonuc = useMemo(() => hesapla(tasarim, ayarlar), [tasarim, ayarlar]);
  // 3D sahne yazarken takılmasın diye bir adım geriden gelebilir
  const sahneTasarim = useDeferredValue(tasarim);
  const sahneSonuc = useMemo(() => hesapla(sahneTasarim), [sahneTasarim]);
  const [ayar, setAyar] = useState(false);
  const [liste, setListe] = useState(false);
  const [yeni, setYeni] = useState(false);
  const kayitSayisi = useTeklifler((s) => s.liste.length);
  const cikti = useTeklifCikti(tasarim, sonuc);
  const [sor, setSor] = useState(false);
  const [sihirbaz, setSihirbaz] = useState(false);
  const [kaydedildi, setKaydedildi] = useState(false);

  // Müşteri adı yoksa önce onu sorar; varsa doğrudan arşive kaydeder
  const kaydet = (m?: Musteri) => {
    if (!m && !tasarim.musteri.ad.trim()) return setSor(true);
    if (m) guncelle((x) => void (x.musteri = m));
    teklifiKaydet(m ? { ...tasarim, musteri: m } : tasarim, sonuc, ayarlar);
    setSor(false);
    setKaydedildi(true);
  };
  useEffect(() => {
    if (!kaydedildi) return;
    const z = setTimeout(() => setKaydedildi(false), 2000);
    return () => clearTimeout(z);
  }, [kaydedildi]);

  // Kayıtlı fiyatları, son çizimi ve teklif listesini tarayıcıdan oku (sunucu çiziminden sonra)
  useEffect(() => {
    useAyarlar.persist.rehydrate();
    useTasarim.persist.rehydrate();
    useTeklifler.persist.rehydrate();
    // Başka sekmede kaydedilen teklif ve fiyatlar bu sekmede de güncellensin; yoksa
    // buradaki ilk yazma ötekinin kaydını ezer
    const esitle = (e: StorageEvent) => {
      if (e.key === "ac-tel-teklifler") useTeklifler.persist.rehydrate();
      if (e.key === "ac-tel-ayarlar") useAyarlar.persist.rehydrate();
    };
    window.addEventListener("storage", esitle);
    return () => window.removeEventListener("storage", esitle);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {/* Üst bar */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 sm:px-6">
        <Link href="/" title="Ana sayfa" className="rounded-lg bg-[#fff] px-2.5 py-1.5 shadow-[0_0_24px_-6px_rgba(10,132,198,0.8)] transition hover:scale-[1.03]">
          <Image src={varlik("/logo.png")} alt="AC Tel Örgü · ana sayfa" width={150} height={26} priority />
        </Link>
        <div className="hidden h-6 w-px bg-white/15 sm:block" />
        <h1 className="hidden text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--metin-2)] sm:block">
          Çit Planlayıcı
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setSihirbaz(true)}
            aria-label="Soru-cevap ile planla"
            title="Adım adım sorularla planla"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ac-mavi/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-ac-mavi/60 transition hover:bg-ac-mavi/35 sm:px-4"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-ac-mavi text-[10px] font-black text-white">?</span>
            <span className="hidden sm:inline">Soru-cevap</span>
          </button>
          <button
            type="button"
            onClick={() => kaydet()}
            disabled={!sonuc.kenarlar.length}
            aria-label={tasarim.teklifNo ? "Kaydı güncelle" : "Teklifi kaydet"}
            className={`cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] disabled:opacity-60 sm:px-4 ${kaydedildi ? "text-emerald-300 ring-1 ring-emerald-400/60" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              {kaydedildi ? (
                <path d="m5 12 5 5L20 7" strokeLinecap="round" />
              ) : (
                <path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7" />
              )}
            </svg>
            <span className="hidden sm:inline">{kaydedildi ? "Kaydedildi" : tasarim.teklifNo ? "Kaydı güncelle" : "Kaydet"}</span>
          </button>
          <button
            type="button"
            onClick={cikti.yazdir}
            disabled={!!cikti.hazirlanan || !sonuc.kenarlar.length}
            aria-label="Teklif yazdır"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ac-kirmizi px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[0_6px_20px_-6px_var(--color-ac-kirmizi)] transition hover:bg-ac-kirmizi-acik disabled:opacity-60 sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
              <rect x="6" y="14" width="12" height="7" />
            </svg>
            <span className="hidden sm:inline">{cikti.hazirlanan === "yazdir" ? "Hazırlanıyor…" : "Teklif yazdır"}</span>
          </button>
          <button
            type="button"
            onClick={() => setListe(true)}
            aria-label="Kayıtlı teklifler"
            className="cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M4 4h11l5 5v11H4z" />
              <path d="M14 4v6h6M8 14h8M8 17h5" />
            </svg>
            <span className="hidden sm:inline">Teklifler</span>
            {kayitSayisi > 0 && <span className="rounded-full bg-ac-kirmizi px-1.5 text-[10px] leading-4">{kayitSayisi}</span>}
          </button>
          <button
            type="button"
            onClick={() => setYeni(true)}
            className="cam whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            + Yeni<span className="hidden sm:inline"> teklif</span>
          </button>
          <button
            type="button"
            onClick={() => setAyar(true)}
            aria-label="Ayarlar"
            className="cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            <span className="hidden sm:inline">Ayarlar</span>
          </button>
          <TemaDugmesi />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 3D — telefonda üstte, masaüstünde sağda */}
        <div className="relative h-[46vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <Sahne tasarim={sahneTasarim} sonuc={sahneSonuc} onKenarOlcu={(i, L) => guncelle((x) => kenarOlcusuYaz(x, i, L))} />

          <FiyatOzeti sonuc={sonuc} tasarim={tasarim} cikti={cikti} />
          <div className="pointer-events-none absolute bottom-3 right-3 hidden text-[11px] text-white/40 lg:block">
            Döndür: sürükle · Yakınlaş: tekerlek · Kaydır: sağ tık
          </div>
        </div>

        {/* Form */}
        <aside className="ince-kaydirma flex flex-col gap-3 p-3 pb-8 sm:p-4 sm:pb-8 lg:order-1 lg:w-[460px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/10">
          <ZeminAdimi />
          <AraziAdimi />
          <TelAdimi />
          <DirekAdimi
            ozet={{
              toplam: sonuc.sayilar.toplamDirek,
              kose: sonuc.sayilar.kose,
              gergi: sonuc.sayilar.gergi,
              payanda: sonuc.sayilar.payanda,
            }}
          />
          <EkstraAdimi />
        </aside>
      </main>

      {ayar && <AyarPaneli kapat={() => setAyar(false)} />}
      {liste && <TeklifListesi kapat={() => setListe(false)} />}
      {yeni && <YeniTeklif kapat={() => setYeni(false)} />}
      {sihirbaz && <SoruCevap kapat={() => setSihirbaz(false)} />}
      {sor && <MusteriSor musteri={tasarim.musteri} kaydet={kaydet} kapat={() => setSor(false)} />}
    </div>
  );
}
