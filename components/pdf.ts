// PDF teklif: tek A4 dikey sayfalık HTML üretir; hem yazdırılır hem PDF dosyası olarak indirilir.
import type { Sonuc } from "@/lib/hesap";
import { direkBoyu, gommePayi, kasUzunlugu } from "@/lib/hesap";
import { Ayarlar, direkRengi, direkTipi, telTipi, ustOlcu } from "@/lib/katalog";
import { planSvg } from "@/lib/plan";
import { alan } from "@/lib/serbest";
import { SEKILLER, Tasarim, sekilNoktalari } from "@/lib/tasarim";
import { sayi, tl } from "./ui";
import { varlik } from "@/lib/yol";


/** Başlıkları Türkçe kuralla büyük yazar (CSS text-transform PDF indirmede "İ"yi bozuyor). */
export const B = (x: string) => x.toLocaleUpperCase("tr");

/** Kullanıcının yazdığı metni (müşteri, firma) HTML'e güvenle koyar. */
export const esc = (x: string) =>
  x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** WhatsApp ile gönderilecek kısa teklif metni. */
export function whatsappMetni(t: Tasarim, s: Sonuc, ay: Ayarlar) {
  const sekil = SEKILLER.find((x) => x.id === t.sekil)!.ad;
  return [
    `*${ay.firma.ad} – Çit Teklifi*`,
    ...(t.musteri.ad.trim() ? [`Sayın ${t.musteri.tip === "firma" && t.musteri.yetkili.trim() ? `${t.musteri.yetkili.trim()} (${t.musteri.ad.trim()})` : t.musteri.ad.trim()}`] : []),
    `Arazi: ${sekil}, ${{ toprak: "toprak arazi", beton: "beton zemin", duvar: `beton duvar üstü (${sayi(t.duvarYukseklik, 2)} m)` }[t.zemin]}, ${sayi(s.telUzunluk)} m çit`,
    `Tel: ${telTipi(t.tel.tip).ad}, ${sayi(t.tel.yukseklik, 2)} m, ${t.tel.goz} mm göz, ${sayi(t.tel.kalinlik)} mm`,
    `Direk: ${direkTipi(t.direk.tip).ad} ${t.direk.olcu}, ${sayi(t.direk.aralik, 2)} m aralık, ${s.sayilar.toplamDirek} adet`,
    "",
    ...s.kalemler.map((k) => `• ${k.ad}: ${sayi(k.miktar)} ${k.birim} – ${tl(k.tutar)}`),
    "",
    `Ara toplam: ${tl(s.araToplam)}`,
    `KDV: ${tl(s.kdv)}`,
    `*Toplam: ${tl(s.toplam)}*`,
    "",
    `Teklif ${ay.gecerlilikGun} gün geçerlidir.${ay.firma.telefon ? ` İletişim: ${ay.firma.telefon}` : ""}`,
    ...(t.satisci ? [`Teklifi veren: ${t.satisci} – ${ay.firma.ad}`] : []),
  ].join("\n");
}

export interface PdfGirdisi {
  t: Tasarim;
  s: Sonuc;
  ayarlar: Ayarlar;
  detayResim: string | null;
}

