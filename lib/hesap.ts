// Hesap motoru: direk yerleşimi, malzeme listesi ve fiyat.
// Saf fonksiyonlardır; hem 3D sahne hem malzeme tablosu bunları kullanır.
import { Ayarlar, KAS_UZUNLUK, VARSAYILAN_AYARLAR, direkRengi, direkTipi, olcuAnahtari, telTipi, ustOlcu } from "./katalog";
import { disNormal } from "./geometri";
import { Kapi, Kenar, Tasarim, kenarlariHesapla, sekilNoktalari } from "./tasarim";

export type Nokta = [number, number, number];
export type DirekRol = "ara" | "kose" | "gergi" | "uc" | "kapi";

export interface Direk {
  p: Nokta;
  rol: DirekRol;
  /** Çitin bu direkteki doğrultusu (xz birim vektör). */
  yon: [number, number];
  /** Çitin dış tarafı (xz birim vektör): eğik kaş ve üst teller bu yöne açılır. */
  dis: [number, number];
  /** Tek köşe direğinde ikinci kenarın dış yönü: profil + eğik kaşta köşeden iki kaş çıkar. */
  dis2?: [number, number];
  /** Payanda yönleri (xz düzleminde birim vektör, çite doğru). */
  payanda: [number, number][];
}

export interface Kosu {
  // Kapılar arasında kalan kesintisiz çit parçası
  a: Nokta;
  b: Nokta;
  uzunluk: number; // gerçek (eğimli) uzunluk
}

/** Kapı babası: kapının iki yanındaki kalın demir kolon (çit direği yerine geçer). */
export interface KapiBabasi {
  p: Nokta;
  tur: "yaya" | "arac"; // iki kapı aynı babayı paylaşırsa büyük olan (araç)
}

/** Kapı babası boyu: yükseklik + gömme (toprakta 60 cm, betonda flanş) + kapı üstü payı, çeyrek metreye. */
export const babaBoyu = (t: Tasarim) => Math.ceil((t.tel.yukseklik + 0.15 + (flansliZemin(t) ? 0 : 0.6)) * 4 - 1e-9) / 4;

export interface KapiYeri {
  kapi: Kapi;
  a: Nokta;
  b: Nokta;
}

export interface Kalem {
  grup: "Tel" | "Direk" | "Bağlantı" | "Kapı" | "Hizmet";
  ad: string;
  miktar: number;
  birim: string;
  birimFiyat: number;
  tutar: number;
}

export interface Sonuc {
  kenarlar: Kenar[];
  direkler: Direk[];
  kosular: Kosu[];
  kapilar: KapiYeri[];
  babalar: KapiBabasi[];
  cevre: number; // toplam kenar (aktif) uzunluğu
  telUzunluk: number; // kapılar düşülmüş çit uzunluğu
  sayilar: Record<DirekRol, number> & { payanda: number; toplamDirek: number };
  kalemler: Kalem[];
  /** Tel siparişi: kaç rulo / panel */
  paket: { adet: number; birim: "rulo" | "panel" };
  grupToplam: Partial<Record<Kalem["grup"], number>>;
  araToplam: number;
  kdv: number;
  toplam: number;
}

const lerp = (a: Nokta, b: Nokta, t: number): Nokta => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const EPS = 0.05;
/** Çift köşe direğinde iki direk arası (m) */
export const CIFT_ARALIK = 0.2;

/** Kenar üzerindeki kapıları sığacak şekilde sıralar ve sınırlar. */
function kenarKapilari(kapilar: Kapi[], kenar: Kenar) {
  const L = kenar.yatay;
  const sonuc: { kapi: Kapi; s: number; e: number }[] = [];
  let min = 0;
  for (const k of kapilar.filter((k) => k.kenar === kenar.i).sort((a, b) => a.konum - b.konum)) {
    const g = Math.min(k.genislik, L);
    const s = Math.min(Math.max(k.konum, min), L - g);
    if (s < min - EPS) continue; // sığmayan kapı yok sayılır
    sonuc.push({ kapi: k, s, e: s + g });
    min = s + g;
  }
  return sonuc;
}

