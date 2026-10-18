// Uydu haritasında işaretlenen köşeler (enlem/boylam) → planlayıcının yerel metre koordinatı.
import type { Nokta2, Tasarim } from "./tasarim";

export type EnlemBoylam = { lat: number; lng: number };

const M_ENLEM = 110540; // 1° enlem ≈ m
const M_BOYLAM = 111320; // ekvatorda 1° boylam ≈ m

/**
 * İlk köşeyi (0,0) alır; x doğuya, z güneye (ekranda aşağı) metre. Arazi ölçeğinde
 * (birkaç km'ye kadar) düzlem yaklaşımının hatası binde birden küçüktür. 10 cm'ye yuvarlar.
 */
export function enlemBoylamdanMetre(noktalar: EnlemBoylam[]): Nokta2[] {
  if (!noktalar.length) return [];
  const o = noktalar[0];
  const cos = Math.cos((o.lat * Math.PI) / 180);
  const yuv = (n: number) => Math.round(n * 10) / 10 || 0;
  return noktalar.map((p) => [yuv((p.lng - o.lng) * cos * M_BOYLAM), yuv(-(p.lat - o.lat) * M_ENLEM)]);
}

/** İki nokta arası yaklaşık uzaklık, m. */
export function mesafe(a: EnlemBoylam, b: EnlemBoylam) {
  const [, p] = enlemBoylamdanMetre([a, b]);
  return Math.hypot(p[0], p[1]);
}

/** İşaretlenen kapalı alanı tasarıma elle çizilmiş arazi olarak yazar (taslak üzerinde). */
export function uydudanUygula(x: Tasarim, noktalar: EnlemBoylam[]) {
  x.sekil = "serbest";
  x.serbest = { noktalar: enlemBoylamdanMetre(noktalar), kapali: true };
  x.kenarlar = Array.from({ length: Math.max(8, noktalar.length) }, () => ({ aktif: true, egim: 0 }));
  x.ekstra.kapilar = x.ekstra.kapilar.map((k) => ({ ...k, kenar: 0, konum: 0 }));
  x.konum = { lat: noktalar[0].lat, lng: noktalar[0].lng };
}
