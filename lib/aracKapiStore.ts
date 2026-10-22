"use client";
// Araç kapısı planlayıcıdaki güncel teklif: kapı tasarımı, müşteri, satışçı, numara ve
// (kaydedildiyse) o günün fiyatları. Bu cihazda saklanır.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type AracKapi, type AracKapiFiyatlari, type KapiAilesi, aracKapiHesapla } from "./aracKapi";
import { AILELER } from "./kapiAilesi";
import type { Ayarlar } from "./katalog";
import { birlestir } from "./birlestir";
import { type Musteri, bosMusteri, varsayilanTasarim } from "./tasarim";
import { teklifNo } from "./teklifKaydi";
import { useTeklifler } from "./teklifler";

/** Teklif verildiği andaki kapı fiyatları ve KDV. */
export interface AracKapiDonuk {
  tarih: string;
  aracKapi: AracKapiFiyatlari;
  kdvYuzde: number;
}

export interface AracKapiTeklifi {
  teklifNo: string;
  musteri: Musteri;
  satisci: string;
  fiyatlar: AracKapiDonuk | null;
}

const bosTeklif = (satisci = ""): AracKapiTeklifi => ({ teklifNo: "", musteri: bosMusteri(), satisci, fiyatlar: null });

interface Durum {
  kapi: AracKapi;
  teklif: AracKapiTeklifi;
  guncelle: (f: (k: AracKapi) => void) => void;
  teklifGuncelle: (f: (t: AracKapiTeklifi) => void) => void;
  /** Yeni teklif: kapı varsayılana döner, son satışçı kalır */
  sifirla: (musteri?: Musteri, satisci?: string) => void;
  yukle: (kapi: AracKapi, teklif: AracKapiTeklifi) => void;
}

/** Aileye özel store: her ailenin kendi kapısı ve teklifi ayrı saklanır. */
function storeOlustur(aile: KapiAilesi) {
  const varsayilanAracKapi = AILELER[aile].varsayilan;
  return create<Durum>()(
  persist(
    (set) => ({
      kapi: varsayilanAracKapi(),
      teklif: bosTeklif(),
      guncelle: (f) =>
        set((s) => {
          const k = structuredClone(s.kapi);
          f(k);
          return { kapi: k };
        }),
      teklifGuncelle: (f) =>
        set((s) => {
          const t = structuredClone(s.teklif);
          f(t);
          return { teklif: t };
        }),
      sifirla: (musteri, satisci) =>
        set((s) => ({ kapi: varsayilanAracKapi(), teklif: { ...bosTeklif(satisci ?? s.teklif.satisci), ...(musteri && { musteri: structuredClone(musteri) }) } })),
      yukle: (kapi, teklif) => set({ kapi: birlestir(varsayilanAracKapi(), structuredClone(kapi)), teklif: structuredClone(teklif) }),
    }),
    {
      name: aile === "arac" ? "ac-tel-arac-kapi" : "ac-tel-yaya-kapi",
      skipHydration: true,
      partialize: (s) => ({ kapi: s.kapi, teklif: s.teklif }),
      merge: (kayitli, mevcut) => {
        const k = kayitli as { kapi?: unknown; teklif?: unknown } | undefined;
        return { ...mevcut, kapi: birlestir(varsayilanAracKapi(), k?.kapi), teklif: birlestir(bosTeklif(), k?.teklif) };
      },
    },
  ),
  );
}

export const useAracKapi = storeOlustur("arac");
export const useYayaKapi = storeOlustur("yaya");
export const kapiStore = (aile: KapiAilesi) => (aile === "arac" ? useAracKapi : useYayaKapi);

/** Hesapta kullanılacak fiyatlar: teklif kaydedildiyse o günkü, değilse güncel Ayarlar. */
export function kapiFiyatlari(t: AracKapiTeklifi, ay: Ayarlar, aile: KapiAilesi = "arac") {
  return t.fiyatlar
    ? { aracKapi: t.fiyatlar.aracKapi, kdvYuzde: t.fiyatlar.kdvYuzde }
    : { aracKapi: aile === "yaya" ? ay.yayaKapi : ay.aracKapi, kdvYuzde: ay.kdvYuzde };
}

/** Kapı teklifini arşive kaydeder: ilk kayıtta numara verir ve fiyatları dondurur. Numarayı döner. */
export function kapiTeklifiKaydet(kapi: AracKapi, t: AracKapiTeklifi, ay: Ayarlar, aile: KapiAilesi = "arac", tarih = new Date()) {
  const no = t.teklifNo || teklifNo(tarih);
  const fiyatlar = t.fiyatlar ?? { tarih: tarih.toISOString(), aracKapi: structuredClone(aile === "yaya" ? ay.yayaKapi : ay.aracKapi), kdvYuzde: ay.kdvYuzde };
  if (!t.teklifNo || !t.fiyatlar)
    kapiStore(aile).getState().teklifGuncelle((x) => {
      x.teklifNo = no;
      x.fiyatlar = fiyatlar;
    });
  const s = aracKapiHesapla(kapi, { aracKapi: fiyatlar.aracKapi, kdvYuzde: fiyatlar.kdvYuzde }, aile);
  useTeklifler.getState().kaydet({
    no,
    tarih: tarih.toISOString(),
    musteri: t.musteri.ad.trim(),
    satisci: t.satisci,
    toplam: s.toplam,
    telUzunluk: 0,
    // Listede ortak alanlar (müşteri, satışçı) için çit tasarımı kalıbı; kapının kendisi aracKapi'de
    tasarim: { ...varsayilanTasarim(), teklifNo: no, musteri: t.musteri, satisci: t.satisci },
    tur: aile,
    aracKapi: kapi,
    aracFiyat: fiyatlar,
    kalemler: s.kalemler as never,
    araToplam: s.araToplam,
    kdv: s.kdv,
    kdvYuzde: fiyatlar.kdvYuzde,
    firma: ay.firma,
  });
  return no;
}
