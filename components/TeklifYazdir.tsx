"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEtkinAyarlar } from "@/lib/ayarlar";
import { teklifiKaydetSaf as teklifiKaydet } from "@/lib/teklifKaydi";
import { detayTasarimi } from "@/lib/detay";
import { hesapla, Sonuc } from "@/lib/hesap";
import { useTasarim } from "@/lib/store";
import type { Tasarim } from "@/lib/tasarim";
import { useTeklifler } from "@/lib/teklifler";
import { A4, DETAY_ORAN, teklifHtml, teklifNo } from "./pdf";

const Sahne = dynamic(() => import("./sahne/Sahne"), { ssr: false });

export type CiktiTuru = "yazdir" | "indir";

export { teklifiKaydetSaf as teklifiKaydet } from "@/lib/teklifKaydi";

/** Görüntüyü ortadan istenen en/boy oranına kırpıp JPEG yapar (PDF'teki kutuya taşmadan otursun). */
async function kirp(dataUrl: string, oran: number): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  let w = img.naturalWidth;
  let h = Math.round(w / oran);
  if (h > img.naturalHeight) {
    h = img.naturalHeight;
    w = Math.round(h * oran);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(img, (img.naturalWidth - w) / 2, (img.naturalHeight - h) / 2, w, h, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.9);
}

/** Teklif HTML'ini A4 genişliğinde gizli bir çerçeveye yazar; görseller yüklenince döner. */
async function cerceveHazirla(html: string) {
  document.getElementById("teklif-cerceve")?.remove();
  const f = document.createElement("iframe");
  f.id = "teklif-cerceve";
  f.setAttribute("aria-hidden", "true");
  Object.assign(f.style, { position: "fixed", left: "-10000px", top: "0", width: `${A4.w}px`, height: `${A4.h}px`, border: "0" });
  document.body.appendChild(f);
  const d = f.contentDocument!;
  d.open();
  d.write(html);
  d.close();
  await Promise.all([...d.images].map((i) => (i.complete ? Promise.resolve() : new Promise((r) => (i.onload = i.onerror = r)))));
  await d.fonts?.ready;
  return { f, d };
}

/** İçerik A4'ü aşarsa yazdırmada sayfayı küçültür; hep tek sayfa çıkar. */
function sayfayaSigdir(d: Document) {
  const ic = d.querySelector<HTMLElement>(".ic")!;
  const sigan = A4.h - 2 * A4.bosluk;
  const gereken = ic.scrollHeight;
  if (gereken > sigan) ic.style.zoom = String(Math.floor((sigan / gereken) * 1000) / 1000);
}

async function yazdir(html: string) {
  const { f, d } = await cerceveHazirla(html);
  sayfayaSigdir(d);
  await new Promise((r) => setTimeout(r, 100));
  f.contentWindow!.focus();
  f.contentWindow!.print();
}

/** Sayfayı görüntüye çevirip tek sayfalık A4 dikey PDF olarak indirir. */
async function pdfIndir(html: string, dosyaAdi: string) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const { f, d } = await cerceveHazirla(html);
  try {
    const sayfa = d.querySelector<HTMLElement>(".sayfa")!;
    const tuval = await html2canvas(sayfa, { scale: 2, backgroundColor: "#ffffff", windowWidth: A4.w, logging: false });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    // Sığmayan içerikte oran korunur, sayfa ortalanır (yine tek sayfa)
    const olcek = Math.min(210 / tuval.width, 297 / tuval.height);
    const [w, h] = [tuval.width * olcek, tuval.height * olcek];
    pdf.addImage(tuval.toDataURL("image/jpeg", 0.92), "JPEG", (210 - w) / 2, 0, w, h);
    pdf.save(dosyaAdi);
  } finally {
    f.remove();
  }
}

/** Görünmeyen bir tuvalde köşe detayını çizer, PNG hazır olunca bildirir. */
function DetayCizici({ tasarim, onHazir }: { tasarim: Tasarim; onHazir: (png: string | null) => void }) {
  const ay = useEtkinAyarlar(tasarim);
  const d = useMemo(() => detayTasarimi(tasarim), [tasarim]);
  const s = useMemo(() => hesapla(d), [d]);
  const bitti = useRef(false);
  const bitir = (png: string | null) => {
    if (bitti.current) return;
    bitti.current = true;
    onHazir(png);
  };
  // WebGL açılamazsa teklif detaysız çıksın
  const bitirRef = useRef(bitir);
  bitirRef.current = bitir;
  useEffect(() => {
    const z = setTimeout(() => bitirRef.current(null), 8000);
    return () => clearTimeout(z);
  }, []);
  return (
    <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: 960, height: 640, pointerEvents: "none" }}>
      <Sahne mod="detay" tasarim={d} sonuc={s} onHazir={bitir} dubel={{ direk: ay.dubelDirek, payanda: ay.dubelPayanda }} />
    </div>
  );
}

/**
 * Teklif çıktısı: önce köşe detayını çizer, sonra tek A4 sayfayı
 * yazdırma ekranına gönderir ya da PDF dosyası olarak indirir.
 */
export function useTeklifCikti(tasarim: Tasarim, sonuc: Sonuc) {
  const ayarlar = useEtkinAyarlar(tasarim);
  const [is, setIs] = useState<{ tur: CiktiTuru; t: Tasarim; s: Sonuc; no: string; tarih: Date } | null>(null);

  // Numara tıklama anında verilir ve kayıt hemen yapılır: detay çizilirken başka teklif
  // açılsa da numara yanlış tasarıma yazılmaz
  const baslat = (tur: CiktiTuru) => {
    if (is) return;
    const tarih = new Date();
    const no = teklifiKaydet(tasarim, sonuc, ayarlar, tarih);
    setIs({ tur, t: { ...tasarim, teklifNo: no }, s: sonuc, no, tarih });
  };

  const bitir = async (detayPng: string | null) => {
    if (!is) return;
    try {
      const { no, tarih } = is;
      // Kutuya tam oturan, küçük bir JPEG: html2canvas büyük PNG'yi atlayabiliyor
      const detayResim = detayPng ? await kirp(detayPng, DETAY_ORAN) : null;
      const html = teklifHtml({ t: is.t, s: is.s, ayarlar, detayResim, no, tarih });
      if (is.tur === "yazdir") await yazdir(html);
      else await pdfIndir(html, `AC-Tel-Orgu-Teklif-${no.replace(/^AC-/, "")}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Teklif hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      setIs(null);
    }
  };

  const cizici = is && <DetayCizici tasarim={is.t} onHazir={bitir} />;

  return {
    yazdir: () => baslat("yazdir"),
    indir: () => baslat("indir"),
    /** Hazırlanan çıktı türü (düğmede "Hazırlanıyor…" göstermek için) */
    hazirlanan: is?.tur ?? null,
    cizici,
  };
}
