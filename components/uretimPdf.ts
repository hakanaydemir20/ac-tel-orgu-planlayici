// Üretim planı teknik resim sayfası: çizimler + kesim listesi + alım özeti (fiyat yok).
import type { UretimPlani } from "@/lib/uretim";
import { BOY_CM } from "@/lib/uretim";
import type { Ayarlar } from "@/lib/katalog";
import type { Tasarim } from "@/lib/tasarim";
import { B, esc, pdfKabuk } from "./pdf";

const s = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

export function uretimHtml({
  plan,
  t,
  ayarlar,
  no,
  tarih,
  cizimler,
}: {
  plan: UretimPlani;
  t: Pick<Tasarim, "musteri" | "satisci">;
  ayarlar: Ayarlar;
  no: string;
  tarih: Date;
  /** [başlık, svg] çiftleri */
  cizimler: [string, string][];
}) {
  const kesim = plan.kesim
    .map((k) => `<tr><td>${esc(k.ad)}</td><td>${esc(k.profil)}</td><td>${k.kesim ?? ""}</td><td class="r b">${s(k.boyCm)}</td><td class="r b">${k.adet}</td></tr>`)
    .join("");
  const alim = plan.alim
    .map(
      (a) =>
        `<tr><td>${esc(a.profil)}</td><td class="r">${a.parcaAdet}</td><td class="r">${s(a.toplamCm / 100)} m</td><td class="r b">${a.boy}</td><td class="r">%${a.fireYuzde}</td></tr>`,
    )
    .join("");
  const sarf = plan.sarf.map((x) => `<tr><td>${esc(x.ad)}</td><td class="r b">${s(x.adet)} ${esc(x.birim)}</td></tr>`).join("");
  const govde = `
${
  cizimler.length > 1
    ? `<div class="kart buyuk"><div class="kb">${esc(cizimler[0][0])}</div>${cizimler[0][1]}</div>
<div class="kartlar" style="grid-template-columns:repeat(${cizimler.length - 1},1fr);margin-top:8px">${cizimler
        .slice(1)
        .map(([b, svg]) => `<div class="kart"><div class="kb">${esc(b)}</div>${svg}</div>`)
        .join("")}</div>`
    : `<div class="kartlar" style="grid-template-columns:repeat(${Math.min(cizimler.length, 3)},1fr)">${cizimler
        .map(([b, svg]) => `<div class="kart"><div class="kb">${esc(b)}</div>${svg}</div>`)
        .join("")}</div>`
}
${plan.olcuNotlari?.length ? `<div class="baslik">${B("Ölçü notları")}</div><ul class="notlar">${plan.olcuNotlari.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
<table class="antet">
  <tr><th>Firma</th><td>${esc(ayarlar.firma.ad)}</td><th>Pafta</th><td>ÜP-${esc(no)}</td><th>Tarih</th><td>${tarih.toLocaleDateString("tr-TR")}</td></tr>
  <tr><th>Proje</th><td>${esc(t.musteri.ad || "—")}</td><th>Çizen</th><td>${esc(t.satisci || "—")}</td><th>Ölçek</th><td>Ölçeksiz · ölçüler cm</td></tr>
  <tr><th>Malzeme</th><td colspan="5">S235 çelik profil · kesimler testere ayarı (dik kesimden sapma) · kaynak: köşe kaynağı, tüm çevre · çapak alınır, astar + boya / galvaniz</td></tr>
</table>
<style>.kart.buyuk svg{height:270px}.antet{width:100%;border-collapse:collapse;margin-top:8px;font-size:8.5px}.antet th,.antet td{border:1.2px solid #0b1b33;padding:3px 6px;text-align:left}.antet th{background:#eef2f7;width:9%}.notlar{margin:0;padding-left:16px;font-size:9px;line-height:1.45}</style>
<div class="baslik">${B("Kesim listesi")}</div>
<table class="oz"><tr><th>Parça</th><th>Profil</th><th>Kesim</th><th class="r">Boy (cm)</th><th class="r">Adet</th></tr>${kesim}</table>
<div class="ikili" style="grid-template-columns:1.25fr 1fr">
  <div><div class="baslik">${B(`Profil alımı · ${BOY_CM / 100} m boy`)}</div>
  <table class="oz"><tr><th>Profil</th><th class="r">Parça</th><th class="r">Toplam</th><th class="r">Boy</th><th class="r">Fire</th></tr>${alim || '<tr><td colspan="5">Kesilecek profil yok</td></tr>'}</table></div>
  <div><div class="baslik">${B("Hırdavat ve hazır malzeme")}</div>
  <table class="oz"><tr><th>Malzeme</th><th class="r">Miktar</th></tr>${sarf}</table></div>
</div>
${plan.notlar.length ? `<p class="k" style="margin-top:6px">${plan.notlar.map(esc).join(" ")}</p>` : ""}
`;
  return pdfKabuk({ ayarlar, t, no, tarih, govde, baslik: `Üretim planı · ${plan.baslik}`, altBilgi: false });
}
