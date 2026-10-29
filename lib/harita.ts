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

/**
 * Serbest yazılmış Türkçe adresten sırayla denenecek arama metinleri: önce aynen, sonra
 * kısaltmalar açılmış ve kapı no / sokak atılmış hâli, en sonda yalnız mahalle + ilçe / il.
 * Harita arama servisi "Mah.", "No:12" gibi ifadelerde sonuç vermediği için gerekli.
 */
export function aramaSorgulari(ham: string): string[] {
  const temiz = (s: string) => s.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "");
  const q = temiz(ham);
  if (!q) return [];
  const ac = temiz(
    q
      .replace(/\bmah(alle)?\.?(?=\s|,|$)/gi, "Mahallesi")
      .replace(/\bmh\.?(?=\s|,|$)/gi, "Mahallesi")
      .replace(/\bcad(de)?\.?(?=\s|,|$)/gi, "Caddesi")
      .replace(/\bcd\.?(?=\s|,|$)/gi, "Caddesi")
      .replace(/\b(sok(ak)?|sk)\.?(?=\s|,|$)/gi, "Sokak")
      .replace(/\bbulv?\.?(?=\s|,|$)/gi, "Bulvarı")
      .replace(/\b(no|numara)\s*[:.-]?\s*\d+[a-z]?(\s*\/\s*\d+)?/gi, "")
      .replace(/\b(kat|daire|d)\s*[:.]?\s*\d+/gi, "")
      .replace(/\s\d+[a-z]?(\s*\/\s*\d+)?(?=\s|,|$)/gi, " "),
  );
  // parçalar: virgül varsa virgülden, yoksa "Mahallesi / Caddesi / Sokak" sonrası bölünür
  const parca = (ac.includes(",") ? ac.split(",") : ac.split(/(?<=Mahallesi|Caddesi|Sokak|Bulvarı)\s+/)).map(temiz).filter(Boolean);
  const sokaksiz = parca.filter((p) => !/(Caddesi|Sokak|Bulvarı)$/i.test(p));
  const mahalle = sokaksiz.find((p) => /Mahallesi$/i.test(p));
  const geri = sokaksiz.filter((p) => p !== mahalle);
  const liste = [
    q,
    ac,
    sokaksiz.join(", "),
    mahalle ? [mahalle.replace(/\s*Mahallesi$/i, ""), ...geri].join(", ") : "",
    geri.join(", "),
  ];
  return [...new Set(liste.map(temiz).filter(Boolean))];
}
