// Kapı teknik resimleri (SVG): ölçülü ön görünüş, üstten görünüş, 45° gönye köşe detayı.
// Ölçüler 3D ile aynı hesaptan (lib/kapiYapi) gelir.
import { type AracKapi, type KapiAilesi, kanatBoyu, rayBoyu, surgulu } from "@/lib/aracKapi";
import { type KapiKanadi, KILIT_KUTUSU, kolYuksekligi, menteseYukseklikleri, MIZRAK_BOY, babaAdi, babaKesit, babaTipi, cerceveProfili, gommeBoyu, kanatliKolonBoyu, kapiKanatlari, surguluBabaYuksekligi } from "@/lib/kapiYapi";

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
  const Pm = babaKesit(k, aile);
  const kolonH = surgulu(k) ? surguluBabaYuksekligi(k, Pm) : kanatliKolonBoyu(k, aile);
  const gom = gommeBoyu(k);
  const W = 680;
  const s = Math.min((W - 200) / (L + 0.6), 300 / (kolonH + gom + 0.3));
  const yz = 40 + kolonH * s + 10;
  const x0 = 110;
  // zemin çizgisi ve toprak taraması
  let g = `<defs><pattern id="tp" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="${GRI}" stroke-width=".6"/></pattern></defs>`;
  g += `<rect x="20" y="${yz}" width="${W - 30}" height="${Math.max(8, gom * s + 10)}" fill="url(#tp)" opacity=".35"/>`;
  g += `<line x1="20" y1="${yz}" x2="${W - 10}" y2="${yz}" stroke="#1f2937" stroke-width="1.4"/>`;
  g += `<text x="24" y="${yz - 4}" font-size="8" fill="${GRI}">±0,00 zemin</text>`;
  const P = Pm * s;
  const boru = babaTipi(k) === "boru";
  // kanatların sol kenarı (kapı açıklığı x0 + kuyruk)
  const acikSol = x0 + (k.tip === "konsol" ? (L - k.genislik) * s : 0);
  // kolonlar
  const kolonXler: number[] = [];
  const kolon = (x: number) => {
    kolonXler.push(x);
    let r = `<rect x="${x - P / 2}" y="${yz - kolonH * s}" width="${P}" height="${kolonH * s}" fill="#dfe6ef" stroke="${LAC}" stroke-width="1.2"/>`;
    // boruda eksen çizgisi
    if (boru) r += `<line x1="${x}" y1="${yz - kolonH * s - 6}" x2="${x}" y2="${yz + gom * s + 6}" stroke="${GRI}" stroke-width=".4" stroke-dasharray="8 2 2 2"/>`;
    if (gom) {
      // toprak altındaki boy (kesik) ve beton temel
      r += `<rect x="${x - P / 2 - 0.1 * s}" y="${yz}" width="${P + 0.2 * s}" height="${(gom + 0.05) * s}" fill="#e5e7eb" stroke="${GRI}" stroke-width=".6"/>`;
      r += `<rect x="${x - P / 2}" y="${yz}" width="${P}" height="${gom * s}" fill="none" stroke="${LAC}" stroke-width=".9" stroke-dasharray="4 2"/>`;
    } else r += `<rect x="${x - P}" y="${yz - 0.012 * s}" width="${P * 2}" height="${0.012 * s}" fill="${LAC}"/>`;
    return r;
  };
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
  // Menteşeler ve kapı kolu (kanatlı kapılar)
  const detayIsareti = (x: number, y: number, r: number, harf: string) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${KIR}" stroke-width=".8" stroke-dasharray="3 2"/><text x="${x + r * 0.75}" y="${y - r * 0.75}" font-size="10" font-weight="800" fill="${KIR}">${harf}</text>`;
  let menteseOlcu = "";
  if (!surgulu(k)) {
    const my = menteseYukseklikleri(k, aile);
    const sol0 = k.tip === "cift" ? acikSol + 0.04 * s : acikSol + ((k.genislik - kn.w) / 2) * s;
    const menteseX = k.tip === "cift" ? [sol0, acikSol + k.genislik * s - 0.04 * s] : [sol0];
    for (const mx of menteseX)
      for (const y of my) {
        const py = yz - (kn.yerden + y) * s;
        g += `<rect x="${mx - 0.025 * s}" y="${py - 0.045 * s}" width="${0.05 * s}" height="${0.09 * s}" rx="1.5" fill="#1f2937" stroke="#111" stroke-width=".5"/>`;
      }
    // menteşe yükseklik ölçüleri (zeminden), solda
    const mxSol = menteseX[0] - P - 8;
    for (const y of my) {
      const py = yz - (kn.yerden + y) * s;
      menteseOlcu += `<line x1="${mxSol - 30}" y1="${py}" x2="${menteseX[0]}" y2="${py}" stroke="${GRI}" stroke-width=".4" stroke-dasharray="2 2"/>`;
    }
    // zincir ölçü: zemin → 1. menteşe → 2. menteşe …
    const zy = [0, ...my.map((y) => kn.yerden + y)];
    for (let i = 1; i < zy.length; i++) menteseOlcu += dikeyOlcu(mxSol - 34, yz - zy[i] * s, yz - zy[i - 1] * s, cm(zy[i] - zy[i - 1]), mxSol - 30, 7.5);
    g += detayIsareti(menteseX[0], yz - (kn.yerden + my.at(-1)!) * s, 0.13 * s, "M");
    if (k.kilit || k.elektrikliKilit) {
      const ky = yz - (kn.yerden + kolYuksekligi(k)) * s;
      const kx = sol0 + kn.w * s - 0.06 * s;
      const kw = (KILIT_KUTUSU.en / 1000) * s;
      const kh = (KILIT_KUTUSU.boy / 1000) * s;
      g += `<rect x="${kx - kw / 2}" y="${ky - kh * 0.3}" width="${kw}" height="${kh}" rx="1" fill="#374151" stroke="#111" stroke-width=".5"/>`;
      g += `<line x1="${kx}" y1="${ky}" x2="${kx - 0.12 * s}" y2="${ky}" stroke="#9ca3af" stroke-width="${Math.max(2, 0.018 * s)}" stroke-linecap="round"/>`;
      g += `<circle cx="${kx}" cy="${ky + kh * 0.35}" r="${Math.max(1.5, 0.01 * s)}" fill="#d4af37"/>`;
      g += detayIsareti(kx, ky + kh * 0.2, 0.16 * s, "K");
      g += dikeyOlcu(kx + 0.3 * s, ky, yz, cm(kn.yerden + kolYuksekligi(k)), kx + 4, 8);
      g += `<text x="${kx + 0.3 * s + 4}" y="${ky + 3}" font-size="7.5" fill="${KIR}" font-weight="700">kol</text>`;
    }
  }
  g += menteseOlcu;

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
  if (gom) {
    g += dikeyOlcu(sag + 74, yz, yz + gom * s, `toprak altı ${cm(gom)}`, sag, 8);
    g += `<text x="${sag + 80}" y="${yz + gom * s + 12}" font-size="8" fill="${KIR}" font-weight="700" text-anchor="end">kesim boyu ${cm(kolonH + gom)}</text>`;
  }
  // baba dıştan dışa genişlik
  if (kolonXler.length >= 2) {
    const a = Math.min(...kolonXler) - P / 2;
    const b = Math.max(...kolonXler) + P / 2;
    g += yatayOlcu(a, b, yz + gom * s + 34, `babalar dıştan dışa ${cm((b - a) / s)}`, yz + gom * s, yz + gom * s, 8);
  }
  // parça etiketleri (çıkış çizgili)
  const etiket = (x: number, y: number, tx: number, ty: number, yazi: string) =>
    `<circle cx="${x}" cy="${y}" r="1.6" fill="${LAC}"/><polyline points="${x},${y} ${tx},${ty} ${tx + (tx < x ? -4 : 4)},${ty}" fill="none" stroke="${LAC}" stroke-width=".6"/>` +
    `<text x="${tx + (tx < x ? -6 : 6)}" y="${ty + 3}" font-size="8.5" fill="${LAC}" font-weight="700" text-anchor="${tx < x ? "end" : "start"}">${yazi}</text>`;
  const solBaba = Math.min(...kolonXler);
  g += etiket(solBaba, yz - kolonH * s * 0.97, solBaba - 8, yz - kolonH * s - 14, `Baba: ${babaAdi(k, aile)}`.replace(/^(.{0,40}).*$/, "$1"));
  const C = cerceveProfili(aile);
  g += etiket(kx0 + kn.w * s * 0.3, kanatUst + C * s * 0.5, kx0 + kn.w * s * 0.3 + 24, ust - 26, `Çerçeve ${Math.round(C * 1000)}x${Math.round(C * 1000)} profil, köşeler 45°`);
  if (kn.ortaKusak) g += `<text x="${kx0 + 4}" y="${yz - (kn.yerden + kn.araKusakY) * s - 4}" font-size="8" fill="${GRI}">orta kuşak ${cm(kn.araKusakY)}</text>`;
  if (kn.dolguAdet) g += `<text x="${kx0 + kn.C * s + 3}" y="${kanatUst + kn.C * s + 11}" font-size="8" fill="${GRI}">dolgu eksen aralığı ${cm(kn.dolguAralik)}</text>`;
  return `<svg viewBox="0 0 ${W} ${yz + gom * s + 50}" xmlns="http://www.w3.org/2000/svg">${OK}${g}</svg>`;
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


