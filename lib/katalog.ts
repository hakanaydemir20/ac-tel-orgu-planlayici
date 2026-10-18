import { type AracKapiFiyatlari, VARSAYILAN_ARAC_KAPI_FIYAT } from "./aracKapiFiyat";
// Ürün kataloğu (ölçüler) ve varsayılan satış fiyatları.
// Satışçı fiyatları Ayarlar penceresinden değiştirir; değişiklikler cihazda saklanır.

export type TelTipiId = "kafes" | "panel" | "dikenli" | "tavuk";
export type DirekTipiId = "beton" | "profil" | "boru";
export type Kaplama = "galvaniz" | "pvc";
export type DirekRengi = "galvaniz" | "yesil" | "antrasit" | "siyah" | "beyaz";

/** Profil ve boru direk renkleri (beton direk boyanmaz). Galvaniz dışındakiler boyalıdır. */
export const DIREK_RENKLERI: { id: DirekRengi; ad: string; kod: string; renk: string }[] = [
  { id: "galvaniz", ad: "Galvaniz", kod: "boyasız", renk: "#b7c2cf" },
  { id: "yesil", ad: "Yeşil", kod: "RAL 6005", renk: "#1f5a3a" },
  { id: "antrasit", ad: "Antrasit", kod: "RAL 7016", renk: "#3a4048" },
  { id: "siyah", ad: "Siyah", kod: "RAL 9005", renk: "#17191c" },
  { id: "beyaz", ad: "Beyaz", kod: "RAL 9016", renk: "#eef1f3" },
];
export const direkRengi = (id: DirekRengi) => DIREK_RENKLERI.find((r) => r.id === id) ?? DIREK_RENKLERI[0];

export interface TelTipi {
  id: TelTipiId;
  ad: string;
  aciklama: string;
  yukseklikler: number[]; // m
  gozler: number[]; // mm
  kalinliklar: number[]; // mm
  kaplamalar: Kaplama[];
  varsayilanAralik: number; // direk aralığı, m
  gergiAraligi: number; // kaç metrede bir gergi direği, m
  satis: "rulo" | "panel";
  ruloBoyu: number; // m (rulo satışta)
  panelGenislik: number; // m (panel satışta)
  dikenliSira?: number; // sadece dikenli tel tipi için varsayılan sıra
}

export interface DirekTipi {
  id: DirekTipiId;
  ad: string;
  aciklama: string;
  olculer: string[]; // ara direk ölçüleri; köşe/gergi bir üst ölçü kullanır
  gomme: number; // toprağa girecek kısım, m
}

export const TEL_TIPLERI: TelTipi[] = [
  {
    id: "kafes",
    ad: "Kafes Tel",
    aciklama: "Klasik örme bahçe teli",
    yukseklikler: [1, 1.2, 1.5, 1.75, 2],
    gozler: [40, 50, 60],
    kalinliklar: [2, 2.5, 3, 3.5],
    kaplamalar: ["galvaniz", "pvc"],
    varsayilanAralik: 2.5,
    gergiAraligi: 25,
    satis: "rulo",
    ruloBoyu: 15,
    panelGenislik: 0,
  },
  {
    id: "panel",
    ad: "Panel Çit",
    aciklama: "Kaynaklı hazır panel",
    yukseklikler: [0.5, 0.75, 1, 1.2, 1.5, 2],
    gozler: [50, 55],
    kalinliklar: [4, 4.5, 5],
    kaplamalar: ["galvaniz", "pvc"],
    varsayilanAralik: 2.5,
    gergiAraligi: 0,
    satis: "panel",
    ruloBoyu: 0,
    panelGenislik: 2.5,
  },
  {
    id: "dikenli",
    ad: "Dikenli Tel",
    aciklama: "Sıra sıra dikenli tel (tarla)",
    yukseklikler: [1, 1.25, 1.5, 2],
    gozler: [250, 300],
    kalinliklar: [1.7, 2, 2.5],
    kaplamalar: ["galvaniz"],
    varsayilanAralik: 3,
    gergiAraligi: 50,
    satis: "rulo",
    ruloBoyu: 100,
    panelGenislik: 0,
    dikenliSira: 5,
  },
  {
    id: "tavuk",
    ad: "Tavuk / Hayvan Teli",
    aciklama: "Altıgen gözlü çiftlik teli",
    yukseklikler: [0.5, 1, 1.5, 2],
    gozler: [13, 25, 50],
    kalinliklar: [0.7, 0.9, 1],
    kaplamalar: ["galvaniz", "pvc"],
    varsayilanAralik: 2,
    gergiAraligi: 25,
    satis: "rulo",
    ruloBoyu: 25,
    panelGenislik: 0,
  },
];