function ozellikler(t: Tasarim, s: Sonuc, ay: Ayarlar): [string, string][] {
  const tip = telTipi(t.tel.tip);
  const dt = direkTipi(t.direk.tip);
  const boy = direkBoyu(t);
  const gergiSira = tip.id === "kafes" || tip.id === "tavuk" ? (t.tel.yukseklik >= 1.5 ? 3 : 2) : 0;
  const satirlar: [string, string][] = [
    ["Kurulum alanı", { toprak: "Toprak arazi", beton: "Beton zemin", duvar: `Beton duvar üstü (${sayi(t.duvarYukseklik, 2)} m)` }[t.zemin]],
    ["Tel tipi", `${tip.ad}${t.tel.kaplama === "pvc" ? " · PVC yeşil" : " · galvaniz"}`],
    ["Çit yüksekliği", `${sayi(t.tel.yukseklik, 2)} m`],
    [tip.id === "dikenli" ? "Sıra sayısı / arası" : "Göz aralığı", tip.id === "dikenli" ? `${t.tel.sira} sıra · ${t.tel.goz} mm` : `${t.tel.goz} mm`],
    ["Tel kalınlığı", `${sayi(t.tel.kalinlik)} mm`],
    ["Direk", `${dt.ad}${dt.id !== "beton" ? ` · ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}${t.direk.renk !== "galvaniz" ? ` (${direkRengi(t.direk.renk).kod})` : ""}` : ""}${t.direk.kasli ? { egik: " · kaşlı (üstü eğik)", duz: " · kaşlı (üstü düz)", v: " · V kaşlı" }[t.direk.kasTipi] : ""}`],
    ["Direk ölçüsü", `ara ${t.direk.olcu} · köşe/gergi ${ustOlcu(dt, t.direk.olcu)}`],
    t.zemin !== "toprak"
      ? ["Direk boyu / sabitleme", `${sayi(boy, 2)} m · flanşlı, direk başına ${ay.dubelDirek} dübel`]
      : ["Direk boyu / gömme", `${sayi(boy, 2)} m · ${sayi(dt.gomme * 100, 0)} cm toprak altı`],
    ["Direk aralığı", `${sayi(t.direk.aralik, 2)} m`],
    ["Payanda", s.sayilar.payanda ? `${s.sayilar.payanda} adet (köşe, uç, gergi ve kapı direklerinde)` : "Yok"],
  ];
  if (gergiSira) satirlar.push(["Gergi teli", `${gergiSira} sıra`]);
  satirlar.push(["Direk adedi", `${s.sayilar.toplamDirek} (köşe ${s.sayilar.kose}, gergi ${s.sayilar.gergi}, ara ${s.sayilar.ara})`]);
  const hizmet = [t.ekstra.montaj && (t.zemin === "duvar" ? "duvar üstü montaj" : "montaj"), t.zemin === "toprak" && t.ekstra.temel && "beton temel", t.ekstra.nakliye && "nakliye"].filter(Boolean);
  satirlar.push(["Dahil hizmetler", hizmet.length ? hizmet.join(", ") : "Yok (yalnız malzeme)"]);
  if (t.konum) satirlar.push(["Konum (uydu)", `${t.konum.lat.toFixed(5)}, ${t.konum.lng.toFixed(5)}`]);
  if (t.ekstra.ustTel !== "yok")
    satirlar.push([
      "Üst tel",
      { dikenli: `Dikenli tel · ${t.ekstra.ustSira} sıra`, jiletli: `Helezon jiletli tel · Ø${t.ekstra.jiletliCap} cm`, duzlemsel: `Düzlemsel jiletli tel · Ø${t.ekstra.duzlemselCap} cm` }[t.ekstra.ustTel],
    ]);
  return satirlar;
}

export { teklifNo } from "@/lib/teklifKaydi";

// ---------- mini teknik resimler (müşteri kartları) ----------