/** Detay M: menteşe (yaya: ayarlı cıvatalı menteşe, araç: bayraklı kaynaklı menteşe). Ölçüler mm. */
export function menteseDetayi(aile: KapiAilesi) {
  const yaya = aile === "yaya";
  let g = `<text x="10" y="16" font-size="11" font-weight="800" fill="${KIR}">DETAY M</text><text x="78" y="16" font-size="8.5" fill="${GRI}">${yaya ? "ayarlı cıvatalı menteşe" : "bayraklı kaynaklı menteşe"} · ölçek 1:2</text>`;
  // Ön görünüş: kolon | menteşe | kanat çerçevesi
  g += `<rect x="20" y="30" width="34" height="120" fill="#dfe6ef" stroke="${LAC}" stroke-width="1.1"/><text x="37" y="162" font-size="7.5" fill="${GRI}" text-anchor="middle">baba</text>`;
  g += `<rect x="96" y="30" width="22" height="120" fill="#e8eef6" stroke="${LAC}" stroke-width="1.1"/><text x="107" y="162" font-size="7.5" fill="${GRI}" text-anchor="middle">kanat</text>`;
  if (yaya) {
    // kolona cıvatalı kelepçe + M12 ayar civatası + kanada kaynaklı kulak
    g += `<rect x="16" y="70" width="42" height="40" rx="3" fill="#374151" stroke="#111" stroke-width=".6"/>`;
    g += `<rect x="58" y="84" width="34" height="12" fill="#9ca3af" stroke="#111" stroke-width=".6"/>`;
    for (let x = 60; x < 90; x += 4) g += `<line x1="${x}" y1="84" x2="${x + 2}" y2="96" stroke="#111" stroke-width=".4"/>`;
    g += `<rect x="88" y="78" width="10" height="24" fill="#374151" stroke="#111" stroke-width=".6"/>`;
    g += yatayOlcu(58, 92, 128, "M12 ayar 30–50", 96, 96, 7.5);
    g += dikeyOlcu(12, 70, 110, "40", 16, 7.5);
    g += `<text x="128" y="70" font-size="8" fill="${LAC}">• Kelepçe babaya cıvatayla sıkılır</text><text x="128" y="82" font-size="8" fill="${LAC}">• M12 civata ile ±10 mm ayar</text><text x="128" y="94" font-size="8" fill="${LAC}">• Kulak kanada kaynaklı</text><text x="128" y="106" font-size="8" fill="${LAC}">• Galvaniz, kanat başına 2 adet</text>`;
  } else {
    // bayrak (kolona kaynaklı alt yarım) + pim gövdesi Ø48 + kanada kaynaklı üst yarım
    g += `<rect x="54" y="92" width="22" height="16" fill="#9ca3af" stroke="#111" stroke-width=".6"/>`;
    g += `<rect x="72" y="54" width="18" height="38" rx="3" fill="#374151" stroke="#111" stroke-width=".6"/><rect x="72" y="94" width="18" height="38" rx="3" fill="#374151" stroke="#111" stroke-width=".6"/>`;
    g += `<rect x="70" y="91" width="22" height="4" fill="#d4af37"/>`;
    g += `<rect x="86" y="62" width="10" height="16" fill="#9ca3af" stroke="#111" stroke-width=".6"/>`;
    g += dikeyOlcu(66, 54, 132, "160", 72, 7.5);
    g += yatayOlcu(72, 90, 146, "Ø48", 132, 132, 7.5);
    g += `<text x="128" y="70" font-size="8" fill="${LAC}">• Alt yarım babaya, üst yarım kanada kaynak</text><text x="128" y="82" font-size="8" fill="${LAC}">• Pirinç pul, gresörlük</text><text x="128" y="94" font-size="8" fill="${LAC}">• Kanat ağırlığına göre 2–3 adet</text><text x="128" y="106" font-size="8" fill="${LAC}">• Kaynak: 4 yandan, a=4</text>`;
  }
  return `<svg viewBox="0 0 300 172" xmlns="http://www.w3.org/2000/svg">${OK}${g}</svg>`;
}

