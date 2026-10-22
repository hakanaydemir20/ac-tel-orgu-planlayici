// Çit direği teknik resmi (teknik çizim kurallarına göre): ölçülü yan görünüş, kaş ve
// payanda açıları, birleşim detayı (Detay A) ve profil kesiti (Kesit B-B).
import { direkAcilari } from "@/lib/uretim";
import { direkBoyu, gommePayi, kasUzunlugu } from "@/lib/hesap";
import { direkTipi, ustOlcu } from "@/lib/katalog";
import type { Tasarim } from "@/lib/tasarim";

const CIZGI = "#0b1b33"; // görünür kenar
const OLCU = "#1f2937"; // ölçü çizgisi
const VURGU = "#d82628"; // açı ve detay işaretleri
const F = "font-family:Arial,Helvetica,sans-serif";
const tr = (n: number, b = 1) => (Math.round(n * 10 ** b) / 10 ** b).toLocaleString("tr-TR");
const cm = (m: number) => tr(m * 100, 1);

const TANIM = `<defs>
<marker id="tk" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1.2 8 4 0 6.8z" fill="${OLCU}"/></marker>
<pattern id="toprak" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v6" stroke="#8a7a66" stroke-width="1"/></pattern>
<pattern id="beton" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#7d8691"/><circle cx="6" cy="5" r=".5" fill="#7d8691"/><path d="M0 8 8 0" stroke="#9aa3ad" stroke-width=".5"/></pattern>
</defs>`;

/** Ölçü: iki nokta arası, kenardan d kadar ötelenmiş, uzatma çizgileri ve ortada yazı. */
function olcu(x1: number, y1: number, x2: number, y2: number, d: number, yazi: string) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / L;
  const ny = (x2 - x1) / L;
  const [a1, b1, a2, b2] = [x1 + nx * d, y1 + ny * d, x2 + nx * d, y2 + ny * d];
  const aci = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const dondur = aci > 90 || aci < -90 ? aci + 180 : aci;
  const mx = (a1 + a2) / 2 + nx * 4;
  const my = (b1 + b2) / 2 + ny * 4;
  return `<g stroke="${OLCU}" stroke-width=".5">
<line x1="${x1 + nx * 2}" y1="${y1 + ny * 2}" x2="${a1 + nx * 3}" y2="${b1 + ny * 3}"/><line x1="${x2 + nx * 2}" y1="${y2 + ny * 2}" x2="${a2 + nx * 3}" y2="${b2 + ny * 3}"/>
<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" marker-start="url(#tk)" marker-end="url(#tk)"/></g>
<text x="${mx}" y="${my}" font-size="8.5" fill="${OLCU}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${dondur} ${mx} ${my})" style="${F};paint-order:stroke" stroke="#fff" stroke-width="2.5">${yazi}</text>`;
}

/** Açı yayı (merkez, yarıçap, iki yön açısı derece, SVG koordinatında) ve yazısı. */
function aciYayi(cx: number, cy: number, r: number, a1: number, a2: number, yazi: string) {
  const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x1, y1] = p(a1);
  const [x2, y2] = p(a2);
  const [tx, ty] = p((a1 + a2) / 2).map((v, i) => v + ((i === 0 ? Math.cos : Math.sin)(((a1 + a2) / 2) * (Math.PI / 180)) * 10));
  return `<path d="M${x1} ${y1} A${r} ${r} 0 0 ${a2 > a1 ? 1 : 0} ${x2} ${y2}" fill="none" stroke="${VURGU}" stroke-width=".8" marker-end="url(#tk)"/>
<text x="${tx}" y="${ty}" font-size="9" font-weight="700" fill="${VURGU}" text-anchor="middle" dominant-baseline="middle" style="${F}">${yazi}</text>`;
}

/** Eksen çizgisi (kesik-nokta). */
const eksen = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b7280" stroke-width=".5" stroke-dasharray="10 2.5 2 2.5"/>`;

/** Belirli kalınlıkta, a'dan b'ye uzanan profil (iki uç kesim çizgileriyle). */
function profil(ax: number, ay: number, bx: number, by: number, w: number, dolgu = "#eef2f7") {
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / L) * (w / 2);
  const ny = ((bx - ax) / L) * (w / 2);
  return `<path d="M${ax + nx} ${ay + ny} L${bx + nx} ${by + ny} L${bx - nx} ${by - ny} L${ax - nx} ${ay - ny} Z" fill="${dolgu}" stroke="${CIZGI}" stroke-width="1.5" stroke-linejoin="miter"/>`;
}