const LAC = "#003a8c";
const KIR = "#d82628";
const GRI = "#5b6b85";
/** Ölçü oku: iki uçlu çizgi + yazı. */
const olcuOku = (x1: number, y1: number, x2: number, y2: number, yazi: string, dx = 0, dy = 0) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${KIR}" stroke-width="0.8" marker-start="url(#ok)" marker-end="url(#ok)"/>` +
  `<text x="${(x1 + x2) / 2 + dx}" y="${(y1 + y2) / 2 + dy}" font-size="7" fill="${KIR}" font-weight="700" text-anchor="middle">${yazi}</text>`;
const OK_TANIM = `<defs><marker id="ok" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 6 3 0 6z" fill="${KIR}"/></marker></defs>`;

/** Direk yan görünüşü: zemin, gömme / flanş, çit yüksekliği, kaş ve kesit. */
export function direkCizimi(t: Tasarim) {
  const dt = direkTipi(t.direk.tip);
  const kasL = kasUzunlugu(t);
  const gom = gommePayi(t);
  const H = t.tel.yukseklik;
  const top = H + gom + kasL;
  const k = 150 / Math.max(top, 2); // px / m
  const zY = 20 + (H + kasL) * k; // zemin çizgisi
  const x = 70;
  const w = 10;
  const renk = t.direk.tip === "beton" ? "#b9bec5" : direkRengi(t.direk.renk).renk;
  const kv = t.direk.kasTipi === "duz" ? { dx: 0, dy: 1 } : t.direk.tip === "beton" ? { dx: 0.5, dy: 0.866 } : { dx: 0.707, dy: 0.707 };
  const ust = zY - H * k;
  const kol = t.direk.kasli
    ? `<line x1="${x + w / 2}" y1="${ust}" x2="${x + w / 2 + kv.dx * kasL * k}" y2="${ust - kv.dy * kasL * k}" stroke="${GRI}" stroke-width="${w * 0.8}" stroke-linecap="square"/>` +
      `<line x1="${x + w / 2}" y1="${ust}" x2="${x + w / 2 + kv.dx * kasL * k}" y2="${ust - kv.dy * kasL * k}" stroke="${renk}" stroke-width="${w * 0.8 - 1.5}"/>` +
      (t.direk.kasTipi === "v"
        ? `<line x1="${x + w / 2}" y1="${ust}" x2="${x + w / 2 - kv.dx * kasL * k}" y2="${ust - kv.dy * kasL * k}" stroke="${GRI}" stroke-width="${w * 0.8}"/>`
        : "")
    : "";
  const altY = zY + gom * k;
  const kesitBoru = t.direk.tip === "boru";
  return `<svg viewBox="0 0 200 ${altY + 24}" xmlns="http://www.w3.org/2000/svg">${OK_TANIM}
  <rect x="0" y="${zY}" width="200" height="${altY - zY + 10}" fill="${t.zemin === "toprak" ? "#e9dccb" : "#e4e7eb"}"/>
  <line x1="0" y1="${zY}" x2="200" y2="${zY}" stroke="${GRI}" stroke-width="1"/>
  <rect x="${x}" y="${ust}" width="${w}" height="${altY - ust}" fill="${renk}" stroke="${GRI}" stroke-width="0.8"/>
  ${t.zemin !== "toprak" ? `<rect x="${x - 7}" y="${zY - 2}" width="${w + 14}" height="2.5" fill="${GRI}"/>` : ""}
  ${t.zemin === "toprak" && t.ekstra.temel ? `<rect x="${x - 8}" y="${zY}" width="${w + 16}" height="${altY - zY}" fill="#b9bec5" fill-opacity=".6"/><rect x="${x}" y="${zY}" width="${w}" height="${altY - zY}" fill="${renk}" stroke="${GRI}" stroke-width="0.8"/>` : ""}
  ${kol}
  ${olcuOku(x - 18, zY, x - 18, ust, `${sayi(H, 2)} m`, -14, 2)}
  ${gom ? olcuOku(x - 18, zY, x - 18, altY, `${sayi(gom * 100, 0)} cm`, -14, 3) : ""}
  ${kasL ? `<text x="${x + w + 16}" y="${ust - kasL * k * 0.4}" font-size="7" fill="${KIR}" font-weight="700">kaş ${sayi(kasL * 100, 0)} cm</text>` : ""}
  <g transform="translate(150 ${zY - 50})">
    ${kesitBoru ? `<circle cx="18" cy="18" r="14" fill="${renk}" stroke="${GRI}"/><circle cx="18" cy="18" r="11" fill="#fff" stroke="${GRI}" stroke-width=".6"/>` : `<rect x="4" y="4" width="28" height="28" fill="${renk}" stroke="${GRI}"/>${t.direk.tip === "beton" ? "" : `<rect x="7" y="7" width="22" height="22" fill="#fff" stroke="${GRI}" stroke-width=".6"/>`}`}
    <text x="18" y="44" font-size="7" fill="${LAC}" font-weight="700" text-anchor="middle">${esc(t.direk.olcu)}</text>
    <text x="18" y="52" font-size="6" fill="${GRI}" text-anchor="middle">kesit</text>
  </g>
  <text x="100" y="${altY + 18}" font-size="7.5" fill="${LAC}" font-weight="700" text-anchor="middle">${esc(dt.ad)} · boy ${sayi(direkBoyu(t), 2)} m</text>
</svg>`;
}

/** Tel deseni: göz aralığı ve tel kalınlığı ölçüleriyle. */
export function telCizimi(t: Tasarim) {
  const tip = t.tel.tip;
  const renk = t.tel.kaplama === "pvc" ? "#2f7a4a" : "#7d8794";
  const g = 26; // çizimde bir göz, px
  let desen = "";
  if (tip === "kafes")
    for (let i = -6; i < 12; i++)
      desen += `<line x1="${i * g}" y1="0" x2="${i * g + 130}" y2="130" stroke="${renk}" stroke-width="2"/><line x1="${i * g + 130}" y1="0" x2="${i * g}" y2="130" stroke="${renk}" stroke-width="2"/>`;
  else if (tip === "panel") {
    for (let i = 0; i <= 8; i++) desen += `<line x1="${10 + i * g * 0.75}" y1="0" x2="${10 + i * g * 0.75}" y2="130" stroke="${renk}" stroke-width="2.4"/>`;
    for (const y of [20, 70, 120]) desen += `<line x1="0" y1="${y}" x2="200" y2="${y}" stroke="${renk}" stroke-width="2.4"/>`;
    desen += `<path d="M0 64 Q100 80 200 64" stroke="${renk}" stroke-width="2" fill="none"/>`;
  } else if (tip === "tavuk") {
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 9; c++) {
        const cx = c * g + (r % 2 ? g / 2 : 0);
        const cy = r * g * 0.85 + 10;
        desen += `<polygon points="${[0, 1, 2, 3, 4, 5].map((i) => `${cx + (g / 2) * Math.cos((Math.PI / 3) * i + Math.PI / 6)},${cy + (g / 2) * Math.sin((Math.PI / 3) * i + Math.PI / 6)}`).join(" ")}" fill="none" stroke="${renk}" stroke-width="1.6"/>`;
      }
  } else
    for (let r = 0; r < 5; r++) {
      const y = 15 + r * 25;
      desen += `<line x1="0" y1="${y}" x2="200" y2="${y}" stroke="${renk}" stroke-width="2"/>`;
      for (let c = 0; c < 8; c++) desen += `<path d="M${15 + c * 25} ${y - 5}l6 10M${21 + c * 25} ${y - 5}l-6 10" stroke="${renk}" stroke-width="1.4"/>`;
    }
  return `<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">${OK_TANIM}
  <clipPath id="tk"><rect x="0" y="0" width="200" height="130"/></clipPath>
  <g clip-path="url(#tk)">${desen}</g>
  <rect x="0" y="0" width="200" height="130" fill="none" stroke="#dbe3ee"/>
  ${tip === "dikenli" ? olcuOku(184, 15, 184, 40, `${t.tel.goz} mm`, -16, 2) : olcuOku(65, 140, 65 + g, 140, `${t.tel.goz} mm göz`, 0, 12)}
  <text x="200" y="152" font-size="7" fill="${GRI}" text-anchor="end">tel Ø${sayi(t.tel.kalinlik)} mm</text>
  <text x="100" y="166" font-size="7.5" fill="${LAC}" font-weight="700" text-anchor="middle">${esc(telTipi(tip).ad)} · ${sayi(t.tel.yukseklik, 2)} m · ${t.tel.kaplama === "pvc" ? "PVC yeşil" : "galvaniz"}</text>
</svg>`;
}