export const DIREK_TIPLERI: DirekTipi[] = [
  {
    id: "beton",
    ad: "Beton Direk",
    aciklama: "Düz veya kaşlı beton",
    olculer: ["10x10", "12x12", "15x15"],
    gomme: 0.5,
  },
  {
    id: "profil",
    ad: "Profil Direk",
    aciklama: "Galvaniz kutu profil",
    olculer: ["40x40", "50x50", "60x60"],
    gomme: 0.5,
  },
  {
    id: "boru",
    ad: "Boru Direk",
    aciklama: "Yuvarlak galvaniz boru",
    olculer: ["Ø42", "Ø48", "Ø60"],
    gomme: 0.5,
  },
];

export interface FirmaBilgisi {
  ad: string;
  telefon: string;
  adres: string;
  eposta: string;
  web: string;
}

/** Satış fiyatları (hepsi KDV hariç) ve teklif altlığındaki firma bilgileri. */
export interface Ayarlar {
  firma: FirmaBilgisi;
  gecerlilikGun: number; // teklifin geçerlilik süresi
  satiscilar: string[]; // teklifi verebilecek firma satışçıları
  /** Tel tipi → yükseklik ("1.5") → ₺ / metre çit */
  telMetre: Record<Exclude<TelTipiId, "dikenli">, Record<string, number>>;
  /** Kafes tel ₺ / metretül: yükseklik ("1.5") → göz aralığı ("50") → tel kalınlığı ("2.5") */
  kafesMetre: Record<string, Record<string, Record<string, number>>>;
  pvcFarkYuzde: number; // PVC kaplamada tel fiyatına eklenen %
  dikenliMetre: number; // ₺ / metre (tek sıra dikenli tel)
  jiletliMetre: number; // eski kayıtlar için tek fiyat; artık çapa göre jiletliCapMetre
  /** Helezon jiletli spiral ₺ / metre çit, çapa (cm) göre */
  jiletliCapMetre: Record<string, number>;
  duzlemselMetre: number; // eski kayıtlar için tek fiyat; artık çapa göre duzlemselCapMetre
  /** Düzlemsel jiletli tel ₺ / metre çit, çapa (cm) göre */
  duzlemselCapMetre: Record<string, number>;
  /** Direk tipi → ölçü → ₺ / metre direk boyu */
  direkMetre: Record<DirekTipiId, Record<string, number>>;
  boyaFarkYuzde: number; // boyalı (galvaniz dışı renk) profil/boru direkte metre fiyatına eklenen %
  gergiTeliMetre: number; // ₺ / m
  gergiDemiri: number; // ₺ / adet
  kelepce: number; // ₺ / adet
  bagTeliKg: number; // ₺ / kg
  flansAdet: number; // ₺ / direk, beton zeminde demir direğin sabit temeli: flanş + kaynak işçiliği (boydan bağımsız)
  dubelAdet: number; // ₺ / adet, beton zeminde dübel
  dubelDirek: number; // beton zeminde direk başına dübel sayısı
  dubelPayanda: number; // beton zeminde payanda ayağı başına dübel sayısı
  kapiYaya: number; // ₺ / adet
  kapiArac: number; // ₺ / adet
  /** Araç kapısı planlayıcı fiyatları */
  aracKapi: AracKapiFiyatlari;
  montajMetre: number; // ₺ / m
  montajDuvarMetre: number; // ₺ / m, beton duvar üstüne montaj (iskele, kırım, dübel delme)
  temelDirek: number; // ₺ / direk
  nakliyeSabit: number; // ₺
  nakliyeKm: number; // ₺ / km
  kdvYuzde: number; // %
}

/** Fiyat tablolarındaki ölçü anahtarı: 1.5 → "1.5", 2.50 → "2.5" */
export const olcuAnahtari = (n: number) => String(Math.round(n * 100) / 100);

