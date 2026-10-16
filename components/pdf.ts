// PDF teklif: tek A4 dikey sayfalık HTML üretir; hem yazdırılır hem PDF dosyası olarak indirilir.
import type { Kalem, Sonuc } from "@/lib/hesap";
import { direkBoyu } from "@/lib/hesap";
import { Ayarlar, direkRengi, direkTipi, telTipi, ustOlcu } from "@/lib/katalog";
import { planSvg } from "@/lib/plan";
import { alan } from "@/lib/serbest";
import { SEKILLER, Tasarim, sekilNoktalari } from "@/lib/tasarim";
import { sayi, tl } from "./ui";
import { varlik } from "@/lib/yol";

const GRUPLAR: Kalem["grup"][] = ["Tel", "Direk", "Bağlantı", "Kapı", "Hizmet"];

/** Başlıkları Türkçe kuralla büyük yazar (CSS text-transform PDF indirmede "İ"yi bozuyor). */
const B = (x: string) => x.toLocaleUpperCase("tr");

/** Kullanıcının yazdığı metni (müşteri, firma) HTML'e güvenle koyar. */
const esc = (x: string) =>
  x.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** WhatsApp ile gönderilecek kısa teklif metni. */
export function whatsappMetni(t: Tasarim, s: Sonuc, ay: Ayarlar) {
  const sekil = SEKILLER.find((x) => x.id === t.sekil)!.ad;
  return [
    `*${ay.firma.ad} – Çit Teklifi*`,
    ...(t.musteri.ad.trim() ? [`Sayın ${t.musteri.tip === "firma" && t.musteri.yetkili.trim() ? `${t.musteri.yetkili.trim()} (${t.musteri.ad.trim()})` : t.musteri.ad.trim()}`] : []),
    `Arazi: ${sekil}, ${t.zemin === "beton" ? "beton zemin" : "toprak arazi"}, ${sayi(s.telUzunluk)} m çit`,
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
    ["Kurulum alanı", t.zemin === "beton" ? "Beton zemin" : "Toprak arazi"],
    ["Tel tipi", `${tip.ad}${t.tel.kaplama === "pvc" ? " · PVC yeşil" : " · galvaniz"}`],
    ["Çit yüksekliği", `${sayi(t.tel.yukseklik, 2)} m`],
    [tip.id === "dikenli" ? "Sıra sayısı / arası" : "Göz aralığı", tip.id === "dikenli" ? `${t.tel.sira} sıra · ${t.tel.goz} mm` : `${t.tel.goz} mm`],
    ["Tel kalınlığı", `${sayi(t.tel.kalinlik)} mm`],
    ["Direk", `${dt.ad}${dt.id !== "beton" ? ` · ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}${t.direk.renk !== "galvaniz" ? ` (${direkRengi(t.direk.renk).kod})` : ""}` : ""}${t.direk.kasli ? { egik: " · kaşlı (üstü eğik)", duz: " · kaşlı (üstü düz)", v: " · V kaşlı" }[t.direk.kasTipi] : ""}`],
    ["Direk ölçüsü", `ara ${t.direk.olcu} · köşe/gergi ${ustOlcu(dt, t.direk.olcu)}`],
    t.zemin === "beton"
      ? ["Direk boyu / sabitleme", `${sayi(boy, 2)} m · flanşlı, direk başına ${ay.dubelDirek} dübel`]
      : ["Direk boyu / gömme", `${sayi(boy, 2)} m · ${sayi(dt.gomme * 100, 0)} cm toprak altı`],
    ["Direk aralığı", `${sayi(t.direk.aralik, 2)} m`],
    ["Payanda", s.sayilar.payanda ? `${s.sayilar.payanda} adet (köşe, uç, gergi ve kapı direklerinde)` : "Yok"],
  ];
  if (gergiSira) satirlar.push(["Gergi teli", `${gergiSira} sıra`]);
  if (t.ekstra.ustTel !== "yok")
    satirlar.push([
      "Üst tel",
      { dikenli: `Dikenli tel · ${t.ekstra.ustSira} sıra`, jiletli: "Jiletli spiral", duzlemsel: "Düzlemsel jiletli tel" }[t.ekstra.ustTel],
    ]);
  return satirlar;
}

export { teklifNo } from "@/lib/teklifKaydi";

/** A4 dikey, 96 dpi: 794 × 1123 px. Sayfa iç boşluğu. */
export const A4 = { w: 794, h: 1123, bosluk: 30 };
/** Plan ve detay kutuları (px). Detay görüntüsü bu orana kırpılır. */
const KUTU = { plan: 380, detay: 334, h: 222 };
export const DETAY_ORAN = KUTU.detay / KUTU.h;

