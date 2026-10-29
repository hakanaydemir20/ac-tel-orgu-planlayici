// Kapı kanadının yapısal ölçüleri: 3D çizim, üretim kesim listesi ve teknik resim aynı
// hesaptan beslenir; ekranda görülen kapı ile üretilen kapı birebir aynıdır.
import { type AracKapi, type KapiAilesi, type KapiDolgu, kanatBoyu, surgulu } from "./aracKapi";

/** Kanat çerçeve profili (m): yaya kapısı 40x40, araç kapısı 60x60 */
export const cerceveProfili = (aile: KapiAilesi) => (aile === "yaya" ? 0.04 : 0.06);
export const ALT_KIRIS = 0.12; // raylı sürgülüde taşıyıcı alt kiriş yüksekliği
export const DOLGU_CUBUK = 0.03; // dikey profil dolgu çubuğu (30x30)
const BOLUM_EN_FAZLA = 2.5; // bir bölümün en fazla genişliği; aşılınca ara dikme konur
const DOLGU_ARALIK = 0.12; // dolgu çubukları yaklaşık eksen aralığı

export interface KanatYapisi {
  w: number;
  h: number;
  C: number; // çerçeve profili
  alt: number; // alt kuşak / kiriş yüksekliği
  bolum: number; // bölüm sayısı (ara dikme = bolum - 1)
  bw: number; // bölüm eksen aralığı
  ic: number; // iç (dolgu) yüksekliği
  dikmeX: number[]; // dikme eksenleri (soldan)
  araKusakY: number; // orta kuşak ekseni (kanat altından)
  ortaKusak: boolean; // yalnız sac dolguda; dikey profil dolguda ara kayıt yok, çubuklar tek parça
  dolguAdet: number; // bölüm başına dolgu çubuğu
  dolguAralik: number; // dolgu çubukları eksen aralığı
}

export function kanatYapisi(w: number, h: number, dolgu: KapiDolgu, altKiris: boolean, C: number): KanatYapisi {
  const bolum = Math.max(1, Math.ceil((w - 0.05) / BOLUM_EN_FAZLA));
  const bw = w / bolum;
  const alt = altKiris ? ALT_KIRIS : C;
  const ic = h - C - alt;
  const dikmeX = Array.from({ length: bolum + 1 }, (_, i) => Math.min(w - C / 2, Math.max(C / 2, i * bw)));
  const dolguAdet = dolgu === "profil" ? Math.max(2, Math.round((bw - C) / DOLGU_ARALIK)) : 0;
  return { w, h, C, alt, bolum, bw, ic, dikmeX, araKusakY: h * 0.5, ortaKusak: dolgu === "sac", dolguAdet, dolguAralik: dolguAdet ? (bw - C) / dolguAdet : 0 };
}

export interface KapiKanadi extends KanatYapisi {
  ad: string;
  duzPanel: boolean;
  yerden: number; // kanat altının zeminden yüksekliği
}

/** Kapı tipine göre kanatlar (3D'de çizilen kanatların aynısı). */
export function kapiKanatlari(k: AracKapi, aile: KapiAilesi): KapiKanadi[] {
  const W = k.genislik;
  const H = k.yukseklik;
  const C = cerceveProfili(aile);
  const yaya = aile === "yaya";
  const kanat = (ad: string, w: number, altKiris: boolean, duzPanel: boolean, yerden: number): KapiKanadi => ({
    ...kanatYapisi(w, H, k.dolgu, altKiris, C),
    ad,
    duzPanel,
    yerden,
  });
  if (k.tip === "surgulu") return [kanat("Sürgülü kanat", W, true, false, 0.12)];
  if (k.tip === "konsol") return [kanat("Uçan kapı kanadı (panelli kısım)", W, false, true, 0.32)];
  if (k.tip === "cift")
    return yaya
      ? [kanat("Sol kanat", W / 2 - 0.04, false, true, KANAT_YERDEN), kanat("Sağ kanat", W / 2 - 0.04, false, true, KANAT_YERDEN)]
      : [kanat("Sol kanat", W / 2 - 0.015, false, false, KANAT_YERDEN), kanat("Sağ kanat", W / 2 - 0.015, false, false, KANAT_YERDEN)];
  return yaya ? [kanat("Kanat", W - 0.05, false, true, KANAT_YERDEN)] : [kanat("Kanat", W - 0.015, false, false, KANAT_YERDEN)];
}