/** Üst tel (dikenli / helezon / düzlemsel) mini çizimi. */
function ustTelCizimi(t: Tasarim) {
  const u = t.ekstra.ustTel;
  let ic = "";
  if (u === "dikenli")
    for (let r = 0; r < t.ekstra.ustSira; r++) {
      const y = 30 + r * 22;
      ic += `<line x1="0" y1="${y}" x2="200" y2="${y}" stroke="#7d8794" stroke-width="2"/>`;
      for (let c = 0; c < 8; c++) ic += `<path d="M${15 + c * 25} ${y - 5}l6 10M${21 + c * 25} ${y - 5}l-6 10" stroke="#7d8794" stroke-width="1.4"/>`;
    }
  else {
    const cap = u === "jiletli" ? t.ekstra.jiletliCap : t.ekstra.duzlemselCap;
    const r = 30 + cap * 0.35;
    for (let i = 0; i < 6; i++)
      ic += u === "jiletli" ? `<ellipse cx="${30 + i * 28}" cy="${75}" rx="${r * 0.55}" ry="${r}" fill="none" stroke="#7d8794" stroke-width="1.5"/>` : `<circle cx="${40 + i * 24}" cy="${75}" r="${r * 0.7}" fill="none" stroke="#7d8794" stroke-width="1.5"/>`;
    ic += olcuOku(4, 75 - (u === "jiletli" ? r : r * 0.7), 4, 75 + (u === "jiletli" ? r : r * 0.7), `Ø${cap} cm`, 18, 3);
  }
  const ad = { dikenli: `Dikenli tel · ${t.ekstra.ustSira} sıra`, jiletli: `Helezon jiletli · Ø${t.ekstra.jiletliCap} cm`, duzlemsel: `Düzlemsel jiletli · Ø${t.ekstra.duzlemselCap} cm` }[u as "dikenli"];
  return `<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">${OK_TANIM}<clipPath id="uk"><rect x="0" y="0" width="200" height="150"/></clipPath><g clip-path="url(#uk)">${ic}</g>
  <text x="100" y="166" font-size="7.5" fill="${LAC}" font-weight="700" text-anchor="middle">${ad}</text></svg>`;
}

