// Kapı teknik resimleri (SVG): ölçülü ön görünüş, üstten görünüş, 45° gönye köşe detayı.
// Ölçüler 3D ile aynı hesaptan (lib/kapiYapi) gelir.
import { type AracKapi, type KapiAilesi, kanatBoyu, rayBoyu, surgulu } from "@/lib/aracKapi";
import { type KapiKanadi, MIZRAK_BOY, kanatliKolonBoyu, kapiKanatlari, surguluBabaYuksekligi } from "@/lib/kapiYapi";

const KIR = "#d82628";
const LAC = "#003a8c";
const GRI = "#5b6b85";
const cm = (m: number) => (Math.round(m * 1000) / 10).toLocaleString("tr-TR");

const OK = `<defs><marker id="ko" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 6 3 0 6z" fill="${KIR}"/></marker></defs>`;

/** Yatay ölçü çizgisi (uzatma çizgileriyle). */
function yatayOlcu(x1: number, x2: number, y: number, yazi: string, ref1: number, ref2: number, f = 9) {
  return `<line x1="${x1}" y1="${ref1}" x2="${x1}" y2="${y + 3}" stroke="${GRI}" stroke-width=".5"/><line x1="${x2}" y1="${ref2}" x2="${x2}" y2="${y + 3}" stroke="${GRI}" stroke-width=".5"/>
<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${KIR}" stroke-width=".8" marker-start="url(#ko)" marker-end="url(#ko)"/>
<text x="${(x1 + x2) / 2}" y="${y - 3}" font-size="${f}" fill="${KIR}" font-weight="700" text-anchor="middle">${yazi}</text>`;
}
/** Dikey ölçü çizgisi. */
function dikeyOlcu(x: number, y1: number, y2: number, yazi: string, ref: number, f = 9) {
  return `<line x1="${ref}" y1="${y1}" x2="${x - 3}" y2="${y1}" stroke="${GRI}" stroke-width=".5"/><line x1="${ref}" y1="${y2}" x2="${x - 3}" y2="${y2}" stroke="${GRI}" stroke-width=".5"/>
<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${KIR}" stroke-width=".8" marker-start="url(#ko)" marker-end="url(#ko)"/>
<text x="${x - 4}" y="${(y1 + y2) / 2}" font-size="${f}" fill="${KIR}" font-weight="700" text-anchor="end" dominant-baseline="middle">${yazi}</text>`;
}

/** Bir kanadın ön görünüşü (sol alt köşe x0, zemin yz; s = px/m). */
function kanatOn(kn: KapiKanadi, x0: number, yz: number, s: number, k: AracKapi) {
  const { w, h, C, alt, dikmeX, ortaKusak, araKusakY, dolguAdet, dolguAralik, yerden } = kn;
  const X = (m: number) => x0 + m * s;
  const Y = (m: number) => yz - (yerden + m) * s;
  let g = `<rect x="${X(0)}" y="${Y(h)}" width="${w * s}" height="${h * s}" fill="none" stroke="${LAC}" stroke-width="1.6"/>`;
  g += `<rect x="${X(C)}" y="${Y(h - C)}" width="${(w - 2 * C) * s}" height="${(h - C - alt) * s}" fill="none" stroke="${LAC}" stroke-width=".8"/>`;
  // 45° gönye köşe çizgileri
  for (const [ax, ay, bx, by] of [
    [0, h, C, h - C],
    [w, h, w - C, h - C],
    [0, 0, C, alt],
    [w, 0, w - C, alt],
  ])
    g += `<line x1="${X(ax)}" y1="${Y(ay)}" x2="${X(bx)}" y2="${Y(by)}" stroke="${LAC}" stroke-width=".7"/>`;
  for (const dx of dikmeX.slice(1, -1)) g += `<rect x="${X(dx - C / 2)}" y="${Y(h - C)}" width="${C * s}" height="${(h - C - alt) * s}" fill="#e8eef6" stroke="${LAC}" stroke-width=".8"/>`;
  for (let b = 0; b < dikmeX.length - 1; b++) {
    const a0 = dikmeX[b] + C / 2;
    const a1 = dikmeX[b + 1] - C / 2;
    if (ortaKusak) g += `<rect x="${X(a0)}" y="${Y(araKusakY + 0.35 * C)}" width="${(a1 - a0) * s}" height="${0.7 * C * s}" fill="#e8eef6" stroke="${LAC}" stroke-width=".7"/>`;
    for (let i = 0; i < dolguAdet; i++) {
      const cx = dikmeX[b] + C / 2 + (i + 0.5) * dolguAralik;
      g += `<line x1="${X(cx)}" y1="${Y(h - C)}" x2="${X(cx)}" y2="${Y(alt)}" stroke="${GRI}" stroke-width="${Math.max(0.8, 0.03 * s)}"/>`;
    }
  }
  if (!dolguAdet && kn.h > 0)
    for (let x = C + 0.05; x < w - C; x += 0.05) g += `<line x1="${X(x)}" y1="${Y(h - C)}" x2="${X(x)}" y2="${Y(alt)}" stroke="${GRI}" stroke-width=".25"/>`;
  return g;
}