/** Profil direk + eğik kaş: köşe tek direk, üstünden her kenarın dışına birer kaş (iki kaş) çıkar. */
export const ikiKasliKose = (t: Tasarim) =>
  t.direk.tip === "profil" && t.direk.kasli && t.direk.kasTipi === "egik";

/**
 * Köşeler çift direk mi: örgü (kafes) telde her zaman; panel çitte yalnızca eğik kaşlı direkte.
 * Profil direkte eğik kaş seçiliyse köşe tek direktir (iki kaşlı). Diğer tel tiplerinde köşe tek direk.
 */
export const ciftKose = (t: Tasarim) =>
  !ikiKasliKose(t) &&
  (t.tel.tip === "kafes" || (t.tel.tip === "panel" && t.direk.kasli && t.direk.kasTipi === "egik"));

/** Panel çitte payanda yok; yalnızca eğik kaşlı direkte payanda kullanılır. */
/** Beton zemin ve duvar üstünde direk gömülmez: flanşlı demir direk dübelle sabitlenir. */
/**
 * Kaş kolu uzunluğu, m: düzlemsel jiletli tel takılınca kol halka çapı kadar uzar
 * (halka kola boydan boya yaslanır); diğer durumlarda sabit KAS_UZUNLUK.
 */
export const kasUzunlugu = (t: Tasarim) =>
  !t.direk.kasli ? 0 : t.ekstra.ustTel === "duzlemsel" && t.tel.tip !== "dikenli" ? t.ekstra.duzlemselCap / 100 : KAS_UZUNLUK;

export const flansliZemin = (t: Pick<Tasarim, "zemin">) => t.zemin !== "toprak";

// Duvar üstünde payandaya yer yok (duvar dar); direkler flanşla taşır
export const payandaVar = (t: Tasarim) => t.zemin !== "duvar" && (t.tel.tip !== "panel" || (t.direk.kasli && t.direk.kasTipi === "egik"));

