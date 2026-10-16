// Kullanıcının girdiği tasarım ve arazi geometrisi.
import type { Ayarlar, DirekRengi, DirekTipiId, Kaplama, TelTipiId } from "./katalog";

export type SekilId = "duz" | "kare" | "dikdortgen" | "L" | "U" | "serbest";
export type Nokta2 = [number, number]; // x, z (m)
export type KapiTuru = "yaya" | "arac";
/** Kurulum alanı: toprakta direk gömülür, betonda flanşlı demir direk dübelle sabitlenir. */
export type Zemin = "toprak" | "beton";
/** egik: 45° dışa · duz: dik uzatma · v: iki yana 45° (V / Y kaş) */
export type KasTipi = "egik" | "duz" | "v";
export type UstTel = "yok" | "dikenli" | "jiletli" | "duzlemsel";

export interface Kapi {
  id: string;
  kenar: number; // kenar indeksi (0'dan)
  konum: number; // kenarın başından kapının başına, m
  tur: KapiTuru;
  genislik: number; // m
}

/** Satışçının elle çizdiği arazi: köşeler sırayla, metre cinsinden. */
export interface SerbestSekil {
  noktalar: Nokta2[];
  kapali: boolean;
}

export interface KenarAyar {
  aktif: boolean; // false → bu kenarda çit yok (duvar vb.)
  egim: number; // % (kenar boyunca yükselme)
}

/** Teklifin hazırlandığı müşteri (PDF başlığında görünür). */
export type MusteriTipi = "kisi" | "firma";

export interface Musteri {
  tip: MusteriTipi;
  ad: string; // kişide ad soyad, firmada firma unvanı
  yetkili: string; // firmada ilgili kişi
  telefon: string;
  eposta: string;
  adres: string;
  vergiDairesi: string;
  vergiNo: string;
  not: string;
}

export const bosMusteri = (): Musteri => ({
  tip: "kisi",
  ad: "",
  yetkili: "",
  telefon: "",
  eposta: "",
  adres: "",
  vergiDairesi: "",
  vergiNo: "",
  not: "",
});

/** Teklif verildiği andaki fiyatlar: Ayarlar sonradan değişse de teklif bunlarla hesaplanır. */
export interface DonukFiyat {
  tarih: string; // ISO
  ayarlar: Ayarlar;
}

export interface Tasarim {
  /** Kaydedilince verilir; aynı teklif tekrar kaydedilince kaydı güncellenir */
  teklifNo: string;
  /** null: güncel fiyatlar (Ayarlar). Teklif ilk kaydedildiğinde dondurulur. */
  fiyatlar: DonukFiyat | null;
  musteri: Musteri;
  /** Teklifi veren firma satışçısı (Ayarlar'daki listeden) */
  satisci: string;
  zemin: Zemin;
  sekil: SekilId;
  olculer: Record<"A" | "B" | "C" | "D", number>;
  serbest: SerbestSekil;
  kenarlar: KenarAyar[]; // eksik indeksler varsayılan ayarı kullanır
  tel: {
    tip: TelTipiId;
    yukseklik: number;
    goz: number;
    kalinlik: number;
    kaplama: Kaplama;
    sira: number; // dikenli tel sıra sayısı
  };
  direk: {
    tip: DirekTipiId;
    olcu: string;
    aralik: number;
    /** Kaç direkte bir payandalı gergi direği (0: yalnız köşe, uç ve kapı direklerinde) */
    payandaHer: number;
    kasli: boolean;
    /** Kaşın biçimi: eğik (45° dışa), düz (dik uzatma) ya da V (iki yana) */
    kasTipi: KasTipi;
    /** Profil / boru direk rengi (beton direkte kullanılmaz) */
    renk: DirekRengi;
  };
  ekstra: {
    ustTel: UstTel;
    ustSira: number;
    kapilar: Kapi[];
    montaj: boolean;
    temel: boolean;
    nakliye: boolean;
    nakliyeKm: number;
  };
}

export const KAPI_GENISLIK: Record<KapiTuru, number> = { yaya: 1, arac: 4 };

export const ZEMINLER: { id: Zemin; ad: string; aciklama: string }[] = [
  { id: "toprak", ad: "Toprak Arazi", aciklama: "Direk toprağa gömülür" },
  { id: "beton", ad: "Beton Zemin", aciklama: "Flanşlı demir direk + dübel" },
];

export const SEKILLER: { id: SekilId; ad: string; olculer: ("A" | "B" | "C" | "D")[] }[] = [
  { id: "duz", ad: "Düz Hat", olculer: ["A"] },
  { id: "kare", ad: "Kare", olculer: ["A"] },
  { id: "dikdortgen", ad: "Dikdörtgen", olculer: ["A", "B"] },
  { id: "L", ad: "L Şekli", olculer: ["A", "B", "C", "D"] },
  { id: "U", ad: "U Şekli", olculer: ["A", "B", "C", "D"] },
  { id: "serbest", ad: "Elle Çiz", olculer: [] },
];

