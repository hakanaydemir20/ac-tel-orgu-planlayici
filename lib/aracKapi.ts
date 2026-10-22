// Araç kapısı planlayıcı: kapı tipi, dolgu, ölçü, renk ve aksesuarlardan fiyat hesabı (saf, test edilir).
import type { Ayarlar, DirekRengi } from "./katalog";
import { direkRengi } from "./katalog";
import type { AracKapiFiyatlari } from "./aracKapiFiyat";
export { type AracKapiFiyatlari, VARSAYILAN_ARAC_KAPI_FIYAT, VARSAYILAN_YAYA_KAPI_FIYAT } from "./aracKapiFiyat";

export type AracKapiTipi = "surgulu" | "konsol" | "cift" | "tek";
export type KapiDolgu = "profil" | "panel" | "kafes" | "sac";
/** Kapı ailesi: araç kapısı ya da yaya (personel) kapısı */
export type KapiAilesi = "arac" | "yaya";

export const KAPI_TIPLERI: { id: AracKapiTipi; ad: string; aciklama: string }[] = [
  { id: "surgulu", ad: "Raylı Sürgülü", aciklama: "Yerdeki ray üstünde yana kayar" },
  { id: "konsol", ad: "Konsol Sürgülü", aciklama: "Raysız, askılı; kuyruğu taşır" },
  { id: "cift", ad: "Çift Kanatlı", aciklama: "Ortadan iki kanat açılır" },
  { id: "tek", ad: "Tek Kanatlı", aciklama: "Tek büyük kanat açılır" },
];

export const KAPI_DOLGULARI: { id: KapiDolgu; ad: string; aciklama: string }[] = [
  { id: "profil", ad: "Dikey Profil", aciklama: "Aralıklı kutu profil çubuklar" },
  { id: "panel", ad: "Panel Tel", aciklama: "Panel çitle aynı görünüm" },
  { id: "kafes", ad: "Kafes Tel", aciklama: "Çerçeve içi örme tel" },
  { id: "sac", ad: "Dolu Sac", aciklama: "Kapalı, içi görünmez" },
];

export const KAPI_GENISLIKLERI = [3, 4, 5, 6, 8, 10, 12];
/** Kanatlı araç kapısı en fazla 10 m; raylı ve konsol 12 m'ye kadar */
export const azamiGenislik = (k: Pick<AracKapi, "tip">, aile: KapiAilesi = "arac") => (aile === "yaya" ? (k.tip === "cift" ? 4 : 2) : surgulu(k) ? 12 : 10);
export const KAPI_YUKSEKLIKLERI = [1.5, 1.8, 2, 2.5];

export interface AracKapi {
  tip: AracKapiTipi;
  dolgu: KapiDolgu;
  genislik: number; // geçiş açıklığı, m
  yukseklik: number; // m
  renk: DirekRengi;
  motor: boolean; // motor + 2 kumanda
  fotosel: boolean;
  flasor: boolean;
  ray: boolean; // sürgülüde ray / konsolda taşıyıcı temel
  mizrak: boolean; // kanat üstünde mızrak uçlar
  kilit: boolean; // silindir kilit + kol
  elektrikliKilit: boolean; // elektrikli kilit / kart okuyucu
  montaj: boolean;
}

export const varsayilanAracKapi = (): AracKapi => ({
  tip: "surgulu",
  dolgu: "panel",
  genislik: 5,
  yukseklik: 1.8,
  renk: "yesil",
  motor: true,
  fotosel: true,
  flasor: false,
  ray: true,
  mizrak: false,
  kilit: false,
  elektrikliKilit: false,
  montaj: true,
});

export const surgulu = (k: Pick<AracKapi, "tip">) => k.tip === "surgulu" || k.tip === "konsol";
/** Kanat boyu: konsol kapıda kuyruk (taşıyıcı kısım) açıklığın yarısı kadar uzar. */
export const kanatBoyu = (k: Pick<AracKapi, "tip" | "genislik">) => (k.tip === "konsol" ? k.genislik * 1.5 : k.genislik);
/** Ray / temel uzunluğu: raylıda kapı açılınca da üstünde durduğu için açıklığın iki katı; konsolda kuyruk boyu. */
export const rayBoyu = (k: Pick<AracKapi, "tip" | "genislik">) => (k.tip === "surgulu" ? k.genislik * 2 : k.tip === "konsol" ? k.genislik * 0.5 + 1 : 0);

export interface KapiKalem {
  grup: "Kapı" | "Motor ve aksesuar" | "Hizmet";
  ad: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  tutar: number;
}

const yuv = (n: number) => Math.round(n * 100) / 100;
const tr = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