export function yerlesim(t: Tasarim, babaVar = true) {
  const kenarlar = kenarlariHesapla(t);
  const tip = telTipi(t.tel.tip);
  const aralik = Math.max(0.5, t.direk.aralik || tip.varsayilanAralik);
  const { kapali } = sekilNoktalari(t);
  const n = kenarlar.length;

  const direkler: Direk[] = [];
  const kosular: Kosu[] = [];
  const kapiYerleri: KapiYeri[] = [];
  // Köşe direkleri kenarlar arasında paylaşılır: köşe indeksi → direk
  const koseler = new Map<number, Direk>();
  // Köşede her payanda yönüne, o kenarın dış yönü eşlik eder (çift köşede ikiz kendi kenarının dışına bakar)
  const koseDislari = new Map<Direk, [number, number][]>();
  const koseDirek = (vi: number, p: Nokta, yon: [number, number], dis: [number, number]) => {
    let d = koseler.get(vi);
    if (!d) {
      d = { p, rol: "uc", yon, dis, payanda: [] };
      koseler.set(vi, d);
      koseDislari.set(d, []);
      direkler.push(d);
    }
    return d;
  };
  const kosePayanda = (d: Direk, yonu: [number, number], dis: [number, number]) => {
    d.payanda.push(yonu);
    koseDislari.get(d)!.push(dis);
  };
  // Dış taraf: kenarın ortasında sınanır (köşe noktası çizginin üstünde olduğundan orada sınamak yanılır).
  // Açık çizgide noktaların oluşturduğu çokgen kullanılır; iki noktalı hatta sabit bir yan seçilir.
  const { noktalar } = sekilNoktalari(t);
  const disPoli = noktalar.length >= 3 ? noktalar : null;

  for (const k of kenarlar) {
    if (!k.aktif || k.yatay < EPS) continue;
    const ux = (k.son[0] - k.bas[0]) / k.yatay;
    const uz = (k.son[2] - k.bas[2]) / k.yatay;
    const oran = k.gercek / k.yatay;
    const nokta = (s: number) => lerp(k.bas, k.son, s / k.yatay);
    const yon: [number, number] = [ux, uz];
    const orta: Nokta = lerp(k.bas, k.son, 0.5);
    const dis = disNormal(orta, yon, disPoli);

    const kapilar = kenarKapilari(t.ekstra.kapilar, k);
    for (const g of kapilar) kapiYerleri.push({ kapi: g.kapi, a: nokta(g.s), b: nokta(g.e) });

    // Kapıların arasında kalan çit aralıkları
    const araliklar: [number, number][] = [];
    let bas = 0;
    for (const g of kapilar) {
      araliklar.push([bas, g.s]);
      bas = g.e;
    }
    araliklar.push([bas, k.yatay]);

    for (const [s, e] of araliklar) {
      const uzunluk = e - s;
      const basKose = s < EPS;
      const sonKose = e > k.yatay - EPS;
      // Kapı yanında kalan çok kısa parça: sadece kapı direği. Kapı köşeye dayalıysa direk
      // köşe direğidir; komşu kenar (yoksa, çitsizse ya da o da kapıysa) onu eklemeyebilir.
      if (uzunluk < EPS) {
        if (basKose) koseDirek(k.i, nokta(s), yon, dis);
        else if (sonKose) koseDirek((k.i + 1) % (kapali ? n : n + 1), nokta(e), yon, dis);
        else direkler.push({ p: nokta(s), rol: "kapi", yon, dis, payanda: [] });
        continue;
      }
      kosular.push({ a: nokta(s), b: nokta(e), uzunluk: uzunluk * oran });

      const adet = Math.max(1, Math.ceil(uzunluk / aralik - 1e-9));
      const adim = uzunluk / adet;
      // Kullanıcının seçtiği "kaç direkte bir payanda": her N'inci ara direk payandalı gergi direği
      const gergiHer = Math.max(0, Math.round(t.direk.payandaHer));

      for (let j = 0; j <= adet; j++) {
        const pos = s + j * adim;
        const p = nokta(pos);
        if (j === 0) {
          if (basKose) kosePayanda(koseDirek(k.i, p, yon, dis), [ux, uz], dis);
          else direkler.push({ p, rol: "kapi", yon, dis, payanda: [[ux, uz]] });
        } else if (j === adet) {
          if (sonKose) kosePayanda(koseDirek((k.i + 1) % (kapali ? n : n + 1), p, yon, dis), [-ux, -uz], dis);
          else direkler.push({ p, rol: "kapi", yon, dis, payanda: [[-ux, -uz]] });
        } else if (gergiHer && j % gergiHer === 0) {
          direkler.push({ p, rol: "gergi", yon, dis, payanda: [[ux, uz], [-ux, -uz]] });
        } else {
          direkler.push({ p, rol: "ara", yon, dis, payanda: [] });
        }
      }
    }
  }

  // Köşe rolleri: iki yönde çit varsa köşe (düz devam ediyorsa gergi), tek yönde uç
  for (const d of koseler.values()) {
    if (d.payanda.length >= 2) {
      const [a, b] = d.payanda;
      const duz = a[0] * b[0] + a[1] * b[1] < -0.98;
      d.rol = duz ? "gergi" : "kose";
    } else d.rol = d.payanda.length ? "uc" : "kapi"; // payandasız köşe: iki yanı da kapı / boş
  }

  // Tek köşe direğinde iki kaş: kaşlar iki kenarın dışına ayrı ayrı bakar
  if (ikiKasliKose(t))
    for (const d of koseler.values()) {
      if (d.rol !== "kose") continue;
      const [disA, disB] = koseDislari.get(d)!;
      d.dis = disA;
      d.dis2 = disB;
    }

  // Çift köşe direği: ikinci direk ikinci kenar boyunca hemen yanına, payandalar ikisine birer tane
  if (ciftKose(t))
    for (const d of [...koseler.values()]) {
      if (d.rol !== "kose") continue;
      const [a, b] = d.payanda;
      const [disA, disB] = koseDislari.get(d)!;
      d.payanda = [a];
      d.dis = disA; // köşedeki direk ilk kenarın, ikizi ikinci kenarın dışına bakar
      direkler.push({ p: [d.p[0] + b[0] * CIFT_ARALIK, d.p[1], d.p[2] + b[1] * CIFT_ARALIK], rol: "kose", yon: b, dis: disB, payanda: [b] });
    }

  // Payandasız çit (panel, eğik kaş yok): payandalar kalkar, gergi direkleri sıradan ara direk olur
  if (!payandaVar(t))
    for (const d of direkler) {
      d.payanda = [];
      if (d.rol === "gergi") d.rol = "ara";
    }

  // Kapı babaları: kapı kenarlarındaki çit direklerinin yerine geçer (aynı noktadaki direkler kalkar)
  const babalar: KapiBabasi[] = [];
  if (babaVar) {
    for (const g of kapiYerleri)
      for (const p of [g.a, g.b]) {
        const var_ = babalar.find((x) => Math.hypot(x.p[0] - p[0], x.p[2] - p[2]) < 0.06);
        if (var_) {
          if (g.kapi.tur === "arac") var_.tur = "arac";
        } else babalar.push({ p, tur: g.kapi.tur });
      }
    const yakin = (d: Direk) => babalar.some((x) => Math.hypot(x.p[0] - d.p[0], x.p[2] - d.p[2]) < 0.06);
    for (let i = direkler.length - 1; i >= 0; i--) if (yakin(direkler[i])) direkler.splice(i, 1);
  }

  return { kenarlar, direkler, kosular, kapilar: kapiYerleri, babalar };
}

