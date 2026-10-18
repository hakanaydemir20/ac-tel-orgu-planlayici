"use client";
import type { Sonuc } from "@/lib/hesap";
import { useEtkinAyarlar } from "@/lib/ayarlar";
import { useTasarim } from "@/lib/store";
import type { Tasarim } from "@/lib/tasarim";
import { whatsappMetni } from "./pdf";
import { TeklifPenceresi } from "./TeklifPenceresi";
import { teklifiKaydet, type useTeklifCikti } from "./TeklifYazdir";

/** Çit planlayıcının "Teklif detayları" penceresi: ortak pencereye çit verisini bağlar. */
export function TeklifDetay({
  sonuc: s,
  tasarim: t,
  cikti,
  kapat,
}: {
  sonuc: Sonuc;
  tasarim: Tasarim;
  cikti: Pick<ReturnType<typeof useTeklifCikti>, "yazdir" | "indir" | "hazirlanan">;
  kapat: () => void;
}) {
  const ayarlar = useEtkinAyarlar(t);
  const guncelle = useTasarim((x) => x.guncelle);
  return (
    <TeklifPenceresi
      teklifNo={t.teklifNo}
      gruplar={["Tel", "Direk", "Bağlantı", "Kapı", "Hizmet"]}
      kalemler={s.kalemler}
      araToplam={s.araToplam}
      kdv={s.kdv}
      toplam={s.toplam}
      kdvYuzde={ayarlar.kdvYuzde}
      musteri={t.musteri}
      musteriDegistir={(m) => guncelle((x) => void (x.musteri = m))}
      satisci={t.satisci}
      satisciDegistir={(v) => guncelle((x) => void (x.satisci = v))}
      indir={cikti.indir}
      yazdir={cikti.yazdir}
      hazirlanan={cikti.hazirlanan}
      kaydet={() => teklifiKaydet(t, s, ayarlar)}
      whatsappMetni={() => whatsappMetni(t, s, ayarlar)}
      bos={!s.kenarlar.length}
      bosYazi="Henüz çit çizilmedi."
      kapat={kapat}
    />
  );
}