/** Menteşe eksen yükseklikleri (kanat altından, m): 3D, teknik resim aynı */
export const menteseYukseklikleri = (k: Pick<AracKapi, "yukseklik">, aile: KapiAilesi) => {
  const H = k.yukseklik;
  return aile === "yaya" ? [0.18, H - 0.18] : H > 1.6 ? [0.22, H / 2, H - 0.14] : [0.22, H - 0.14];
};
/** Kapı kolu / kilit kutusu yüksekliği (kanat altından, m) */
export const kolYuksekligi = (k: Pick<AracKapi, "yukseklik">) => Math.min(1.05, k.yukseklik * 0.55);
/** Kilit kutusu (mm) */
export const KILIT_KUTUSU = { en: 65, boy: 220, derinlik: 85 };

/** Kanatlı kapılarda kanat çerçevesi standart olarak zeminden 5 cm yukarıda başlar */
export const KANAT_YERDEN = 0.05;

// ---------- kapı babası (kolon) ----------

export const BABA_PROFILLERI = [60, 70, 80, 100, 120]; // kare kutu profil kenarı, mm
export const BABA_BORULARI = [60.3, 76.1, 88.9, 114.3]; // boru dış çapı, mm
/** Betona gömme modelde baba 50 cm toprak altında kalacak kadar uzun kesilir */
export const GOMME_BOY = 0.5;

const babaVarsayilan = (k: Pick<AracKapi, "tip">, aile: KapiAilesi) => (aile === "yaya" ? 70 : surgulu(k) ? 80 : 120);
export const babaTipi = (k: Pick<AracKapi, "babaTip">) => k.babaTip ?? "profil";
/** Seçili ölçü; listede yoksa (tip değişince) en yakın ölçüye çekilir */
export function babaOlcusu(k: Pick<AracKapi, "tip" | "babaTip" | "babaOlcu">, aile: KapiAilesi) {
  const liste = babaTipi(k) === "boru" ? BABA_BORULARI : BABA_PROFILLERI;
  const o = k.babaOlcu ?? babaVarsayilan(k, aile);
  return liste.reduce((a, b) => (Math.abs(b - o) < Math.abs(a - o) ? b : a));
}
/** Babanın kesit genişliği (m) */
export const babaKesit = (k: Pick<AracKapi, "tip" | "babaTip" | "babaOlcu">, aile: KapiAilesi) => babaOlcusu(k, aile) / 1000;
export const babaOlcuAdi = (tip: "profil" | "boru", o: number) =>
  tip === "boru" ? `Ø${String(o).replace(".", ",")} boru` : `${o}x${o} kutu profil`;
export const babaAdi = (k: Pick<AracKapi, "tip" | "babaTip" | "babaOlcu">, aile: KapiAilesi) => babaOlcuAdi(babaTipi(k), babaOlcusu(k, aile));
/** Toprak altında kalan ek boy */
export const gommeBoyu = (k: Pick<AracKapi, "montajTipi">) => (k.montajTipi === "flans" ? 0 : GOMME_BOY);

/** Sürgülü kapı babası yüksekliği: kanat üstü (mızrak ucu) + 5 cm + üst kuşak profili */
export const PORTAL_PROFIL = 0.08;
export const MIZRAK_BOY = 0.285;
export function surguluBabaYuksekligi(k: AracKapi, P = babaKesit(k, "arac")) {
  const kanatAlt = k.tip === "konsol" ? 0.32 : 0.12;
  return kanatAlt + k.yukseklik + (k.mizrak ? MIZRAK_BOY : 0) + 0.05 + P;
}

/** Kanatlı kapıların baba yüksekliği (zemin üstü): babanın üstü kapının üst bitimiyle (mızrak varsa uçlarıyla) aynı hizada */
export const kanatliKolonBoyu = (k: AracKapi, _aile?: KapiAilesi) => KANAT_YERDEN + k.yukseklik + (k.mizrak ? MIZRAK_BOY : 0);

export { kanatBoyu, surgulu };
