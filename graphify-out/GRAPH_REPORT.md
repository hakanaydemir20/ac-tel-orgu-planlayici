# Graph Report - çit planlayıcı  (2026-11-02)

## Corpus Check
- 77 files · ~71,916 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 1, .css 1, .obj 1)

## Summary
- 654 nodes · 2219 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5e4ae7a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
1. `KapiPlanlayici()` - 48 edges
2. `useTasarim` - 35 edges
3. `Icerik()` - 34 edges
4. `sayi()` - 34 edges
5. `Tasarimci()` - 31 edges
6. `Tasarim` - 29 edges
7. `SoruCevap()` - 27 edges
8. `hesapla()` - 26 edges
9. `tl()` - 25 edges
10. `Kapi()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Bölüm haritası (graphify kümeleri)` --references--> `TemaDugmesi()`  [INFERRED]
  CLAUDE.md → components/TemaDugmesi.tsx
- `Kurallar` --references--> `Icerik()`  [INFERRED]
  CLAUDE.md → components/sahne/Sahne.tsx
- `Kurallar` --references--> `hesapla()`  [INFERRED]
  CLAUDE.md → lib/hesap.ts
- `Bölüm haritası (graphify kümeleri)` --references--> `FiyatOzeti()`  [INFERRED]
  CLAUDE.md → components/FiyatOzeti.tsx
- `Kurallar` --references--> `KapiPlanlayici()`  [INFERRED]
  CLAUDE.md → components/KapiPlanlayici.tsx

## Import Cycles
- 2-file cycle: `components/KapiPlanlayici.tsx -> components/KapiSoruCevap.tsx -> components/KapiPlanlayici.tsx`

## Hyperedges (group relationships)
- **Ayarlar fiyatları tarayıcıda saklanıp hesapta kullanılır** — readme_ayarlar_ekrani, readme_tarayici_yerel_depolama, readme_malzeme_listesi_fiyat_kdv [INFERRED 0.75]
- **Planlama → Malzeme/Fiyat → PDF Teklif → Arşiv akışı** — readme_arazi_cizimi, readme_malzeme_secimi, readme_malzeme_listesi_fiyat_kdv, readme_pdf_teklif, readme_teklif_arsivi [INFERRED 0.75]
- **AC Tel Örgü visual identity** — public_logo_ac_monogram, public_logo_brand_colors, public_logo_ac_tel_orgu_brand [INFERRED 0.85]

## Communities (16 total, 2 thin omitted)

### Community 0 - "Tasarım ve Teklif Durumu"
Cohesion: 0.07
Nodes (82): AracKapisiSayfasi(), metadata, CitPlanlayiciSayfasi(), metadata, metadata, YayaKapisiSayfasi(), AC Tel Örgü Planlayıcı — çalışma dizini, Bölüm haritası (graphify kümeleri) (+74 more)

### Community 1 - "Kapı Planlayıcı ve Üretim"
Cohesion: 0.06
Nodes (95): aracKapiHtml(), aracKapiWhatsapp(), kapiCizimi(), ozellikler(), cm(), dikeyOlcu(), kanatOn(), kapiOnGorunus() (+87 more)

### Community 2 - "Soru-Cevap ve Ayarlar"
Cohesion: 0.10
Nodes (39): AktifBolum, AyarPaneli(), Bolum(), BolumId, BOLUMLER, CIZIM, DemirDirekMaliyeti(), Fiyat() (+31 more)

### Community 3 - "3D Çit Sahnesi"
Cohesion: 0.06
Nodes (70): betonDokusu(), hucreBoyu(), onbellek, telDokusu(), Arsa(), Babalar(), Belir(), BETON_MODEL (+62 more)

### Community 4 - "Katalog ve Araç Kapısı"
Cohesion: 0.06
Nodes (58): AracKapiDonuk, AracKapiTeklifi, bosTeklif(), Durum, storeOlustur(), useAracKapi, useYayaKapi, Durum (+50 more)

### Community 5 - "PDF ve Teklif Listesi"
Cohesion: 0.13
Nodes (11): manrope, metadata, viewport, AnaSayfa(), Karsilama(), KARTLAR, TemaDugmesi(), Tema (+3 more)

### Community 6 - "Çizim Alanı ve Harita"
Cohesion: 0.13
Nodes (36): ADIMLAR, BOS_GORUNUM, CizimAlani(), Gorunum, sigdir(), sigdirmaliMi(), TURKIYE, UyduHarita() (+28 more)

### Community 7 - "Paket Bağımlılıkları"
Cohesion: 0.06
Nodes (41): dependencies, html2canvas@^1.4.1, jspdf@^3.0.4, leaflet@^1.9.4, next@^15.5.28, react@^19.3.1, react-dom@^19.3.1, @react-three/drei@^10.7.9 (+33 more)

### Community 8 - "Hesap ve Teknik Resim"
Cohesion: 0.08
Nodes (57): aciYayi(), cm(), direkTeknikResim(), eksen(), olcu(), profil(), tr(), B() (+49 more)

### Community 9 - "Araç Kapısı 3D"
Cohesion: 0.40
Nodes (4): AC Tel Örgü · Çit Planlayıcı, Geliştirme, Neler yapar, 👉 [Uygulamayı tarayıcıda aç](https://hakanaydemir20.github.io/ac-tel-orgu-planlayici/)

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
- **6 isolated node(s):** `Direk Türleri (beton, profil, boru)`, `GitHub Actions → GitHub Pages Yayını`, `Koyu ve Açık Tema`, `Geliştirme (npm install / dev :3000 / test)`, `Brand Colors: Blue and Red` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 146 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Tasarım ve Teklif Durumu` to `Kapı Planlayıcı ve Üretim`, `Soru-Cevap ve Ayarlar`, `3D Çit Sahnesi`, `Katalog ve Araç Kapısı`, `PDF ve Teklif Listesi`, `Çizim Alanı ve Harita`, `Paket Bağımlılıkları`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `Direk Türleri (beton, profil, boru)`, `GitHub Actions → GitHub Pages Yayını`, `Koyu ve Açık Tema` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tasarım ve Teklif Durumu` be split into smaller, more focused modules?**
  _Cohesion score 0.06805671392827356 - nodes in this community are weakly interconnected._
- **Why does `next` connect `Tasarım ve Teklif Durumu` to `Soru-Cevap ve Ayarlar`, `PDF ve Teklif Listesi`, `Paket Bağımlılıkları`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Should `Kapı Planlayıcı ve Üretim` be split into smaller, more focused modules?**
  _Cohesion score 0.055345911949685536 - nodes in this community are weakly interconnected._
- **Why does `direkRengi()` connect `Kapı Planlayıcı ve Üretim` to `Hesap ve Teknik Resim`, `Soru-Cevap ve Ayarlar`, `3D Çit Sahnesi`, `Katalog ve Araç Kapısı`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Soru-Cevap ve Ayarlar` be split into smaller, more focused modules?**
  _Cohesion score 0.09513742071881606 - nodes in this community are weakly interconnected._