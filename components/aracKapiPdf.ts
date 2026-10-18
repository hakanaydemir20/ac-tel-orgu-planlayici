// Araç kapısı teklif sayfası: çitle aynı kabuk (logo, müşteri, alt bilgi), kapıya özel içerik.
import { type AracKapi, KAPI_DOLGULARI, KAPI_TIPLERI, aracKapiHesapla, kanatBoyu, rayBoyu, surgulu } from "@/lib/aracKapi";
import type { AracKapiTeklifi } from "@/lib/aracKapiStore";
import { type Ayarlar, direkRengi } from "@/lib/katalog";
import { B, esc, pdfKabuk } from "./pdf";
import { sayi, tl } from "./ui";

function ozellikler(k: AracKapi, alan: number): [string, string][] {
  const renk = direkRengi(k.renk);
  const satir: [string, string][] = [
    ["Kapı tipi", KAPI_TIPLERI.find((x) => x.id === k.tip)!.ad],
    ["Dolgu", KAPI_DOLGULARI.find((x) => x.id === k.dolgu)!.ad],
    ["Geçiş genişliği", `${sayi(k.genislik, 2)} m`],
    ["Yükseklik", `${sayi(k.yukseklik, 2)} m`],
    ["Kanat", `${sayi(kanatBoyu(k), 2)} m${k.tip === "konsol" ? " (kuyruk dahil)" : ""} · ${sayi(alan)} m²`],
    ["Renk", `${renk.ad}${k.renk !== "galvaniz" ? ` (${renk.kod})` : ""}`],
    ["Motor", k.motor ? (surgulu(k) ? "Sürgü motoru + 2 kumanda" : `Kanat kol motoru${k.tip === "cift" ? " × 2" : ""} + kumanda`) : "Yok (manuel)"],
    ["Fotosel / flaşör", `${k.fotosel ? "Fotosel var" : "Fotosel yok"} · ${k.flasor ? "flaşör var" : "flaşör yok"}`],
  ];
  if (surgulu(k)) satir.push([k.tip === "surgulu" ? "Ray ve temel" : "Taşıyıcı temel", k.ray ? `${sayi(rayBoyu(k), 2)} m` : "Dahil değil"]);
  satir.push(["Mızrak uç", k.mizrak ? "Var" : "Yok"], ["Montaj", k.montaj ? "Dahil" : "Dahil değil"]);
  return satir;
}

/** Kapı önden görünüş çizimi, ölçülü. */
function kapiCizimi(k: AracKapi) {
  const W = kanatBoyu(k);
  const sx = 300 / Math.max(W, 3);
  const h = k.yukseklik * sx;
  const x0 = 64;
  const y0 = 20;
  const renk = direkRengi(k.renk).renk;
  const bolum = Math.max(1, Math.ceil(W / 2.5));
  let ic = "";
  for (let b = 1; b < bolum; b++) ic += `<line x1="${x0 + (b * W * sx) / bolum}" y1="${y0}" x2="${x0 + (b * W * sx) / bolum}" y2="${y0 + h}" stroke="${renk}" stroke-width="3"/>`;
  for (let x = x0 + 6; x < x0 + W * sx; x += k.dolgu === "profil" ? 8 : 5) ic += `<line x1="${x}" y1="${y0 + 3}" x2="${x}" y2="${y0 + h - 3}" stroke="${renk}" stroke-width="${k.dolgu === "profil" ? 2 : 0.8}" opacity="${k.dolgu === "sac" ? 0 : 1}"/>`;
  return `<svg viewBox="0 0 ${x0 + W * sx + 30} ${y0 + h + 40}" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="o" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 6 3 0 6z" fill="#d82628"/></marker></defs>
  ${k.dolgu === "sac" ? `<rect x="${x0}" y="${y0}" width="${W * sx}" height="${h}" fill="${renk}" fill-opacity=".35"/>` : ""}
  ${ic}
  <rect x="${x0}" y="${y0}" width="${W * sx}" height="${h}" fill="none" stroke="${renk}" stroke-width="4"/>
  <line x1="${x0}" y1="${y0 + h + 16}" x2="${x0 + W * sx}" y2="${y0 + h + 16}" stroke="#d82628" marker-start="url(#o)" marker-end="url(#o)"/>
  <text x="${x0 + (W * sx) / 2}" y="${y0 + h + 30}" font-size="11" fill="#d82628" font-weight="700" text-anchor="middle">${sayi(W, 2)} m</text>
  <line x1="${x0 - 14}" y1="${y0}" x2="${x0 - 14}" y2="${y0 + h}" stroke="#d82628" marker-start="url(#o)" marker-end="url(#o)"/>
  <text x="${x0 - 18}" y="${y0 + h / 2}" font-size="11" fill="#d82628" font-weight="700" text-anchor="end">${sayi(k.yukseklik, 2)} m</text>
</svg>`;
}