/** Ölçülü ön görünüş: kanat(lar), kolonlar/babalar, bölüm zincir ölçüsü, yükseklikler. */
export function kapiOnGorunus(k: AracKapi, aile: KapiAilesi) {
  const kanatlar = kapiKanatlari(k, aile);
  const kn = kanatlar[0];
  const L = k.tip === "konsol" ? kanatBoyu(k) : k.genislik;
  const kolonH = surgulu(k) ? surguluBabaYuksekligi(k) : kanatliKolonBoyu(k, aile);
  const W = 680;
  const s = Math.min((W - 160) / (L + 0.6), 300 / (kolonH + 0.3));
  const yz = 40 + kolonH * s + 10;
  const x0 = 90;
  let g = `<line x1="20" y1="${yz}" x2="${W - 10}" y2="${yz}" stroke="${GRI}" stroke-width="1"/>`;
  const P = (aile === "yaya" ? 0.07 : surgulu(k) ? 0.08 : 0.12) * s;
  // kanatların sol kenarı (kapı açıklığı x0 + kuyruk)
  const acikSol = x0 + (k.tip === "konsol" ? (L - k.genislik) * s : 0);
  // kolonlar
  const kolon = (x: number) => `<rect x="${x - P / 2}" y="${yz - kolonH * s}" width="${P}" height="${kolonH * s}" fill="#dfe6ef" stroke="${LAC}" stroke-width="1.2"/>`;
  g += kolon(acikSol - P / 2) + kolon(acikSol + k.genislik * s + P / 2);
  if (surgulu(k)) g += kolon(acikSol - P * 2.5) + `<rect x="${acikSol - P * 3}" y="${yz - kolonH * s}" width="${P * 3}" height="${0.08 * s}" fill="#dfe6ef" stroke="${LAC}"/>`;
  // kanatlar
  if (k.tip === "cift") {
    g += kanatOn(kanatlar[0], acikSol + 0.04 * s, yz, s, k);
    g += kanatOn(kanatlar[1], acikSol + (k.genislik / 2 + 0.0) * s, yz, s, k);
  } else g += kanatOn(kn, acikSol + (k.tip === "konsol" ? 0 : (k.genislik - kn.w) / 2) * s, yz, s, k);
  if (k.tip === "konsol") {
    const ky = yz - kn.yerden * s;
    g += `<line x1="${x0}" y1="${ky}" x2="${acikSol}" y2="${ky}" stroke="${LAC}" stroke-width="2.4"/><line x1="${x0}" y1="${ky}" x2="${acikSol}" y2="${ky - kn.h * s}" stroke="${LAC}" stroke-width="1.4"/>`;
    g += yatayOlcu(x0, acikSol, ky + 26, `kuyruk ${cm(L - k.genislik)}`, ky, ky, 8);
  }
  if (k.mizrak) {
    const ky = yz - (kn.yerden + kn.h) * s;
    for (let x = acikSol + 0.1 * s; x < acikSol + kn.w * s; x += 0.2 * s) g += `<line x1="${x}" y1="${ky}" x2="${x}" y2="${ky - MIZRAK_BOY * s}" stroke="${LAC}" stroke-width=".8"/>`;
  }
  // ölçüler
  const ust = yz - kolonH * s;
  g += yatayOlcu(acikSol, acikSol + k.genislik * s, yz + 22, `geçiş ${cm(k.genislik)} cm`, yz, yz);
  // bölüm zincir ölçüsü (ilk kanat)
  const kx0 = k.tip === "cift" ? acikSol + 0.04 * s : acikSol + (k.tip === "konsol" ? 0 : (k.genislik - kn.w) / 2) * s;
  const kanatUst = yz - (kn.yerden + kn.h) * s;
  if (kn.bolum > 1)
    for (let b = 0; b < kn.bolum; b++)
      g += yatayOlcu(kx0 + kn.dikmeX[b] * s, kx0 + kn.dikmeX[b + 1] * s, kanatUst - 12, cm(kn.dikmeX[b + 1] - kn.dikmeX[b]), kanatUst, kanatUst, 8);
  g += yatayOlcu(kx0, kx0 + kn.w * s, ust - 10, `kanat ${cm(kn.w)}`, kanatUst, kanatUst);
  const sag = acikSol + k.genislik * s + P + 14;
  g += dikeyOlcu(sag + 34, kanatUst, yz - kn.yerden * s, cm(kn.h), sag, 9);
  g += dikeyOlcu(sag + 34, yz - kn.yerden * s, yz, cm(kn.yerden), sag, 8);
  g += dikeyOlcu(sag + 74, ust, yz, `baba ${cm(kolonH)}`, sag, 9);
  if (kn.ortaKusak) g += `<text x="${kx0 + 4}" y="${yz - (kn.yerden + kn.araKusakY) * s - 4}" font-size="8" fill="${GRI}">orta kuşak ${cm(kn.araKusakY)}</text>`;
  if (kn.dolguAdet) g += `<text x="${kx0 + kn.C * s + 3}" y="${kanatUst + kn.C * s + 11}" font-size="8" fill="${GRI}">dolgu eksen aralığı ${cm(kn.dolguAralik)}</text>`;
  return `<svg viewBox="0 0 ${W} ${yz + 40}" xmlns="http://www.w3.org/2000/svg">${OK}${g}</svg>`;
}

