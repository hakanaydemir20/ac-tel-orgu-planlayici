"use client";
import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useAyarlar, useEtkinAyarlar } from "@/lib/ayarlar";
import { hesapla } from "@/lib/hesap";
import { kenarOlcusuYaz, noktaTasi } from "@/lib/serbest";
import { useTasarim } from "@/lib/store";
import { useTeklifler } from "@/lib/teklifler";
import { AyarPaneli } from "./AyarPaneli";
import { TeklifListesi } from "./TeklifListesi";
import { YeniTeklif } from "./YeniTeklif";
import { AraziAdimi, DirekAdimi, EkstraAdimi, TelAdimi, ZeminAdimi } from "./form/Adimlar";
import { FiyatOzeti } from "./FiyatOzeti";
import { teklifiKaydet, useTeklifCikti } from "./TeklifYazdir";
import { MusteriSor } from "./MusteriSor";
import { UstMenu } from "./UstMenu";
import { SoruCevap } from "./SoruCevap";
import type { Musteri } from "@/lib/tasarim";

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
  // Müşteri adı ya da satışçı eksikse önce onları sorar
  const kaydet = (m?: Musteri, satisci?: string) => {
    if (!m && (!tasarim.musteri.ad.trim() || !tasarim.satisci)) return setSor(true);
    const yeni = m ? { ...tasarim, musteri: m, satisci: satisci ?? tasarim.satisci } : tasarim;
    if (m) guncelle((x) => void ((x.musteri = yeni.musteri), (x.satisci = yeni.satisci)));
    teklifiKaydet(yeni, sonuc, ayarlar);
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
      <UstMenu
        baslik="Çit Planlayıcı"
        soruCevap={() => setSihirbaz(true)}
        kaydet={() => kaydet()}
        kayitli={!!tasarim.teklifNo}
        kaydedildi={kaydedildi}
        yazdir={cikti.yazdir}
        hazirlanan={cikti.hazirlanan}
        bos={!sonuc.kenarlar.length}
        teklifler={() => setListe(true)}
        kayitSayisi={kayitSayisi}
        yeni={() => setYeni(true)}
        ayarlar={() => setAyar(true)}
      />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* 3D — telefonda üstte, masaüstünde sağda */}
        <div className="relative h-[46vh] shrink-0 lg:order-2 lg:h-auto lg:flex-1">
          <Sahne
            tasarim={sahneTasarim}
            sonuc={sahneSonuc}
            onKenarOlcu={(i, L) => guncelle((x) => kenarOlcusuYaz(x, i, L))}
            onNoktaTasi={(i, p) => guncelle((x) => noktaTasi(x, i, p))}
          />

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
      {sor && <MusteriSor musteri={tasarim.musteri} satisci={tasarim.satisci} kaydet={kaydet} kapat={() => setSor(false)} />}
    </div>
  );
}