/** Detay K: kilit kutusu, silindir ve kapı kolu. Ölçüler mm. */
export function kolDetayi(k: AracKapi) {
  const { en, boy } = KILIT_KUTUSU;
  const sk = 0.55; // px / mm
  const x0 = 40, y0 = 30;
  let g = `<text x="10" y="16" font-size="11" font-weight="800" fill="${KIR}">DETAY K</text><text x="78" y="16" font-size="8.5" fill="${GRI}">kilit kutusu ve kol · ölçek 1:4</text>`;
  g += `<rect x="${x0 + en * sk + 4}" y="${y0 - 10}" width="16" height="${boy * sk + 20}" fill="#e8eef6" stroke="${LAC}" stroke-width="1"/><text x="${x0 + en * sk + 12}" y="${y0 + boy * sk + 22}" font-size="7.5" fill="${GRI}" text-anchor="middle">kanat</text>`;
  g += `<rect x="${x0}" y="${y0}" width="${en * sk}" height="${boy * sk}" rx="2" fill="#374151" stroke="#111" stroke-width=".7"/>`;
  const ky = y0 + 70 * sk;
  g += `<rect x="${x0 + en * sk / 2 - 5}" y="${ky - 22}" width="10" height="${110 * sk}" rx="2" fill="#cbd5e1" stroke="#111" stroke-width=".5"/>`;
  g += `<line x1="${x0 + en * sk / 2}" y1="${ky}" x2="${x0 + en * sk / 2 - 120 * sk}" y2="${ky}" stroke="#9ca3af" stroke-width="6" stroke-linecap="round"/>`;
  g += `<circle cx="${x0 + en * sk / 2}" cy="${ky + 70 * sk}" r="5" fill="#d4af37" stroke="#111" stroke-width=".5"/>`;
  g += dikeyOlcu(x0 + en * sk + 34, y0, y0 + boy * sk, String(boy), x0 + en * sk + 20, 7.5);
  g += yatayOlcu(x0, x0 + en * sk, y0 + boy * sk + 14, String(en), y0 + boy * sk, y0 + boy * sk, 7.5);
  g += yatayOlcu(x0 + en * sk / 2 - 120 * sk, x0 + en * sk / 2, ky - 30, "kol 120", ky, ky, 7.5);
  const tx = x0 + en * sk + 44;
  g += [
    "• 65×85 kilit kutusu kanada kaynaklı",
    "• Silindir: 30/30 mm, 3 anahtar",
    "• Çift taraflı paslanmaz kol",
    "• Dil: 20 mm, karşılık babada",
    k.elektrikliKilit ? "• Elektrikli kilit 12 V + kart okuyucu" : "",
  ]
    .filter(Boolean)
    .map((t, i) => `<text x="${tx}" y="${y0 + 20 + i * 13}" font-size="8" fill="${LAC}">${t}</text>`)
    .join("");
  return `<svg viewBox="0 0 300 172" xmlns="http://www.w3.org/2000/svg">${OK}${g}</svg>`;
}