// Örnek fiyat dağılımı: 50 mm göz / 2,5 mm tel = yüksekliğin temel fiyatı.
// Sık göz ve kalın tel daha çok tel demek, daha pahalı.
const GOZ_KATSAYI: Record<string, number> = { "40": 1.15, "50": 1, "60": 0.9 };
const KALINLIK_KATSAYI: Record<string, number> = { "2": 0.8, "2.5": 1, "3": 1.25, "3.5": 1.5 };

/**
 * Yükseklik başına tek fiyattan kafes tel tablosu üretir. katsayili=false ise her göz/kalınlık
 * aynı fiyatı alır (eski, tek fiyatlı kayıtların fiyatı değişmesin diye).
 */
export function kafesTablosu(yukseklikFiyat: Record<string, number>, katsayili = true) {
  const kafes = TEL_TIPLERI[0];
  const tablo: Ayarlar["kafesMetre"] = {};
  for (const [h, f] of Object.entries(yukseklikFiyat)) {
    tablo[h] = {};
    for (const g of kafes.gozler.map(olcuAnahtari)) {
      tablo[h][g] = {};
      for (const k of kafes.kalinliklar.map(olcuAnahtari))
        tablo[h][g][k] = katsayili ? Math.round((f * (GOZ_KATSAYI[g] ?? 1) * (KALINLIK_KATSAYI[k] ?? 1)) / 5) * 5 : f;
    }
  }
  return tablo;
}

const KAFES_TEMEL = { "1": 95, "1.2": 115, "1.5": 145, "1.75": 165, "2": 190 };

export const VARSAYILAN_AYARLAR: Ayarlar = {
  firma: { ad: "AC Tel Örgü", telefon: "", adres: "", eposta: "", web: "" },
  gecerlilikGun: 15,
  satiscilar: ["Kaan", "Cengiz", "Ahmet", "Atilla"],
  telMetre: {
    kafes: KAFES_TEMEL, // eski kayıtlar için; kafes artık kafesMetre tablosundan fiyatlanır
    panel: { "0.5": 120, "0.75": 160, "1": 220, "1.2": 260, "1.5": 320, "2": 425 },
    tavuk: { "0.5": 20, "1": 40, "1.5": 60, "2": 80 },
  },
  kafesMetre: kafesTablosu(KAFES_TEMEL),
  pvcFarkYuzde: 25,
  dikenliMetre: 6.5,
  jiletliMetre: 110,
  jiletliCapMetre: { "30": 90, "45": 110, "60": 130, "90": 170 },
  duzlemselMetre: 140,
  duzlemselCapMetre: { "30": 110, "45": 125, "60": 140, "90": 180 },
  direkMetre: {
    beton: { "10x10": 70, "12x12": 95, "15x15": 140 },
    profil: { "40x40": 85, "50x50": 115, "60x60": 150 },
    boru: { Ø42: 80, Ø48: 100, Ø60: 135 },
  },
  boyaFarkYuzde: 15,
  gergiTeliMetre: 4,
  gergiDemiri: 35,
  kelepce: 8,
  bagTeliKg: 75,
  flansAdet: 180,
  dubelAdet: 25,
  dubelDirek: 4,
  dubelPayanda: 2,
  kapiYaya: 6500,
  kapiArac: 18000,
  aracKapi: VARSAYILAN_ARAC_KAPI_FIYAT,
  montajMetre: 60,
  montajDuvarMetre: 90,
  temelDirek: 120,
  nakliyeSabit: 1500,
  nakliyeKm: 25,
  kdvYuzde: 20,
};

/** Kaşlı direğin eğik kısmı, m */
export const KAS_UZUNLUK = 0.4;


export const telTipi = (id: TelTipiId) => TEL_TIPLERI.find((t) => t.id === id)!;
export const direkTipi = (id: DirekTipiId) => DIREK_TIPLERI.find((d) => d.id === id)!;

/** Köşe/gergi direkleri için bir üst ölçü (yoksa aynı ölçü). */
export function ustOlcu(tip: DirekTipi, olcu: string) {
  const i = tip.olculer.indexOf(olcu);
  return tip.olculer[Math.min(i + 1, tip.olculer.length - 1)] ?? olcu;
}
