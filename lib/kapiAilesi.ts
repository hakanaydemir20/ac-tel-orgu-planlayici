// Kapı planlayıcı aileleri: araç ve yaya kapısı aynı ekranı farklı seçeneklerle kullanır.
import { type AracKapi, type AracKapiTipi, type KapiAilesi, KAPI_GENISLIKLERI, KAPI_TIPLERI, KAPI_YUKSEKLIKLERI, YAYA_KAPI_TIPLERI, varsayilanAracKapi } from "./aracKapi";

export interface AileTanimi {
  id: KapiAilesi;
  baslik: string; // "Araç Kapısı Planlayıcı"
  kisa: string; // "Araç kapısı"
  ikon: string;
  yol: string; // sayfa yolu
  tipler: { id: AracKapiTipi; ad: string; aciklama: string }[];
  genislikler: (k: Pick<AracKapi, "tip">) => number[];
  yukseklikler: number[];
  enAz: number;
  /** Ayarlar'daki fiyat bölümü */
  ayarBolum: "aracKapi" | "yayaKapi";
  varsayilan: () => AracKapi;
}

export const AILELER: Record<KapiAilesi, AileTanimi> = {
  arac: {
    id: "arac",
    baslik: "Araç Kapısı Planlayıcı",
    kisa: "Araç kapısı",
    ikon: "🚪",
    yol: "/arac/",
    tipler: KAPI_TIPLERI,
    genislikler: (k) => KAPI_GENISLIKLERI.filter((g) => g <= (k.tip === "surgulu" || k.tip === "konsol" ? 12 : 10)),
    yukseklikler: KAPI_YUKSEKLIKLERI,
    enAz: 1,
    ayarBolum: "aracKapi",
    varsayilan: varsayilanAracKapi,
  },
  yaya: {
    id: "yaya",
    baslik: "Yaya Kapısı Planlayıcı",
    kisa: "Yaya kapısı",
    ikon: "🚶",
    yol: "/kapi/",
    tipler: YAYA_KAPI_TIPLERI,
    genislikler: (k) => (k.tip === "cift" ? [1.5, 2, 2.5, 3] : [0.9, 1, 1.2, 1.5]),
    yukseklikler: [1, 1.2, 1.5, 1.8, 2],
    enAz: 0.6,
    ayarBolum: "yayaKapi",
    varsayilan: () => ({ ...varsayilanAracKapi(), tip: "tek", genislik: 1, yukseklik: 2, motor: false, fotosel: false, ray: false, kilit: true }),
  },
};