const yuvarla = (x: number, b = 2) => Math.round(x * 10 ** b) / 10 ** b;
/** Kalem adlarında Türkçe ondalık: 1.5 → "1,5" */
const tr = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

/** Toprağa gömülen kısım: beton zeminde direk gömülmez, ayak plakasına oturur. */
export const gommePayi = (t: Tasarim) => (flansliZemin(t) ? 0 : direkTipi(t.direk.tip).gomme);

/** Sipariş edilecek direk boyu (25 cm'ye yukarı yuvarlanır): çit + gömme + kaş. */
export const direkBoyu = (t: Tasarim) =>
  Math.ceil((t.tel.yukseklik + gommePayi(t) + kasUzunlugu(t)) * 4 - 1e-9) / 4;

/** Yükseklik anahtarı: 1.5 → "1.5" */
export const yukseklikAnahtari = (h: number) => String(Math.round(h * 100) / 100);

/** Telin çit metresi (metretül) fiyatı. Kafes tel: yükseklik + göz aralığı + tel kalınlığına göre. */
export function telMetreFiyati(t: Tasarim, h: number, ay: Ayarlar) {
  const yh = yukseklikAnahtari(h);
  if (t.tel.tip === "kafes")
    return ay.kafesMetre?.[yh]?.[olcuAnahtari(t.tel.goz)]?.[olcuAnahtari(t.tel.kalinlik)] ?? ay.telMetre.kafes[yh] ?? 0;
  if (t.tel.tip === "dikenli") return ay.dikenliMetre;
  return ay.telMetre[t.tel.tip]?.[yh] ?? 0;
}