/** Üstten görünüş: çit hattı, kolonlar, kanat; kanatlıda açılma yayı, sürgülüde ray ve park yeri. */
export function kapiUstGorunus(k: AracKapi, aile: KapiAilesi) {
  const W = k.genislik;
  const park = surgulu(k) ? kanatBoyu(k) : 0;
  const top = W + park + 1;
  const s = 320 / top;
  const x0 = 20 + (park + 0.4) * s;
  const yc = 70;
  let g = `<line x1="5" y1="${yc}" x2="${x0 - park * s - 10}" y2="${yc}" stroke="${GRI}" stroke-dasharray="4 3"/><line x1="${x0 + W * s + 12}" y1="${yc}" x2="335" y2="${yc}" stroke="${GRI}" stroke-dasharray="4 3"/>`;
  const p = 6;
  g += `<rect x="${x0 - p}" y="${yc - p / 2}" width="${p}" height="${p}" fill="${LAC}"/><rect x="${x0 + W * s}" y="${yc - p / 2}" width="${p}" height="${p}" fill="${LAC}"/>`;
  if (surgulu(k)) {
    g += `<rect x="${x0 - park * s}" y="${yc + 5}" width="${(W + park) * s}" height="2" fill="${GRI}"/>`;
    g += `<rect x="${x0 - (k.tip === "konsol" ? (kanatBoyu(k) - W) * s : 0)}" y="${yc + 2}" width="${kanatBoyu(k) * s}" height="4" fill="none" stroke="${LAC}" stroke-width="1.4"/>`;
    g += `<rect x="${x0 - park * s - (k.tip === "konsol" ? 0 : 0)}" y="${yc + 9}" width="${kanatBoyu(k) * s}" height="3" fill="none" stroke="${GRI}" stroke-dasharray="3 2"/>`;
    g += yatayOlcu(x0 - park * s, x0, yc + 30, `açılınca park ${cm(park)}`, yc + 12, yc + 12, 8);
    if (k.tip === "surgulu") g += `<text x="${x0 - park * s}" y="${yc - 10}" font-size="8" fill="${GRI}">ray ${cm(rayBoyu(k))} cm</text>`;
  } else {
    const kanatlar = kapiKanatlari(k, aile);
    if (k.tip === "tek") {
      const r = kanatlar[0].w * s;
      g += `<line x1="${x0}" y1="${yc}" x2="${x0 + r}" y2="${yc}" stroke="${LAC}" stroke-width="2"/><path d="M${x0 + r} ${yc} A${r} ${r} 0 0 1 ${x0} ${yc + r}" fill="none" stroke="${GRI}" stroke-dasharray="3 2"/>`;
    } else {
      const r = kanatlar[0].w * s;
      g += `<line x1="${x0}" y1="${yc}" x2="${x0 + r}" y2="${yc}" stroke="${LAC}" stroke-width="2"/><line x1="${x0 + W * s}" y1="${yc}" x2="${x0 + W * s - r}" y2="${yc}" stroke="${LAC}" stroke-width="2"/>`;
      g += `<path d="M${x0 + r} ${yc} A${r} ${r} 0 0 1 ${x0} ${yc + r}" fill="none" stroke="${GRI}" stroke-dasharray="3 2"/><path d="M${x0 + W * s - r} ${yc} A${r} ${r} 0 0 0 ${x0 + W * s} ${yc + r}" fill="none" stroke="${GRI}" stroke-dasharray="3 2"/>`;
    }
  }
  g += yatayOlcu(x0, x0 + W * s, yc - 26, cm(W), yc - 4, yc - 4, 8);
  return `<svg viewBox="0 0 340 ${surgulu(k) ? 120 : 70 + kapiKanatlari(k, aile)[0].w * s + 10}" xmlns="http://www.w3.org/2000/svg">${OK}${g}</svg>`;
}

/** Çerçeve köşesi 45° gönye kesim + kaynak detayı. */
export function goenyeDetayi(aile: KapiAilesi) {
  const p = aile === "yaya" ? 40 : 60;
  return `<svg viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">${OK}
<path d="M30 30 H170 V70 H70 V130 H30 Z" fill="#e8eef6" stroke="${LAC}" stroke-width="1.5"/>
<line x1="30" y1="30" x2="70" y2="70" stroke="${KIR}" stroke-width="2"/>
<path d="M36 34 l4 -4 M44 42 l4 -4 M52 50 l4 -4 M60 58 l4 -4" stroke="${KIR}" stroke-width="1.2"/>
<text x="78" y="56" font-size="10" fill="${KIR}" font-weight="700">45°</text>
<text x="100" y="92" font-size="9" fill="${LAC}" font-weight="700">${p}x${p} profil</text>
<text x="100" y="106" font-size="8" fill="${GRI}">Uçlar 45° gönye kesilir,</text>
<text x="100" y="118" font-size="8" fill="${GRI}">köşeden dört yanı kaynatılır.</text>
<text x="100" y="130" font-size="8" fill="${GRI}">Kesim boyu = dış ölçü.</text>
</svg>`;
}