export const OLCU_ADLARI: Record<SekilId, Partial<Record<"A" | "B" | "C" | "D", string>>> = {
  duz: { A: "Uzunluk" },
  kare: { A: "Kenar" },
  dikdortgen: { A: "En", B: "Boy" },
  L: { A: "En", B: "Boy", C: "Kesik en", D: "Kesik boy" },
  U: { A: "En", B: "Boy", C: "Boşluk eni", D: "Boşluk derinliği" },
  serbest: {},
};

export const varsayilanTasarim = (): Tasarim => ({
  teklifNo: "",
  fiyatlar: null,
  musteri: bosMusteri(),
  satisci: "",
  zemin: "toprak",
  sekil: "dikdortgen",
  olculer: { A: 30, B: 20, C: 10, D: 8 },
  serbest: { noktalar: [], kapali: false },
  kenarlar: Array.from({ length: 8 }, () => ({ aktif: true, egim: 0 })),
  tel: { tip: "kafes", yukseklik: 1.5, goz: 50, kalinlik: 2.5, kaplama: "galvaniz", sira: 5 },
  direk: { tip: "beton", olcu: "10x10", aralik: 2.5, payandaHer: 10, kasli: false, kasTipi: "egik", renk: "galvaniz" },
  ekstra: {
    ustTel: "yok",
    ustSira: 3,
    kapilar: [{ id: "k1", kenar: 0, konum: 13, tur: "arac", genislik: 4 }],
    montaj: true,
    temel: true,
    nakliye: true,
    nakliyeKm: 20,
  },
});

/** Şeklin köşe noktaları (x, z) ve kapalı olup olmadığı. */
export function sekilNoktalari({ sekil, olculer: o, serbest }: Pick<Tasarim, "sekil" | "olculer" | "serbest">): {
  noktalar: Nokta2[];
  kapali: boolean;
} {
  if (sekil === "serbest") {
    const noktalar = serbest.noktalar;
    return { noktalar, kapali: serbest.kapali && noktalar.length >= 3 };
  }
  const A = Math.max(o.A, 0.5);
  const B = Math.max(o.B, 0.5);
  const C = Math.min(Math.max(o.C, 0.5), A - 0.5);
  const D = Math.min(Math.max(o.D, 0.5), B - 0.5);
  let noktalar: Nokta2[];
  switch (sekil) {
    case "duz":
      return { noktalar: [[0, 0], [A, 0]], kapali: false };
    case "kare":
      noktalar = [[0, 0], [A, 0], [A, A], [0, A]];
      break;
    case "dikdortgen":
      noktalar = [[0, 0], [A, 0], [A, B], [0, B]];
      break;
    case "L":
      noktalar = [[0, 0], [A, 0], [A, B - D], [A - C, B - D], [A - C, B], [0, B]];
      break;
    case "U": {
      const s = (A - C) / 2;
      noktalar = [[0, 0], [A, 0], [A, B], [A - s, B], [A - s, B - D], [s, B - D], [s, B], [0, B]];
      break;
    }
  }
  return { noktalar, kapali: true };
}

export interface Kenar {
  i: number;
  bas: [number, number, number]; // x, y, z
  son: [number, number, number];
  yatay: number; // yatay uzunluk, m
  gercek: number; // eğimli gerçek uzunluk, m
  egim: number; // %
  aktif: boolean;
  otomatikEgim: boolean; // kapalı şekilde son kenarın eğimi diğerlerinden çıkar
}

/** Köşe yüksekliklerini eğimlerden hesaplayıp kenar listesini döner. */
export function kenarlariHesapla(t: Tasarim): Kenar[] {
  const { noktalar, kapali } = sekilNoktalari(t);
  if (noktalar.length < 2) return [];
  const n = kapali ? noktalar.length : noktalar.length - 1;
  const y: number[] = [0];
  const kenarlar: Kenar[] = [];
  for (let i = 0; i < n; i++) {
    const p = noktalar[i];
    const q = noktalar[(i + 1) % noktalar.length];
    const yatay = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const son = kapali && i === n - 1;
    const egim = son ? (yatay > 0 ? ((y[0] - y[i]) / yatay) * 100 : 0) : (t.kenarlar[i]?.egim ?? 0);
    y[i + 1] = son ? y[0] : y[i] + (egim / 100) * yatay;
    const dy = y[i + 1] - y[i];
    kenarlar.push({
      i,
      bas: [p[0], y[i], p[1]],
      son: [q[0], y[i + 1], q[1]],
      yatay,
      gercek: Math.hypot(yatay, dy),
      egim,
      aktif: t.kenarlar[i]?.aktif ?? true,
      otomatikEgim: son,
    });
  }
  return kenarlar;
}

export const kenarHarfi = (i: number) => String(i + 1);

/** Kenar ayarını döner; yoksa varsayılanla oluşturur (taslak üzerinde çağrılır). */
export function kenarAyari(t: Tasarim, i: number): KenarAyar {
  for (let j = t.kenarlar.length; j <= i; j++) t.kenarlar[j] = { aktif: true, egim: 0 };
  return t.kenarlar[i];
}
