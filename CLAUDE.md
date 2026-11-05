# AC Tel Örgü Planlayıcı — çalışma dizini

Next.js 15 + R3F + zustand + Tailwind 4. Tüm kod tabanını okuma: önce aşağıdaki haritadan
ilgili bölümü bul, yalnızca o dosyaları aç.

## Bölüm haritası (graphify kümeleri)

| Bölüm | Dosyalar |
|---|---|
| Çit tasarımı + teklif durumu | `app/cit/page.tsx`, `components/Tasarimci.tsx`, `FiyatOzeti`, `MusteriFormu`, `MusteriSor`, `SatisciSec`, `TeklifDetay`, `TeklifPenceresi`, `TeklifYazdir`, `YeniTeklif`; `lib/tasarim.ts`, `store.ts`, `ayarlar.ts`, `birlestir.ts`, `detay.ts`, `plan.ts`, `sayi.ts`, `teklifKaydi.ts`, `telefon.ts` |
| Hesap + teknik resim | `lib/hesap.ts`, `components/citTeknik.ts` |
| 3D çit sahnesi | `components/sahne/Sahne.tsx`, `sahne/dokular.ts`, `lib/geometri.ts`; eğlence: `sahne/Hayvanlar.tsx` (bloklu tavuk/yumurta/civciv, kuş, köpek, inek, koyun; sağ üst butonlar) |
| Çizim alanı + uydu harita | `components/form/CizimAlani.tsx`, `components/UyduHarita.tsx`, `lib/harita.ts`, `lib/serbest.ts` |
| Soru-cevap + ayarlar | `components/SoruCevap.tsx`, `AyarPaneli.tsx`, `ikonlar.tsx` |
| Kapı planlayıcı + üretim | `app/kapi/page.tsx`, `app/arac/page.tsx`, `components/KapiPlanlayici.tsx`, `KapiSoruCevap`, `UretimPenceresi`, `form/Adimlar.tsx`, `kapiTeknik.ts`, `ui.tsx`; `lib/kapiYapi.ts`, `uretim.ts` |
| Araç kapısı (katalog, fiyat, PDF) | `lib/aracKapi.ts`, `aracKapiFiyat.ts`, `aracKapiStore.ts`, `kapiAilesi.ts`, `katalog.ts`, `teklifler.ts`; `components/aracKapiPdf.ts` |
| Araç kapısı 3D | `components/sahne/AracKapiSahne.tsx`, `lib/kapiCekim.ts` |
| Kabuk, tema, PDF, teklif listesi | `app/layout.tsx`, `app/page.tsx`, `components/Karsilama`, `UstMenu`, `TemaDugmesi`, `TeklifListesi`, `pdf.ts`, `uretimPdf.ts`; `lib/tema.ts`, `temaBetigi.ts`, `yol.ts` |
| Yayın | `.github/workflows/yayin.yml` (GitHub Pages) |

Testler: `lib/*.test.ts` (vitest), ilgili modülün yanında.

## Yeni bilgisayarda kurulum
Harita (`graphify-out/graph.json`, `GRAPH_REPORT.md`, `graph.html`) repoda hazır. Sorgu/güncelleme için
Python ≥3.10 ortamına graphify kur: `python3 -m venv .tools/gvenv && .tools/gvenv/bin/pip install graphifyy`
(sistem Python eskiyse: `pip install uv` → `uv venv --python 3.12 .tools/gvenv` → `uv pip install --python .tools/gvenv/bin/python graphifyy`).

## Kurallar
- Bölüm belli değilse: `graphify-out/GRAPH_REPORT.md` veya
  `.tools/gvenv/bin/python -m graphify query "<soru>"` ile bul, sonra dosyayı aç.
- Bağlantılı merkez düğümler (değiştirirken etkisine bak): `KapiPlanlayici()`, `useTasarim`,
  `sayi()`, `Icerik()`, `Tasarimci()`, `hesapla()`, `tl()`.
- Kod değişikliğinden sonra haritayı güncelle (LLM gerektirmez):
  `.tools/gvenv/bin/python -m graphify update .`
- Node bu Mac’te: `PATH="../tel-orgu/.tools/node/bin:$PATH"` (başka makinede sistem Node 22); önizleme `.claude/launch.json` → `cit-planlayici` (3001).