/**
 * Direk teknik resmi: sol yan görünüş (ölçülü, açılarla), sağda Detay A (kaş birleşimi, gönye
 * açıları) ve Kesit B-B (profil / boru kesiti).
 */
export function direkTeknikResim(t: Tasarim) {
  const dt = direkTipi(t.direk.tip);
  const A = direkAcilari(t);
  const boru = dt.id === "boru";
  const beton = dt.id === "beton";
  const H = t.tel.yukseklik;
  const gom = gommePayi(t);
  const kas = kasUzunlugu(t);
  const ayriKol = t.direk.kasli && t.direk.kasTipi !== "duz";
  const toplam = direkBoyu(t);
  const govde = toplam - (ayriKol ? kas : 0);
  const kesitM = parseFloat(t.direk.olcu.match(/\d+(\.\d+)?/)?.[0] ?? "40") / (beton ? 100 : 1000);

  // Yan görünüş ölçeği
  const s = 230 / (govde + (ayriKol ? kas : 0) * 0.9 + 0.1);
  const gx = 130; // direk ekseni
  const gy = 30 + (govde - gom + (ayriKol ? kas * Math.cos((A.kasAci * Math.PI) / 180) : 0)) * s + 8; // zemin
  const pw = Math.max(9, kesitM * s);
  const altY = gy + gom * s;
  const ustY = gy - (govde - gom) * s;
  let g = "";
  // zemin
  g += `<rect x="20" y="${gy}" width="230" height="${Math.max(gom * s, 10) + 10}" fill="url(#${t.zemin === "toprak" ? "toprak" : "beton"})" opacity=".55"/><line x1="20" y1="${gy}" x2="250" y2="${gy}" stroke="${CIZGI}" stroke-width="1.2"/>`;
  if (t.zemin !== "toprak") g += `<rect x="${gx - pw * 1.6}" y="${gy - 3}" width="${pw * 3.2}" height="3" fill="#cbd2db" stroke="${CIZGI}" stroke-width=".8"/>`;
  else if (t.ekstra.temel) g += `<rect x="${gx - pw * 2}" y="${gy}" width="${pw * 4}" height="${gom * s}" fill="#d7dbe0" stroke="${CIZGI}" stroke-width=".6" stroke-dasharray="3 2"/>`;
  // direk gövdesi + eksen
  g += eksen(gx, altY + 8, gx, ustY - (ayriKol ? 0 : 14));
  g += `<rect x="${gx - pw / 2}" y="${ustY}" width="${pw}" height="${altY - ustY}" fill="#eef2f7" stroke="${CIZGI}" stroke-width="1.5"/>`;
  // kaş kolu
  let kasUcX = gx;
  let kasUcY = ustY;
  if (ayriKol) {
    const r = (A.kasAci * Math.PI) / 180;
    kasUcX = gx + Math.sin(r) * kas * s;
    kasUcY = ustY - Math.cos(r) * kas * s;
    g += profil(gx, ustY, kasUcX, kasUcY, pw);
    if (t.direk.kasTipi === "v") g += profil(gx, ustY, gx - Math.sin(r) * kas * s, kasUcY, pw);
    g += eksen(gx, ustY, gx, ustY - kas * s * 1.05); // dikey referans
    g += eksen(gx, ustY, kasUcX + (kasUcX - gx) * 0.1, kasUcY - (ustY - kasUcY) * 0.1);
    g += aciYayi(gx, ustY, kas * s * 0.55, -90, -90 + A.kasAci, `${A.kasAci}°`);
    g += olcu(gx, ustY, kasUcX, kasUcY, 16, `kaş ${cm(kas)}`);
    // Detay A işareti
    g += `<circle cx="${gx}" cy="${ustY}" r="${pw * 1.6}" fill="none" stroke="${VURGU}" stroke-width=".8" stroke-dasharray="3 2"/><text x="${gx - pw * 1.6 - 4}" y="${ustY - pw * 1.2}" font-size="10" font-weight="700" fill="${VURGU}" text-anchor="end" style="${F}">A</text>`;
  }
  // payanda (toprak/beton zeminde varsa)
  const payandaVar = t.tel.tip !== "panel" || (t.direk.kasli && t.direk.kasTipi === "egik");
  if (payandaVar && t.zemin !== "duvar") {
    const py = gy - H * 0.72 * s;
    const px = gx - H * 0.6 * s;
    g += profil(gx - pw / 2, py, px, gy, pw * 0.9, "#f4f6f9");
    g += aciYayi(gx - pw / 2, py, 28, 90, 90 + A.payandaAci, `${tr(A.payandaAci)}°`);
    g += `<text x="${px + 4}" y="${gy - 6}" font-size="7.5" fill="${OLCU}" style="${F}">payanda</text>`;
  }
  // ölçüler (sağda)
  const ox = gx + pw / 2;
  g += olcu(ox, gy, ox, ustY, -(64 + (ayriKol ? Math.sin((A.kasAci * Math.PI) / 180) * kas * s : 0)), `${cm(govde - gom)}`);
  if (gom) g += olcu(ox, altY, ox, gy, -(64 + (ayriKol ? Math.sin((A.kasAci * Math.PI) / 180) * kas * s : 0)), `${cm(gom)}`);
  g += olcu(gx - pw / 2, altY, gx - pw / 2, ustY, 34, `gövde ${cm(govde)}`);
  g += `<text x="20" y="18" font-size="10" font-weight="700" fill="${CIZGI}" style="${F}">YAN GÖRÜNÜŞ</text><text x="20" y="28" font-size="7.5" fill="#6b7280" style="${F}">${dt.ad} · ara ${t.direk.olcu} · köşe/gergi ${ustOlcu(dt, t.direk.olcu)} · ölçüler cm</text>`;

  // Detay A: birleşim, gönye açıları
  let d = "";
  if (ayriKol) {
    const dx = 345;
    const dy = 120;
    const w = 26;
    const r = (A.kasAci * Math.PI) / 180;
    const yarim = r / 2;
    // direk ucu: üst kenar yarım açıyla eğik
    const sol = [dx - w / 2, dy + 70];
    const sag = [dx + w / 2, dy + 70];
    // Gönye hattı iki eksenin açıortayına diktir: kol sağa yatınca hat sağa doğru alçalır
    const ustSol = [dx - w / 2, dy - Math.tan(yarim) * (w / 2)];
    const ustSag = [dx + w / 2, dy + Math.tan(yarim) * (w / 2)];
    d += `<path d="M${sol[0]} ${sol[1]} L${ustSol[0]} ${ustSol[1]} L${ustSag[0]} ${ustSag[1]} L${sag[0]} ${sag[1]}" fill="#eef2f7" stroke="${CIZGI}" stroke-width="1.5"/>`;
    // kol parçası
    const ux = Math.sin(r);
    const uy = -Math.cos(r);
    const k1 = [ustSol[0], ustSol[1]];
    const k2 = [ustSag[0], ustSag[1]];
    const Lk = 70;
    d += `<path d="M${k1[0]} ${k1[1]} L${k1[0] + ux * Lk} ${k1[1] + uy * Lk} L${k2[0] + ux * Lk} ${k2[1] + uy * Lk} L${k2[0]} ${k2[1]} Z" fill="#e2e8f0" stroke="${CIZGI}" stroke-width="1.5"/>`;
    // kaynak dikişi (gönye hattı)
    d += `<line x1="${k1[0]}" y1="${k1[1]}" x2="${k2[0]}" y2="${k2[1]}" stroke="${VURGU}" stroke-width="2.2"/>`;
    d += `<text x="${dx + w / 2 + 6}" y="${dy + 4}" font-size="8.5" font-weight="700" fill="${VURGU}" style="${F}">${tr((A.kasAci / 2) as number)}° gönye</text>`;
    d += `<text x="${dx + w / 2 + 6}" y="${dy + 15}" font-size="7.5" fill="${OLCU}" style="${F}">iki parça da ${tr(A.kasAci / 2)}° kesilir,</text>`;
    d += `<text x="${dx + w / 2 + 6}" y="${dy + 25}" font-size="7.5" fill="${OLCU}" style="${F}">dört yandan kaynak</text>`;
    // kaynak sembolü (köşe kaynağı, çevre)
    d += `<path d="M${dx - 52} ${dy - 10} l18 0 l6 -8" fill="none" stroke="${OLCU}" stroke-width=".6"/><path d="M${dx - 46} ${dy - 10} l4 -5 l4 5z" fill="${OLCU}"/><circle cx="${dx - 34}" cy="${dy - 10}" r="2.5" fill="none" stroke="${OLCU}" stroke-width=".6"/>`;
    d += eksen(dx, dy + 76, dx, dy - 40);
    d += `<text x="${dx - 70}" y="40" font-size="10" font-weight="700" fill="${CIZGI}" style="${F}">DETAY A</text><text x="${dx - 70}" y="50" font-size="7.5" fill="#6b7280" style="${F}">kaş birleşimi · ölçeksiz</text>`;
  } else {
    d += `<text x="275" y="40" font-size="10" font-weight="700" fill="${CIZGI}" style="${F}">DETAY A</text><text x="275" y="52" font-size="8" fill="${OLCU}" style="${F}">${t.direk.kasli ? "Düz kaş: direk tek parça, kesim düz." : "Kaşsız direk: alt ve üst uç düz kesim."}</text>`;
  }

  // Kesit B-B
  const kx = 560;
  const ky = 175;
  const kw = 46;
  let k = `<text x="${kx - 30}" y="40" font-size="10" font-weight="700" fill="${CIZGI}" style="${F}">KESİT B-B</text><text x="${kx - 30}" y="50" font-size="7.5" fill="#6b7280" style="${F}">${beton ? "beton direk" : boru ? "boru" : "kutu profil"} · ${t.direk.olcu}</text>`;
  if (boru) {
    k += `<circle cx="${kx}" cy="${ky - 60}" r="${kw / 2}" fill="#eef2f7" stroke="${CIZGI}" stroke-width="1.5"/><circle cx="${kx}" cy="${ky - 60}" r="${kw / 2 - 4}" fill="#fff" stroke="${CIZGI}" stroke-width="1"/>`;
    k += olcu(kx - kw / 2, ky - 60 + kw / 2 + 4, kx + kw / 2, ky - 60 + kw / 2 + 4, 10, t.direk.olcu);
  } else {
    k += `<rect x="${kx - kw / 2}" y="${ky - 60 - kw / 2}" width="${kw}" height="${kw}" fill="${beton ? "url(#beton)" : "#eef2f7"}" stroke="${CIZGI}" stroke-width="1.5"/>`;
    if (!beton) k += `<rect x="${kx - kw / 2 + 4}" y="${ky - 60 - kw / 2 + 4}" width="${kw - 8}" height="${kw - 8}" fill="#fff" stroke="${CIZGI}" stroke-width="1"/>`;
    k += olcu(kx - kw / 2, ky - 60 + kw / 2, kx + kw / 2, ky - 60 + kw / 2, 12, `${Math.round(kesitM * 1000)}`);
    k += olcu(kx + kw / 2, ky - 60 + kw / 2, kx + kw / 2, ky - 60 - kw / 2, 12, `${Math.round(kesitM * 1000)}`);
  }
  k += `<text x="${kx - 40}" y="${ky + 10}" font-size="7.5" fill="${OLCU}" style="${F}">Kaş ve payanda aynı malzeme:</text><text x="${kx - 40}" y="${ky + 20}" font-size="7.5" fill="${OLCU}" style="${F}">${beton ? "beton direkle dökümlü" : `${t.direk.olcu} ${boru ? "boru" : "profil"}`}</text>`;
  k += `<text x="${kx - 40}" y="${ky + 36}" font-size="7.5" fill="${OLCU}" style="${F}">Payanda kesimi:</text><text x="${kx - 40}" y="${ky + 46}" font-size="7.5" fill="${OLCU}" style="${F}">üst ${A.payandaUst.split(" ")[0]} · alt ${A.payandaAlt.split(" ")[0]}</text>`;

  const yuk = Math.max(gy + Math.max(gom * s, 10) + 28, 250);
  return `<svg viewBox="0 0 680 ${yuk}" xmlns="http://www.w3.org/2000/svg">${TANIM}${g}${d}${k}</svg>`;
}