export function aracKapiHtml({
  k,
  t,
  ayarlar,
  no,
  tarih,
  resim,
}: {
  k: AracKapi;
  t: AracKapiTeklifi;
  ayarlar: Ayarlar;
  no: string;
  tarih: Date;
  resim: string | null;
}) {
  const fiyat = t.fiyatlar ? { aracKapi: t.fiyatlar.aracKapi, kdvYuzde: t.fiyatlar.kdvYuzde } : ayarlar;
  const s = aracKapiHesapla(k, fiyat);
  const oz = ozellikler(k, s.alan);
  const ozSatir: string[] = [];
  for (let i = 0; i < oz.length; i += 2) {
    const [a, b] = [oz[i], oz[i + 1]];
    ozSatir.push(`<tr><th>${a[0]}</th><td>${a[1]}</td>${b ? `<th>${b[0]}</th><td>${b[1]}</td>` : "<th></th><td></td>"}</tr>`);
  }
  const ozet: [string, string][] = [
    ["Kapı", KAPI_TIPLERI.find((x) => x.id === k.tip)!.ad],
    ["Dolgu", KAPI_DOLGULARI.find((x) => x.id === k.dolgu)!.ad],
    ["Ölçü", `${sayi(k.genislik, 2)} × ${sayi(k.yukseklik, 2)} m`],
    ["Kanat alanı", `${sayi(s.alan)} m²`],
    ["Renk", direkRengi(k.renk).ad],
    ["Motor", k.motor ? "Var" : "Yok"],
  ];
  const govde = `<div class="ozet">${ozet.map(([a, b]) => `<div><span class="k">${a}</span><b>${esc(b)}</b></div>`).join("")}</div>
<div class="ikili">
  <div><div class="baslik">${B("Önden görünüş · ölçülü")}</div><div class="kutu plan">${kapiCizimi(k)}</div></div>
  <div><div class="baslik">${B("3D görünüm")}</div><div class="kutu">${resim ? `<img src="${resim}" alt="Kapı 3D görünüm" style="object-fit:cover">` : ""}</div></div>
</div>
<div class="baslik">${B("Teknik özellikler")}</div>
<table class="oz">${ozSatir.join("")}</table>
<div class="fiyat">
  <div><span class="k">Toplam (KDV hariç)</span><b>${tl(s.araToplam)}</b></div>
  <div><span class="k">KDV %${sayi(fiyat.kdvYuzde)}</span><b>${tl(s.kdv)}</b></div>
  <div class="son"><span class="k">Genel toplam (KDV dahil)</span><b>${tl(s.toplam)}</b></div>
</div>
`;
  return pdfKabuk({ ayarlar, t, no, tarih, govde });
}

export function aracKapiWhatsapp(k: AracKapi, t: AracKapiTeklifi, ayarlar: Ayarlar) {
  const fiyat = t.fiyatlar ? { aracKapi: t.fiyatlar.aracKapi, kdvYuzde: t.fiyatlar.kdvYuzde } : ayarlar;
  const s = aracKapiHesapla(k, fiyat);
  return [
    `*${ayarlar.firma.ad} – Araç Kapısı Teklifi*`,
    ...(t.musteri.ad.trim() ? [`Sayın ${t.musteri.ad.trim()}`] : []),
    "",
    ...ozellikler(k, s.alan).map(([a, b]) => `• ${a}: ${b}`),
    "",
    `Toplam (KDV hariç): ${tl(s.araToplam)}`,
    `*Genel toplam (KDV dahil): ${tl(s.toplam)}*`,
    "",
    `Teklif ${ayarlar.gecerlilikGun} gün geçerlidir.${ayarlar.firma.telefon ? ` İletişim: ${ayarlar.firma.telefon}` : ""}`,
    ...(t.satisci ? [`Teklifi veren: ${t.satisci} – ${ayarlar.firma.ad}`] : []),
  ].join("\n");
}
