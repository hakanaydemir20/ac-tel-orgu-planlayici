# Graph Report - çit planlayıcı  (2026-11-02)

## Corpus Check
- 76 files · ~70,025 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .obj 1)

## Summary
- 630 nodes · 2168 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.84)
- Token cost: 123,236 input · 0 output

## Community Hubs (Navigation)
- Tasarım ve Teklif Durumu
- Kapı Planlayıcı ve Üretim
- Soru-Cevap ve Ayarlar
- 3D Çit Sahnesi
- Katalog ve Araç Kapısı
- PDF ve Teklif Listesi
- Çizim Alanı ve Harita
- Paket Bağımlılıkları
- Hesap ve Teknik Resim
- Araç Kapısı 3D
- Yayın İş Akışı
- TypeScript Ayarları
- README Kavramları
- Marka ve Logo

## God Nodes (most connected - your core abstractions)
1. `KapiPlanlayici()` - 47 edges
2. `useTasarim` - 35 edges
3. `sayi()` - 34 edges
4. `Icerik()` - 32 edges
5. `Tasarimci()` - 30 edges
6. `Tasarim` - 29 edges
7. `SoruCevap()` - 27 edges
8. `hesapla()` - 25 edges
9. `Kapi()` - 24 edges
10. `tl()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `AracKapisiSayfasi()` --calls--> `KapiPlanlayici()`  [EXTRACTED]
  app/arac/page.tsx → components/KapiPlanlayici.tsx
- `CitPlanlayiciSayfasi()` --calls--> `Tasarimci()`  [EXTRACTED]
  app/cit/page.tsx → components/Tasarimci.tsx
- `YayaKapisiSayfasi()` --calls--> `KapiPlanlayici()`  [EXTRACTED]
  app/kapi/page.tsx → components/KapiPlanlayici.tsx
- `AnaSayfa()` --calls--> `Karsilama()`  [EXTRACTED]
  app/page.tsx → components/Karsilama.tsx
- `AyarPaneli()` --calls--> `useAyarlar`  [EXTRACTED]
  components/AyarPaneli.tsx → lib/ayarlar.ts

## Import Cycles
- 2-file cycle: `components/KapiPlanlayici.tsx -> components/KapiSoruCevap.tsx -> components/KapiPlanlayici.tsx`

## Hyperedges (group relationships)
- **Planlama → Malzeme/Fiyat → PDF Teklif → Arşiv akışı** — readme_arazi_cizimi, readme_malzeme_secimi, readme_malzeme_listesi_fiyat_kdv, readme_pdf_teklif, readme_teklif_arsivi [INFERRED 0.75]
- **Ayarlar fiyatları tarayıcıda saklanıp hesapta kullanılır** — readme_ayarlar_ekrani, readme_tarayici_yerel_depolama, readme_malzeme_listesi_fiyat_kdv [INFERRED 0.75]
- **AC Tel Örgü visual identity** — public_logo_ac_monogram, public_logo_brand_colors, public_logo_ac_tel_orgu_brand [INFERRED 0.85]

## Communities (16 total, 2 thin omitted)

### Community 0 - "Tasarım ve Teklif Durumu"
Cohesion: 0.06
Nodes (69): CitPlanlayiciSayfasi(), metadata, FiyatOzeti(), ZeminAdimi(), Alan, FIRMA, KISI, MusteriFormu() (+61 more)

### Community 1 - "Kapı Planlayıcı ve Üretim"
Cohesion: 0.07
Nodes (72): AracKapisiSayfasi(), metadata, metadata, YayaKapisiSayfasi(), EkstraAdimi(), TelAdimi(), DolguCizimi(), KapiPlanlayici() (+64 more)

### Community 2 - "Soru-Cevap ve Ayarlar"
Cohesion: 0.09
Nodes (52): AktifBolum, AyarPaneli(), Bolum(), BolumId, BOLUMLER, CIZIM, DemirDirekMaliyeti(), Fiyat() (+44 more)

### Community 3 - "3D Çit Sahnesi"
Cohesion: 0.09
Nodes (52): DETAY_ORAN, betonDokusu(), hucreBoyu(), onbellek, telDokusu(), Arsa(), Babalar(), Belir() (+44 more)

### Community 4 - "Katalog ve Araç Kapısı"
Cohesion: 0.09
Nodes (46): aracKapiWhatsapp(), kapiCizimi(), ozellikler(), AracKapi, aracKapiHesapla(), AracKapiTipi, kanatBoyu(), KAPI_DOLGULARI (+38 more)

### Community 5 - "PDF ve Teklif Listesi"
Cohesion: 0.09
Nodes (34): manrope, metadata, viewport, AnaSayfa(), aracKapiHtml(), Karsilama(), KARTLAR, A4 (+26 more)

### Community 6 - "Çizim Alanı ve Harita"
Cohesion: 0.12
Nodes (39): AraziAdimi(), UyduHarita, ADIMLAR, BOS_GORUNUM, CizimAlani(), Gorunum, sigdir(), sigdirmaliMi() (+31 more)

### Community 7 - "Paket Bağımlılıkları"
Cohesion: 0.06
Nodes (44): dependencies, html2canvas@^1.4.1, jspdf@^3.0.4, leaflet@^1.9.4, next@^15.5.28, react@^19.3.1, react-dom@^19.3.1, @react-three/drei@^10.7.9 (+36 more)

### Community 8 - "Hesap ve Teknik Resim"
Cohesion: 0.11
Nodes (34): aciYayi(), cm(), direkTeknikResim(), eksen(), olcu(), profil(), tr(), ozellikler() (+26 more)

### Community 9 - "Araç Kapısı 3D"
Cohesion: 0.11
Nodes (31): AracKapiSahne(), AyarliMentese(), AyarliMenteseKanat(), BETON_YAKA, bombeliPanel(), boyaMalzemesi(), ciftTelPanel(), cubuk() (+23 more)

### Community 10 - "Yayın İş Akışı"
Cohesion: 0.06
Nodes (32): concurrency, cancel-in-progress, group, runs-on, steps, YAYIN_YOLU, name, url (+24 more)

### Community 11 - "TypeScript Ayarları"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "README Kavramları"
Cohesion: 0.20
Nodes (15): AC Tel Örgü Çit Planlayıcı, Arazi Şekli / Elle Çizim, Kenar Ölçüleri ve Eğim, Ayarlar Ekranı (satış fiyatları, firma bilgileri), Canlı 3D Görünüm (görünüm küpü, köşe yakın çekimi), Direk Türleri (beton, profil, boru), Geliştirme (npm install / dev :3000 / test), GitHub Actions → GitHub Pages Yayını, Göz Aralığı ve Tel Kalınlığına Göre Kafes Tel Fiyatı (+7 more)

### Community 13 - "Marka ve Logo"
Cohesion: 0.50
Nodes (5): AC Tel Örgü Logo, AC Monogram Emblem (blue with red swoosh), AC Tel Örgü Brand, Brand Colors: Blue and Red, Fence Planner UI Branding

## Knowledge Gaps
- **6 isolated node(s):** `Direk Türleri (beton, profil, boru)`, `Koyu ve Açık Tema`, `Geliştirme (npm install / dev :3000 / test)`, `GitHub Actions → GitHub Pages Yayını`, `Brand Colors: Blue and Red` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 132 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Tasarım ve Teklif Durumu` to `Kapı Planlayıcı ve Üretim`, `Soru-Cevap ve Ayarlar`, `3D Çit Sahnesi`, `PDF ve Teklif Listesi`, `Çizim Alanı ve Harita`, `Paket Bağımlılıkları`, `Araç Kapısı 3D`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `Direk Türleri (beton, profil, boru)`, `Koyu ve Açık Tema`, `Geliştirme (npm install / dev :3000 / test)` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tasarım ve Teklif Durumu` be split into smaller, more focused modules?**
  _Cohesion score 0.0638148667601683 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Soru-Cevap ve Ayarlar` to `Tasarım ve Teklif Durumu`, `Kapı Planlayıcı ve Üretim`, `PDF ve Teklif Listesi`, `Paket Bağımlılıkları`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `Kapı Planlayıcı ve Üretim` be split into smaller, more focused modules?**
  _Cohesion score 0.07170143990596532 - nodes in this community are weakly interconnected._
- **Why does `direkRengi()` connect `Katalog ve Araç Kapısı` to `Soru-Cevap ve Ayarlar`, `3D Çit Sahnesi`, `PDF ve Teklif Listesi`, `Hesap ve Teknik Resim`, `Araç Kapısı 3D`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Soru-Cevap ve Ayarlar` be split into smaller, more focused modules?**
  _Cohesion score 0.08590441621294616 - nodes in this community are weakly interconnected._