/** A4 dikey, 96 dpi: 794 × 1123 px. Sayfa iç boşluğu. */
export const A4 = { w: 794, h: 1123, bosluk: 30 };
/** Plan ve detay kutuları (px). Detay görüntüsü bu orana kırpılır. */
const KUTU = { plan: 380, detay: 334, h: 222 };
export const DETAY_ORAN = KUTU.detay / KUTU.h;

/**
 * Ortak teklif sayfası kabuğu (tüm planlayıcılar): A4 sayfa, filigran, logo ve başlık, müşteri
 * şeridi, alt bilgi. İçerik (govde) planlayıcıya göre değişir; görünüm hep aynı kalır.
 */
export function pdfKabuk({
  ayarlar,
  t,
  no,
  tarih,
  govde,
  baslik = "Fiyat Teklifi",
  altBilgi = true,
}: {
  ayarlar: Ayarlar;
  t: Pick<Tasarim, "musteri" | "satisci">;
  no: string;
  tarih: Date;
  govde: string;
  baslik?: string;
  /** Teklif geçerlilik satırı (teknik resimde yok) */
  altBilgi?: boolean;
}) {
  const { firma, gecerlilikGun } = ayarlar;
  const m = t.musteri;
  const gecerli = new Date(tarih.getTime() + gecerlilikGun * 86400000).toLocaleDateString("tr-TR");
  const musteriSatiri = [
    m.tip === "firma" && m.yetkili.trim() ? `Yetkili: ${m.yetkili}` : "",
    m.telefon,
    m.eposta,
    m.adres,
    m.tip === "firma" && (m.vergiDairesi.trim() || m.vergiNo.trim()) ? `VD: ${[m.vergiDairesi, m.vergiNo].map((x) => x.trim()).filter(Boolean).join(" / ")}` : "",
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .map(esc)
    .join(" · ");
  const firmaSatiri = [firma.ad, firma.telefon, firma.eposta, firma.web, firma.adres].map((x) => x.trim()).filter(Boolean).map(esc).join(" · ");
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(firma.ad)} Teklif ${no}</title>
<style>
  @page{size:A4 portrait;margin:0}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0;background:#fff}
  body{font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;color:#0b1b33;font-size:10px;line-height:1.3}
  /* Tek A4 sayfa */
  .sayfa{width:${A4.w}px;min-height:${A4.h}px;margin:0 auto;padding:${A4.bosluk}px ${A4.bosluk + 4}px;position:relative;overflow:hidden;background:#fff}
  @media print{.sayfa{width:210mm;height:297mm;min-height:0}}
  /* Filigran: sayfanın ortasında tek, çok şeffaf logo */
  .filigran{position:absolute;left:50%;top:50%;width:600px;margin-left:-300px;margin-top:-52px;opacity:.05;transform:rotate(-28deg);z-index:0;pointer-events:none}
  .ic{position:relative;z-index:1}
  .serit{height:6px;background:linear-gradient(90deg,#d82628 0 35%,#003a8c 35%)}
  header{display:flex;justify-content:space-between;align-items:center;margin:10px 0}
  header img{height:52px}
  h1{font-size:15px;margin:0;letter-spacing:.08em;color:#003a8c;text-align:right}
  .k{color:#5b6b85;font-size:8.5px}
  .musteri{margin:-2px 0 8px;padding:5px 8px;border-left:3px solid #d82628;background:#f7f9fc;font-size:10.5px}
  .musteri b{font-size:11.5px}
  /* Uzun bağlantı/adres gibi bölünmeyen metinler sayfadan taşmasın */
  .musteri,footer span,.ozet b,td{overflow-wrap:anywhere}
  .ozet{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}
  .ozet div{border:1px solid #dbe3ee;border-radius:6px;padding:4px 6px}
  .ozet b{display:block;font-size:10px;margin-top:1px}
  .baslik{font-size:8.5px;font-weight:700;letter-spacing:.12em;color:#003a8c;margin:12px 0 5px;display:inline-block;border-bottom:1.5px solid #d82628;padding-bottom:4px}
  .ikili{display:grid;grid-template-columns:${KUTU.plan}px ${KUTU.detay}px;gap:12px}
  .kutu{height:${KUTU.h}px;border:1px solid #dbe3ee;border-radius:8px;overflow:hidden}
  .kutu img{width:100%;height:100%;display:block}
  .kutu svg{width:100%;height:100%;display:block}
  .plan{padding:4px}
  .lejant{display:flex;gap:9px;font-size:7.5px;color:#5b6b85;margin-top:3px;flex-wrap:wrap}
  .lejant i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:3px;vertical-align:-1px}
  table{width:100%;border-collapse:collapse}
  /* Teknik özellikler */
  /* Hücrelerde alt boşluk biraz fazla: PDF indirmede yazı tabana yapışmasın */
  .oz th,.oz td{border:1px solid #dbe3ee;padding:2px 6px 4px;text-align:left;vertical-align:middle}
  .oz th{background:#f2f5fa;color:#5b6b85;font-weight:600;width:15%;font-size:8.5px}
  .oz td{font-weight:700;width:35%}
  /* Malzeme ve fiyat tablosu */
  .m th,.m td{border:1px solid #c9d3e2;padding:2px 6px 4px;vertical-align:middle}
  .m thead th{background:#003a8c;color:#fff;font-size:8.5px;letter-spacing:.04em;text-align:left}
  .m .grup td{background:#eef2f8;font-weight:700;color:#003a8c;font-size:8px;letter-spacing:.1em}
  .m tfoot td{font-size:10px;background:#f7f9fc}
  .m tfoot .son td{font-size:13px;font-weight:800;color:#d82628;background:#fff5f5}
  .r{text-align:right !important;white-space:nowrap}
  .c{text-align:center;color:#5b6b85}
  .b{font-weight:700}
  .kartlar{display:grid;gap:10px}
  .kart{border:1px solid #dbe3ee;border-radius:8px;padding:6px 8px;background:#fff}
  .kart svg{width:100%;height:150px;display:block}
  .kb{font-size:8px;font-weight:700;letter-spacing:.12em;color:#5b6b85;text-transform:uppercase;margin-bottom:2px}
  .fiyat{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px;margin-top:12px}
  .fiyat div{border:1px solid #c9d3e2;border-radius:8px;padding:6px 10px;background:#f7f9fc}
  .fiyat b{display:block;font-size:14px;margin-top:2px}
  .fiyat .son{background:#fff5f5;border-color:#d82628}
  .fiyat .son b{font-size:20px;color:#d82628}
  footer{margin-top:10px;font-size:8px;color:#5b6b85;border-top:1px solid #dbe3ee;padding-top:5px;display:flex;justify-content:space-between;gap:12px}
</style></head><body>
<div class="sayfa">
<img class="filigran" src="${location.origin}${varlik("/logo.png")}" alt="">
<div class="ic">
<div class="serit"></div>
<header><img src="${location.origin}${varlik("/logo.png")}" alt="${esc(firma.ad)}"><div><h1>${B(baslik)}</h1><div class="k" style="text-align:right">${tarih.toLocaleDateString("tr-TR")} · No ${no}</div>${t.satisci ? `<div class="k" style="text-align:right">Teklifi veren: <b>${esc(t.satisci)}</b></div>` : ""}</div></header>
${
  m.ad.trim() || musteriSatiri || m.not.trim()
    ? `<div class="musteri"><span class="k">Sayın</span> <b>${esc(m.ad.trim() || "—")}</b>${musteriSatiri ? `<span class="k"> · ${musteriSatiri}</span>` : ""}${
        m.not.trim() ? `<div class="k">Not: ${esc(m.not.trim())}</div>` : ""
      }</div>`
    : ""
}

${govde}
<footer><span>${firmaSatiri}</span>
<span>${altBilgi ? `Teklif ${gecerlilikGun} gün (${gecerli} tarihine kadar) geçerlidir. Ölçüler sahada kesinleştirilir; miktarlar buna göre değişebilir.` : "Üretim planı · ölçüler cm · kesim payı 3 mm · ticari boy 6 m"}</span></footer>
</div></div>
</body></html>`;
}

export function teklifHtml({ t, s, ayarlar, detayResim, no, tarih }: PdfGirdisi & { no: string; tarih: Date }) {
  const { kdvYuzde } = ayarlar;
  const { noktalar, kapali } = sekilNoktalari(t);
  const sekil = SEKILLER.find((x) => x.id === t.sekil)!.ad;
  const kapilar = s.kapilar.map((k) => `${k.kapi.tur === "arac" ? "Araç" : "Yaya"} ${sayi(k.kapi.genislik, 2)} m`).join(", ") || "Yok";

  const ozet: [string, string][] = [
    ["Kurulum", { toprak: "Toprak arazi", beton: "Beton zemin", duvar: `Beton duvar üstü (${sayi(t.duvarYukseklik, 2)} m)` }[t.zemin]],
    ["Arazi", `${t.sekil === "serbest" ? "Elle çizim" : sekil}${kapali ? ` · ${sayi(alan(noktalar), 0)} m²` : ""}`],
    ["Çit uzunluğu", `${sayi(s.telUzunluk)} m`],
    ["Direk / payanda", `${s.sayilar.toplamDirek} / ${s.sayilar.payanda} adet`],
    ["Kapılar", kapilar],
    ["Tel", `${s.paket.adet} ${s.paket.birim}`],
  ];

  // Teknik özellikler iki sütun çift halinde: etiket | değer | etiket | değer
  const oz = ozellikler(t, s, ayarlar);
  const ozSatir: string[] = [];
  for (let i = 0; i < oz.length; i += 2) {
    const [a, b] = [oz[i], oz[i + 1]];
    ozSatir.push(`<tr><th>${a[0]}</th><td>${a[1]}</td>${b ? `<th>${b[0]}</th><td>${b[1]}</td>` : "<th></th><td></td>"}</tr>`);
  }

  const govde = `<div class="ozet">${ozet.map(([a, b]) => `<div><span class="k">${a}</span><b>${b}</b></div>`).join("")}</div>

<div class="ikili">
  <div><div class="baslik">${B("Arazi planı · üstten ölçülü")}</div><div class="kutu plan">${planSvg(t, s)}</div>
  <div class="lejant"><span><i style="background:#d82628"></i>Köşe / gergi / kapı direği</span><span><i style="background:#003a8c"></i>Ara direk</span><span><i style="background:#d82628;border-radius:0;height:2px"></i>Kapı</span><span>Ölçüler gerçek (eğimli) uzunluk</span></div></div>
  <div><div class="baslik">${B(`Detay görünüm · ${telTipi(t.tel.tip).ad}`)}</div><div class="kutu">${detayResim ? `<img src="${detayResim}" alt="Köşe detay görünümü">` : ""}</div></div>
</div>

<div class="baslik">${B("Teknik özellikler")}</div>
<table class="oz">${ozSatir.join("")}</table>

<div class="baslik">${B("Kullanılan malzeme")}</div>
<div class="kartlar" style="grid-template-columns:repeat(${t.ekstra.ustTel !== "yok" && t.tel.tip !== "dikenli" ? 3 : 2},1fr)">
  <div class="kart"><div class="kb">Direk</div>${direkCizimi(t)}</div>
  <div class="kart"><div class="kb">Tel</div>${telCizimi(t)}</div>
  ${t.ekstra.ustTel !== "yok" && t.tel.tip !== "dikenli" ? `<div class="kart"><div class="kb">Üst tel</div>${ustTelCizimi(t)}</div>` : ""}
</div>

<div class="fiyat">
  <div><span class="k">Toplam (KDV hariç)</span><b>${tl(s.araToplam)}</b></div>
  <div><span class="k">KDV %${sayi(kdvYuzde)}</span><b>${tl(s.kdv)}</b></div>
  <div class="son"><span class="k">Genel toplam (KDV dahil)</span><b>${tl(s.toplam)}</b></div>
</div>

`;
  return pdfKabuk({ ayarlar, t, no, tarih, govde });
}
