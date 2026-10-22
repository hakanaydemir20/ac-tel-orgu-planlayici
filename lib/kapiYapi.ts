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
  ortaKusak: boolean; // profil ve sac dolguda bölümleri yatayda ikiye ayıran kuşak
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
  return { w, h, C, alt, bolum, bw, ic, dikmeX, araKusakY: h * 0.5, ortaKusak: dolgu === "profil" || dolgu === "sac", dolguAdet, dolguAralik: dolguAdet ? (bw - C) / dolguAdet : 0 };
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
      ? [kanat("Sol kanat", W / 2 - 0.04, false, true, 0.1), kanat("Sağ kanat", W / 2 - 0.04, false, true, 0.1)]
      : [kanat("Sol kanat", W / 2 - 0.015, false, false, 0.06), kanat("Sağ kanat", W / 2 - 0.015, false, false, 0.06)];
  return yaya ? [kanat("Kanat", W - 0.05, false, true, 0.1)] : [kanat("Kanat", W - 0.015, false, false, 0.06)];
}

/** Sürgülü kapı babası yüksekliği: kanat üstü (mızrak ucu) + 5 cm + üst kuşak profili */
export const PORTAL_PROFIL = 0.08;
export const MIZRAK_BOY = 0.285;
export function surguluBabaYuksekligi(k: AracKapi) {
  const kanatAlt = k.tip === "konsol" ? 0.32 : 0.12;
  return kanatAlt + k.yukseklik + (k.mizrak ? MIZRAK_BOY : 0) + 0.05 + PORTAL_PROFIL;
}

/** Kanatlı kapıların kolon yüksekliği (zemin üstü) */
export const kanatliKolonBoyu = (k: AracKapi, aile: KapiAilesi) => k.yukseklik + (aile === "yaya" ? 0.28 : 0.15);

export { kanatBoyu, surgulu };
