// PDF teklif için üstten arazi planı: ölçülü kenarlar, direkler, kapılar, ölçek çubuğu.
// Saf fonksiyon; SVG metni döner.
import { disNormal } from "./geometri";
import type { Sonuc } from "./hesap";
import { Tasarim, kenarHarfi, sekilNoktalari } from "./tasarim";

const LACIVERT = "#003a8c";
const KIRMIZI = "#d82628";
const sayi = (x: number, b = 1) => x.toLocaleString("tr-TR", { maximumFractionDigits: b });
const n2 = (x: number) => Math.round(x * 1000) / 1000;

export function planSvg(t: Tasarim, s: Sonuc): string {
  const { noktalar, kapali } = sekilNoktalari(t);
  if (noktalar.length < 2) return "";
  const poli = kapali ? noktalar : null;

  const xs = noktalar.map((p) => p[0]);
  const zs = noktalar.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const S = Math.max(x1 - x0, z1 - z0, 5);
  const fs = S * 0.034; // yazı
  // Görünüm alanı: şekil + kenar etiketleri; etiketler eklendikçe genişler (kutudan taşmasınlar)
  const sinir = [x0, z0, x1, z1];
  const kapsa = (ax: number, az: number, bx: number, bz: number) => {
    sinir[0] = Math.min(sinir[0], ax);
    sinir[1] = Math.min(sinir[1], az);
    sinir[2] = Math.max(sinir[2], bx);
    sinir[3] = Math.max(sinir[3], bz);
  };
  const cizgi = S * 0.0075;

  const parca: string[] = [];

  if (poli) parca.push(`<polygon points="${poli.map((p) => p.map(n2).join(",")).join(" ")}" fill="#e3f1e7"/>`);

  // Kenarlar: çit olan koyu, olmayan kesikli
  for (const k of s.kenarlar) {
    const [a, b] = [k.bas, k.son];
    parca.push(
      k.aktif
        ? `<line x1="${n2(a[0])}" y1="${n2(a[2])}" x2="${n2(b[0])}" y2="${n2(b[2])}" stroke="${LACIVERT}" stroke-width="${n2(cizgi)}" stroke-linecap="round"/>`
        : `<line x1="${n2(a[0])}" y1="${n2(a[2])}" x2="${n2(b[0])}" y2="${n2(b[2])}" stroke="#9aa5b4" stroke-width="${n2(cizgi * 0.6)}" stroke-dasharray="${n2(fs * 0.5)} ${n2(fs * 0.35)}"/>`
    );
  }

  // Kapılar: çizgide boşluk + kırmızı kanat çizgisi
  for (const g of s.kapilar) {
    const [a, b] = [g.a, g.b];
    parca.push(
      `<line x1="${n2(a[0])}" y1="${n2(a[2])}" x2="${n2(b[0])}" y2="${n2(b[2])}" stroke="#ffffff" stroke-width="${n2(cizgi * 1.8)}"/>`,
      `<line x1="${n2(a[0])}" y1="${n2(a[2])}" x2="${n2(b[0])}" y2="${n2(b[2])}" stroke="${KIRMIZI}" stroke-width="${n2(cizgi * 0.7)}" stroke-dasharray="${n2(fs * 0.3)} ${n2(fs * 0.2)}"/>`
    );
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
    const yon: [number, number] = [(b[0] - a[0]) / L, (b[2] - a[2]) / L];
    const orta: [number, number, number] = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
    const n = disNormal(orta, yon, poli);
    const d = -fs * 1.3; // kapı yazısı içeride
    parca.push(
      `<text x="${n2(orta[0] + n[0] * d)}" y="${n2(orta[2] + n[1] * d)}" font-size="${n2(fs * 0.75)}" fill="${KIRMIZI}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${
        g.kapi.tur === "arac" ? "Araç kapısı" : "Yaya kapısı"
      } ${sayi(g.kapi.genislik, 2)} m</text>`
    );
  }

  // Direkler
  for (const d of s.direkler) {
    const guclu = d.rol !== "ara";
    parca.push(
      `<circle cx="${n2(d.p[0])}" cy="${n2(d.p[2])}" r="${n2(guclu ? S * 0.0105 : S * 0.0062)}" fill="${guclu ? KIRMIZI : LACIVERT}" stroke="#fff" stroke-width="${n2(S * 0.002)}"/>`
    );
  }

  // Kenar ölçüleri (dışarıda)
  for (const k of s.kenarlar) {
    const orta: [number, number, number] = [(k.bas[0] + k.son[0]) / 2, 0, (k.bas[2] + k.son[2]) / 2];
    const yon: [number, number] = [(k.son[0] - k.bas[0]) / (k.yatay || 1), (k.son[2] - k.bas[2]) / (k.yatay || 1)];
    const n = disNormal(orta, yon, poli);
    const metin = `${sayi(k.gercek, 2)} m${Math.abs(k.egim) >= 0.5 ? ` · %${sayi(k.egim)}` : ""}${k.aktif ? "" : " (çit yok)"}`;
    const d = fs * 1.15 + Math.abs(n[0]) * metin.length * fs * 0.28;
    const [tx, ty] = [orta[0] + n[0] * d, orta[2] + n[1] * d];
    const yarim = metin.length * fs * 0.29;
    kapsa(tx - yarim - fs * 1.4, ty - fs * 0.75, tx + yarim, ty + fs * 0.75);
    parca.push(
      `<g font-weight="800" text-anchor="middle" dominant-baseline="middle">` +
        `<circle cx="${n2(tx - (metin.length * fs * 0.29 + fs * 0.75))}" cy="${n2(ty)}" r="${n2(fs * 0.62)}" fill="${KIRMIZI}"/>` +
        `<text x="${n2(tx - (metin.length * fs * 0.29 + fs * 0.75))}" y="${n2(ty + fs * 0.03)}" font-size="${n2(fs * 0.7)}" fill="#fff">${kenarHarfi(k.i)}</text>` +
        `<text x="${n2(tx)}" y="${n2(ty)}" font-size="${n2(fs)}" fill="${k.aktif ? "#0b1b33" : "#7d8aa0"}" paint-order="stroke" stroke="#fff" stroke-width="${n2(fs * 0.25)}">${metin}</text>` +
        `</g>`
    );
  }

  const pay = fs * 1.2;
  const vb = [sinir[0] - pay, sinir[1] - pay, sinir[2] - sinir[0] + 2 * pay, sinir[3] - sinir[1] + 2 * pay + fs * 2.4];

  // Ölçek çubuğu
  const olcek = [1, 2, 5, 10, 20, 50, 100, 200, 500].find((v) => v >= S / 6) ?? 500;
  const [ox, oy] = [vb[0] + fs, vb[1] + vb[3] - fs * 1.2];
  parca.push(
    `<g stroke="#0b1b33" stroke-width="${n2(S * 0.003)}">` +
      `<line x1="${n2(ox)}" y1="${n2(oy)}" x2="${n2(ox + olcek)}" y2="${n2(oy)}"/>` +
      `<line x1="${n2(ox)}" y1="${n2(oy - fs * 0.3)}" x2="${n2(ox)}" y2="${n2(oy + fs * 0.3)}"/>` +
      `<line x1="${n2(ox + olcek)}" y1="${n2(oy - fs * 0.3)}" x2="${n2(ox + olcek)}" y2="${n2(oy + fs * 0.3)}"/></g>` +
      `<text x="${n2(ox + olcek + fs * 0.5)}" y="${n2(oy)}" font-size="${n2(fs * 0.8)}" fill="#0b1b33" dominant-baseline="middle">${olcek} m</text>`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(n2).join(" ")}" width="100%" font-family="Helvetica, Arial, sans-serif">${parca.join("")}</svg>`;
}