/** Yaya kapısı tip adları (araçtaki tek/çift kanat ile aynı mekanizma). */
export const YAYA_KAPI_TIPLERI: { id: AracKapiTipi; ad: string; aciklama: string }[] = [
  { id: "tek", ad: "Tek Kanat Personel", aciklama: "İki kolon arasında tek kanat" },
  { id: "cift", ad: "Çift Kanat Yaya", aciklama: "Ortadan açılan iki kanat" },
];
export const tipAdi = (k: Pick<AracKapi, "tip">, aile: KapiAilesi) =>
  (aile === "yaya" ? YAYA_KAPI_TIPLERI : KAPI_TIPLERI).find((x) => x.id === k.tip)?.ad ?? KAPI_TIPLERI.find((x) => x.id === k.tip)!.ad;

/**
 * Kapı fiyat hesabı. Araç: m² + motor/aksesuar/ray. Yaya: m² + kilit / elektrikli kilit.
 * `ay.aracKapi`, ailenin fiyat tablosudur (yaya kapısında Ayarlar'daki yaya tablosu).
 */
export function aracKapiHesapla(k: AracKapi, ay: Pick<Ayarlar, "kdvYuzde"> & { aracKapi: AracKapiFiyatlari }, aile: KapiAilesi = "arac") {
  const f = ay.aracKapi;
  const tip = { ad: tipAdi(k, aile) };
  const dolgu = KAPI_DOLGULARI.find((x) => x.id === k.dolgu)!;
  const kalemler: KapiKalem[] = [];
  const ekle = (x: Omit<KapiKalem, "tutar">) => {
    if (x.miktar <= 0) return;
    kalemler.push({ ...x, miktar: yuv(x.miktar), tutar: Math.round(yuv(x.miktar) * x.birimFiyat) });
  };
  const alan = kanatBoyu(k) * k.yukseklik;
  const renk = direkRengi(k.renk);
  ekle({
    grup: "Kapı",
    ad: `${tip.ad}${aile === "yaya" ? " kapısı" : " kapı"} · ${dolgu.ad} · ${tr(k.genislik)} × ${tr(k.yukseklik)} m · ${renk.ad}${k.renk !== "galvaniz" ? ` (${renk.kod})` : ""}${k.tip === "konsol" ? ` · kanat ${tr(kanatBoyu(k))} m` : ""}`,
    miktar: alan,
    birim: "m²",
    birimFiyat: f.m2[k.tip]?.[k.dolgu] ?? 0,
  });
  const arac = aile === "arac";
  if (arac && k.motor)
    ekle(
      surgulu(k)
        ? { grup: "Motor ve aksesuar", ad: "Sürgü motoru + 2 kumanda", miktar: 1, birim: "takım", birimFiyat: f.motorSurgulu }
        : { grup: "Motor ve aksesuar", ad: "Kanat kol motoru (2 kumanda dahil)", miktar: k.tip === "cift" ? 2 : 1, birim: "adet", birimFiyat: f.motorKanat },
    );
  if (k.mizrak) ekle({ grup: "Kapı", ad: "Mızrak uç (kanat üstü)", miktar: kanatBoyu(k), birim: "m", birimFiyat: f.mizrakMetre });
  if (arac && k.fotosel) ekle({ grup: "Motor ve aksesuar", ad: "Fotosel (çift)", miktar: 1, birim: "takım", birimFiyat: f.fotosel });
  if (arac && k.flasor) ekle({ grup: "Motor ve aksesuar", ad: "Flaşör lamba", miktar: 1, birim: "adet", birimFiyat: f.flasor });
  if (arac && k.ray && surgulu(k))
    ekle({ grup: "Hizmet", ad: k.tip === "surgulu" ? "Ray ve beton temel" : "Konsol taşıyıcı beton temel", miktar: rayBoyu(k), birim: "m", birimFiyat: f.rayMetre });
  if (k.kilit) ekle({ grup: "Motor ve aksesuar", ad: "Silindir kilit + kol", miktar: 1, birim: "takım", birimFiyat: f.kilit });
  if (k.elektrikliKilit) ekle({ grup: "Motor ve aksesuar", ad: "Elektrikli kilit + kart okuyucu", miktar: 1, birim: "takım", birimFiyat: f.elektrikliKilit });
  if (k.montaj) ekle({ grup: "Hizmet", ad: "Kapı montajı", miktar: 1, birim: "adet", birimFiyat: f.montaj });

  const araToplam = kalemler.reduce((s, x) => s + x.tutar, 0);
  const kdv = Math.round((araToplam * ay.kdvYuzde) / 100);
  return { kalemler, araToplam, kdv, toplam: araToplam + kdv, alan: yuv(alan) };
}