export function teklifHtml({ t, s, ayarlar, detayResim, no, tarih }: PdfGirdisi & { no: string; tarih: Date }) {
  const { kdvYuzde, firma, gecerlilikGun } = ayarlar;
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
  const { noktalar, kapali } = sekilNoktalari(t);
  const sekil = SEKILLER.find((x) => x.id === t.sekil)!.ad;
  const kapilar = s.kapilar.map((k) => `${k.kapi.tur === "arac" ? "Araç" : "Yaya"} ${sayi(k.kapi.genislik, 2)} m`).join(", ") || "Yok";

  const ozet: [string, string][] = [
    ["Kurulum", t.zemin === "beton" ? "Beton zemin" : "Toprak arazi"],
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

  let sira = 0;
  const kalemSatiri = (k: Kalem) =>
    `<tr><td class="c">${++sira}</td><td>${k.ad}</td><td class="r">${sayi(k.miktar)}</td><td>${k.birim}</td><td class="r">${tl(k.birimFiyat, true)}</td><td class="r b">${tl(k.tutar)}</td></tr>`;

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
  footer{margin-top:10px;font-size:8px;color:#5b6b85;border-top:1px solid #dbe3ee;padding-top:5px;display:flex;justify-content:space-between;gap:12px}
</style></head><body>
<div class="sayfa">
<img class="filigran" src="${location.origin}${varlik("/logo.png")}" alt="">
<div class="ic">
<div class="serit"></div>
<header><img src="${location.origin}${varlik("/logo.png")}" alt="${esc(firma.ad)}"><div><h1>${B("Fiyat Teklifi")}</h1><div class="k" style="text-align:right">${tarih.toLocaleDateString("tr-TR")} · No ${no}</div></div></header>
${
  m.ad.trim() || musteriSatiri || m.not.trim()
    ? `<div class="musteri"><span class="k">Sayın</span> <b>${esc(m.ad.trim() || "—")}</b>${musteriSatiri ? `<span class="k"> · ${musteriSatiri}</span>` : ""}${
        m.not.trim() ? `<div class="k">Not: ${esc(m.not.trim())}</div>` : ""
      }</div>`
    : ""
}

<div class="ozet">${ozet.map(([a, b]) => `<div><span class="k">${a}</span><b>${b}</b></div>`).join("")}</div>

<div class="ikili">
  <div><div class="baslik">${B("Arazi planı · üstten ölçülü")}</div><div class="kutu plan">${planSvg(t, s)}</div>
  <div class="lejant"><span><i style="background:#d82628"></i>Köşe / gergi / kapı direği</span><span><i style="background:#003a8c"></i>Ara direk</span><span><i style="background:#d82628;border-radius:0;height:2px"></i>Kapı</span><span>Ölçüler gerçek (eğimli) uzunluk</span></div></div>
  <div><div class="baslik">${B(`Detay görünüm · ${telTipi(t.tel.tip).ad}`)}</div><div class="kutu">${detayResim ? `<img src="${detayResim}" alt="Köşe detay görünümü">` : ""}</div></div>
</div>

<div class="baslik">${B("Teknik özellikler")}</div>
<table class="oz">${ozSatir.join("")}</table>

<div class="baslik">${B("Malzeme ve fiyat")}</div>
<table class="m">
<thead><tr><th class="c" style="width:22px">#</th><th>Kalem</th><th class="r" style="width:58px">Miktar</th><th style="width:40px">Birim</th><th class="r" style="width:76px">Birim fiyat</th><th class="r" style="width:84px">Tutar</th></tr></thead>
<tbody>
${GRUPLAR.map((g) => {
  const ks = s.kalemler.filter((k) => k.grup === g);
  return ks.length ? `<tr class="grup"><td colspan="5">${B(g)}</td><td class="r">${tl(s.grupToplam[g] ?? 0)}</td></tr>${ks.map(kalemSatiri).join("")}` : "";
}).join("")}
</tbody>
<tfoot>
<tr><td colspan="5" class="r">Ara toplam</td><td class="r b">${tl(s.araToplam)}</td></tr>
<tr><td colspan="5" class="r">KDV %${sayi(kdvYuzde)}</td><td class="r b">${tl(s.kdv)}</td></tr>
<tr class="son"><td colspan="5" class="r">Genel toplam (KDV dahil)</td><td class="r">${tl(s.toplam)}</td></tr>
</tfoot>
</table>

<footer><span>${firmaSatiri}</span>
<span>Teklif ${gecerlilikGun} gün (${gecerli} tarihine kadar) geçerlidir. Ölçüler sahada kesinleştirilir; miktarlar buna göre değişebilir.</span></footer>
</div></div>
</body></html>`;
}