export function hesapla(t: Tasarim, ay: Ayarlar = VARSAYILAN_AYARLAR): Sonuc {
  const { kenarlar, direkler, kosular, kapilar, babalar } = yerlesim(t, ay.kapiBabasi.etkin);
  const tip = telTipi(t.tel.tip);
  const dt = direkTipi(t.direk.tip);
  const h = t.tel.yukseklik;
  const telUzunluk = kosular.reduce((s, k) => s + k.uzunluk, 0);
  const cevre = kenarlar.filter((k) => k.aktif).reduce((s, k) => s + k.gercek, 0);

  const sayilar = { ara: 0, kose: 0, gergi: 0, uc: 0, kapi: 0, payanda: 0, toplamDirek: direkler.length };
  for (const d of direkler) {
    sayilar[d.rol]++;
    sayilar.payanda += d.payanda.length;
  }

  const kalemler: Kalem[] = [];
  const ekle = (k: Omit<Kalem, "tutar">) => {
    if (k.miktar <= 0) return;
    // Tutarlar tam lira: yazdırılan satırlar, ara toplam, KDV ve toplam birbirini tutsun
    kalemler.push({ ...k, miktar: yuvarla(k.miktar), tutar: Math.round(yuvarla(k.miktar) * k.birimFiyat) });
  };
  const metre = Math.ceil(telUzunluk - 1e-9); // satış tam metre üzerinden
  const pvc = t.tel.kaplama === "pvc";
  const boyali = dt.id !== "beton" && t.direk.renk !== "galvaniz";
  // Demir direk: boydan bağımsız sabit maliyet (kaynak, kapak, boya, nakliye…) + boy × metre.
  // Eski (dondurulmuş) tekliflerde eski model: sabit yok, boya metre fiyatına % olarak.
  const dd = ay.demirDirek;
  const demir = dt.id !== "beton";
  const eskiModel = !demir || dd.eskiModel;
  const direkFiyat = (olcu: string) => (ay.direkMetre[dt.id]?.[olcu] ?? 0) * (demir && dd.eskiModel && boyali ? 1 + ay.boyaFarkYuzde / 100 : 1);
  const direkSabit = eskiModel ? 0 : dd.kaynak + dd.kapak + dd.nakliye + dd.diger + (boyali ? dd.boya : 0);
  const fiyatBoyu = (b: number) => (eskiModel ? b : Math.max(b, dd.asgariBoy));

  // --- Tel (₺ / metre) ---
  let paket: Sonuc["paket"];
  if (tip.id === "dikenli") {
    const rulo = Math.ceil((telUzunluk * t.tel.sira * 1.03) / tip.ruloBoyu);
    paket = { adet: rulo, birim: "rulo" };
    ekle({
      grup: "Tel",
      ad: `Dikenli tel ${tr(t.tel.kalinlik)} mm · ${t.tel.sira} sıra (${rulo} rulo)`,
      miktar: metre * t.tel.sira,
      birim: "m",
      birimFiyat: ay.dikenliMetre,
    });
  } else {
    const adet =
      tip.satis === "panel"
        ? kosular.reduce((s, k) => s + Math.ceil(k.uzunluk / tip.panelGenislik - 1e-9), 0)
        : Math.ceil((telUzunluk * 1.02) / tip.ruloBoyu);
    paket = { adet, birim: tip.satis };
    ekle({
      grup: "Tel",
      ad: `${tip.ad} ${tr(h)} m · ${t.tel.goz} mm göz · ${tr(t.tel.kalinlik)} mm${pvc ? " · PVC" : ""} (${adet} ${tip.satis})`,
      miktar: metre,
      birim: "m",
      birimFiyat: telMetreFiyati(t, h, ay) * (pvc ? 1 + ay.pvcFarkYuzde / 100 : 1),
    });
  }

  // --- Direkler (₺ / metre direk boyu) ---
  const boy = direkBoyu(t);
  const anaOlcu = t.direk.olcu;
  const gucluOlcu = ustOlcu(dt, anaOlcu);
  // Beton zeminde demir direk flanşlı: her direğin sabit bir temeli var (flanş + kaynak
  // işçiliği, boydan bağımsız); üstüne profilin/borunun boyu kadar metre fiyatı eklenir
  const flansli = flansliZemin(t);
  const direkBirim = (olcu: string) => (flansli ? ay.flansAdet : 0) + direkSabit + fiyatBoyu(boy) * direkFiyat(olcu);
  const flansYazi = (flansli ? " flanşlı" : "") + (boyali ? ` ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}` : "");
  const kasli = t.direk.kasli ? { egik: " eğik kaşlı", duz: " düz kaşlı", v: " V kaşlı" }[t.direk.kasTipi] : "";
  ekle({
    grup: "Direk",
    ad: `Ara direk ${dt.ad.split(" ")[0]} ${anaOlcu}${flansYazi}${kasli} · ${tr(boy)} m`,
    miktar: sayilar.ara,
    birim: "adet",
    birimFiyat: direkBirim(anaOlcu),
  });
  const guclu = sayilar.kose + sayilar.gergi + sayilar.uc + sayilar.kapi;
  ekle({
    grup: "Direk",
    ad: `Köşe / gergi / kapı direği ${gucluOlcu}${flansYazi}${kasli} · ${tr(boy)} m`,
    miktar: guclu,
    birim: "adet",
    birimFiyat: direkBirim(gucluOlcu),
  });
  // Profil + eğik kaşta tek köşe direğine ikinci kaş kolu kaynak edilir
  if (ikiKasliKose(t) && sayilar.kose > 0) {
    const kol = kasUzunlugu(t);
    ekle({
      grup: "Direk",
      ad: `Köşe direği ek kaş kolu (eğik) ${gucluOlcu} · ${tr(kol)} m`,
      miktar: sayilar.kose,
      birim: "adet",
      birimFiyat: kol * direkFiyat(gucluOlcu),
    });
  }
  const payandaBoy = Math.ceil(h * 1.3 * 4) / 4;
  ekle({
    grup: "Direk",
    ad: `Payanda ${anaOlcu}${boyali ? ` ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}` : ""} · ${tr(payandaBoy)} m`,
    miktar: sayilar.payanda,
    birim: "adet",
    birimFiyat: (eskiModel ? 0 : dd.payandaSabit + (boyali ? dd.boya / 2 : 0)) + payandaBoy * direkFiyat(anaOlcu),
  });

  // --- Bağlantı elemanları ---
  if (tip.id === "kafes" || tip.id === "tavuk") {
    const sira = h >= 1.5 ? 3 : 2;
    ekle({
      grup: "Bağlantı",
      ad: `Gergi teli (${sira} sıra)`,
      miktar: Math.ceil(telUzunluk * sira * 1.05),
      birim: "m",
      birimFiyat: ay.gergiTeliMetre,
    });
    ekle({
      grup: "Bağlantı",
      ad: "Gergi demiri",
      miktar: sira * sayilar.payanda,
      birim: "adet",
      birimFiyat: ay.gergiDemiri,
    });
  }
  if (tip.id === "panel") {
    ekle({
      grup: "Bağlantı",
      ad: "Panel kelepçesi",
      miktar: direkler.length * (h < 1.5 ? 3 : 4),
      birim: "adet",
      birimFiyat: ay.kelepce,
    });
  } else {
    ekle({
      grup: "Bağlantı",
      ad: "Bağ teli",
      miktar: Math.max(1, Math.ceil(telUzunluk * 0.02)),
      birim: "kg",
      birimFiyat: ay.bagTeliKg,
    });
  }

  // --- Beton zemine / duvara sabitleme: dübel (flanş ve kaynağı direk fiyatında) ---
  if (flansliZemin(t)) {
    ekle({
      grup: "Bağlantı",
      ad: `Dübel (direk başına ${ay.dubelDirek}${ay.dubelPayanda ? `, payanda başına ${ay.dubelPayanda}` : ""})`,
      miktar: (direkler.length + babalar.length) * ay.dubelDirek + sayilar.payanda * ay.dubelPayanda,
      birim: "adet",
      birimFiyat: ay.dubelAdet,
    });
  }

  // --- Üst tel ---
  if (t.ekstra.ustTel === "dikenli") {
    // V kaşta sıralar iki kola da çekilir
    const vKas = t.direk.kasli && t.direk.kasTipi === "v";
    const sira = t.ekstra.ustSira * (vKas ? 2 : 1);
    ekle({
      grup: "Tel",
      ad: `Üst dikenli tel · ${vKas ? `iki kolda ${t.ekstra.ustSira}+${t.ekstra.ustSira}` : t.ekstra.ustSira} sıra (${Math.ceil((telUzunluk * sira * 1.03) / 100)} rulo)`,
      miktar: metre * sira,
      birim: "m",
      birimFiyat: ay.dikenliMetre,
    });
  } else if (t.ekstra.ustTel === "jiletli") {
    ekle({
      grup: "Tel",
      ad: `Helezon jiletli tel Ø${t.ekstra.jiletliCap} cm (${Math.ceil(telUzunluk / 10)} rulo)`,
      miktar: metre,
      birim: "m",
      birimFiyat: ay.jiletliCapMetre?.[String(t.ekstra.jiletliCap)] ?? ay.jiletliMetre,
    });
  } else if (t.ekstra.ustTel === "duzlemsel") {
    ekle({
      grup: "Tel",
      ad: `Düzlemsel jiletli tel Ø${t.ekstra.duzlemselCap} cm (${Math.ceil((telUzunluk * 1.02) / 15)} rulo)`,
      miktar: metre,
      birim: "m",
      birimFiyat: ay.duzlemselCapMetre?.[String(t.ekstra.duzlemselCap)] ?? ay.duzlemselMetre,
    });
  }

  // --- Kapılar ---
  for (const tur of ["yaya", "arac"] as const) {
    const liste = kapilar.filter((k) => k.kapi.tur === tur);
    if (!liste.length) continue;
    ekle({
      grup: "Kapı",
      ad: tur === "yaya" ? "Yaya kapısı" : "Araç kapısı (çift kanat)",
      miktar: liste.length,
      birim: "adet",
      birimFiyat: tur === "yaya" ? ay.kapiYaya : ay.kapiArac,
    });
  }
  // Kapı babaları: kalın demir kolon; demir direk sabit maliyeti (+ flanş) + boy × metre
  const bBoy = babaBoyu(t);
  const bBoyali = t.direk.tip !== "beton" && t.direk.renk !== "galvaniz";
  const bSabit = dd.kaynak + dd.kapak + dd.nakliye + dd.diger + (bBoyali ? dd.boya : 0) + (flansli ? ay.flansAdet : 0);
  for (const tur of ["arac", "yaya"] as const) {
    const n = babalar.filter((x) => x.tur === tur).length;
    if (!n) continue;
    const olcu = tur === "arac" ? ay.kapiBabasi.aracOlcu : ay.kapiBabasi.yayaOlcu;
    ekle({
      grup: "Kapı",
      ad: `${tur === "arac" ? "Araç" : "Yaya"} kapısı babası ${olcu}${flansli ? " flanşlı" : ""}${bBoyali ? ` ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}` : ""} · ${tr(bBoy)} m`,
      miktar: n,
      birim: "adet",
      birimFiyat: (dd.eskiModel ? 0 : bSabit) + Math.max(bBoy, dd.eskiModel ? 0 : dd.asgariBoy) * (ay.kapiBabasi.metre[olcu] ?? 0),
    });
  }

  // --- Hizmetler ---
  // Beton zeminde direk gömülmediği için temel yok; sabitleme Bağlantı grubunda
  if (t.ekstra.temel && t.zemin === "toprak")
    ekle({ grup: "Hizmet", ad: "Direk beton temeli", miktar: direkler.length, birim: "adet", birimFiyat: ay.temelDirek });
  if (t.ekstra.montaj)
    ekle({
      grup: "Hizmet",
      ad: t.zemin === "duvar" ? `Duvar üstü montaj işçiliği (duvar ${tr(t.duvarYukseklik)} m)` : "Montaj işçiliği",
      miktar: Math.ceil(cevre - 1e-9),
      birim: "m",
      birimFiyat: t.zemin === "duvar" ? ay.montajDuvarMetre : ay.montajMetre,
    });
  if (t.ekstra.nakliye)
    ekle({
      grup: "Hizmet",
      ad: `Nakliye (${t.ekstra.nakliyeKm} km)`,
      miktar: 1,
      birim: "sefer",
      birimFiyat: ay.nakliyeSabit + t.ekstra.nakliyeKm * ay.nakliyeKm,
    });

  const araToplam = yuvarla(kalemler.reduce((s, k) => s + k.tutar, 0));
  const kdv = Math.round((araToplam * ay.kdvYuzde) / 100);
  const grupToplam = {} as Record<Kalem["grup"], number>;
  for (const k of kalemler) grupToplam[k.grup] = yuvarla((grupToplam[k.grup] ?? 0) + k.tutar);
  return {
    paket,
    grupToplam,
    kenarlar,
    direkler,
    kosular,
    kapilar,
    babalar,
    cevre,
    telUzunluk,
    sayilar,
    kalemler,
    araToplam,
    kdv,
    toplam: yuvarla(araToplam + kdv),
  };
}
