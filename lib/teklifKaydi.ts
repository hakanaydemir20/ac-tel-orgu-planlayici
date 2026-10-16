// Teklifi arşive kaydetme: numara verir, fiyatları dondurur, kalemleri saklar.
import type { Sonuc } from "./hesap";
import type { Ayarlar } from "./katalog";
import { useTasarim } from "./store";
import type { Tasarim } from "./tasarim";
import { useTeklifler } from "./teklifler";

/** Teklif numarası: AC-YYYYAAGG-SSDDss (yerel saat). */
export function teklifNo(tarih: Date) {
  const iki = (n: number) => String(n).padStart(2, "0");
  return `AC-${tarih.getFullYear()}${iki(tarih.getMonth() + 1)}${iki(tarih.getDate())}-${iki(tarih.getHours())}${iki(tarih.getMinutes())}${iki(tarih.getSeconds())}`;
}

/**
 * Teklifi arşive kaydeder. İlk kayıtta numara verilir ve o anki fiyatlar teklife dondurulur;
 * Ayarlar'da fiyat sonradan değişse de bu teklif aynı fiyatlarla kalır. Numarayı döner.
 */
export function teklifiKaydetSaf(t: Tasarim, s: Sonuc, ay: Ayarlar, tarih = new Date()) {
  const no = t.teklifNo || teklifNo(tarih);
  const { firma, ...fiyat } = ay; // firma bilgisi fiyatla dondurulmaz
  const fiyatlar = t.fiyatlar ?? { tarih: tarih.toISOString(), ayarlar: structuredClone({ ...fiyat, firma }) };
  if (!t.teklifNo || !t.fiyatlar)
    useTasarim.getState().guncelle((x) => {
      x.teklifNo = no;
      x.fiyatlar = fiyatlar;
    });
  useTeklifler.getState().kaydet({
    no,
    tarih: tarih.toISOString(),
    musteri: t.musteri.ad.trim(),
    toplam: s.toplam,
    telUzunluk: s.telUzunluk,
    tasarim: { ...t, teklifNo: no, fiyatlar },
    kalemler: s.kalemler,
    araToplam: s.araToplam,
    kdv: s.kdv,
    kdvYuzde: ay.kdvYuzde,
    firma,
  });
  return no;
}

