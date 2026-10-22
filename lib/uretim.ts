// Üretim planı: kesim listesi (profil, parça boyu, adet), 6 m'lik boylardan kesim
// optimizasyonu ve alınacak hırdavat/sarf malzeme. Çit ve kapı planlayıcıları ortak kullanır.
import { type AracKapi, type KapiAilesi, kanatBoyu, rayBoyu, surgulu } from "./aracKapi";
import { cerceveProfili, kanatliKolonBoyu, kapiKanatlari, surguluBabaYuksekligi } from "./kapiYapi";
import { type Sonuc, babaBoyu, direkBoyu, flansliZemin, ikiKasliKose, kasUzunlugu } from "./hesap";
import { type Ayarlar, direkTipi, ustOlcu } from "./katalog";
import type { Tasarim } from "./tasarim";

export const BOY_CM = 600; // ticari profil boyu
const TESTERE_CM = 0.3; // kesim payı (testere kalınlığı)

/** Kesilecek parça grubu. */
export interface KesimParca {
  profil: string; // "40x40 kutu profil"
  ad: string; // "Ara direk"
  boyCm: number;
  adet: number;
  /** Kesim şekli: kapı çerçevesi 45° gönye, diğerleri düz */
  kesim?: string;
}

/** Hazır alınan / kesilmeyen malzeme ve hırdavat. */
export interface Sarf {
  ad: string;
  adet: number;
  birim: string;
}

export interface ProfilAlimi {
  profil: string;
  parcaAdet: number;
  toplamCm: number;
  boy: number; // alınacak 6 m boy sayısı
  fireYuzde: number;
  /** Boyların kesim düzeni: her boyda kesilen parça boyları */
  plan: number[][];
}

export interface UretimPlani {
  baslik: string;
  kesim: KesimParca[];
  alim: ProfilAlimi[];
  sarf: Sarf[];
  notlar: string[];
  /** Kaynakçı ve kesimci için ara bölme / aralık ölçüleri */
  olcuNotlari?: string[];
}

/**
 * Bir profil için kesim optimizasyonu (ilk uyan, azalan sıra): parçalar 6 m boylara yerleşir.
 * 6 m'den uzun parça varsa ek kaynaklı boy olarak ayrıca sayılır.
 */
export function boyPlani(parcalar: number[], boyCm = BOY_CM): number[][] {
  const sirali = [...parcalar].sort((a, b) => b - a);
  const boylar: { kalan: number; kesimler: number[] }[] = [];
  for (const p of sirali) {
    if (p > boyCm) {
      // Uzun parça: tam boylar + artan kısım ayrı parça olarak yeniden yerleşir
      const tam = Math.floor(p / boyCm);
      for (let i = 0; i < tam; i++) boylar.push({ kalan: 0, kesimler: [boyCm] });
      const artan = Math.round((p - tam * boyCm) * 10) / 10;
      if (artan > 0) sirali.push(artan);
      continue;
    }
    const yer = boylar.find((b) => b.kalan >= p + TESTERE_CM || b.kalan === p);
    if (yer) {
      yer.kesimler.push(p);
      yer.kalan = Math.round((yer.kalan - p - TESTERE_CM) * 10) / 10;
    } else boylar.push({ kalan: Math.round((boyCm - p - TESTERE_CM) * 10) / 10, kesimler: [p] });
  }
  return boylar.map((b) => b.kesimler);
}

/** Kesim listesinden profil başına alım özeti. */
export function alimHesapla(kesim: KesimParca[]): ProfilAlimi[] {
  const profiller = [...new Set(kesim.map((k) => k.profil))];
  return profiller.map((profil) => {
    const parcalar = kesim.filter((k) => k.profil === profil).flatMap((k) => Array.from({ length: k.adet }, () => k.boyCm));
    const plan = boyPlani(parcalar);
    const toplamCm = parcalar.reduce((a, b) => a + b, 0);
    const boy = plan.length;
    return { profil, parcaAdet: parcalar.length, toplamCm, boy, fireYuzde: boy ? Math.max(0, Math.round((1 - toplamCm / (boy * BOY_CM)) * 100)) : 0, plan };
  });
}

const cm = (m: number) => Math.round(m * 1000) / 10;
const profilAdi = (tip: string, olcu: string) => (tip === "boru" ? `${olcu} boru` : `${olcu} kutu profil`);

const aci = (x: number) => `${(Math.round(x * 10) / 10).toLocaleString("tr-TR")}°`;

/**
 * Direk, kaş ve payanda kesim açıları (testere ayarı, dik kesimden sapma).
 * Eğik kaş direğin devamıdır: kırılma açısının yarısı kadar iki parça da gönye kesilir.
 * Payanda direğe α açıyla yaslanır: üst uç 90°−α, alt (zemin) uç α.
 */
export function direkAcilari(t: Tasarim) {
  const egik = t.direk.kasli && t.direk.kasTipi !== "duz";
  const kasAci = !t.direk.kasli || t.direk.kasTipi === "duz" ? 0 : t.direk.tip === "beton" ? 30 : 45; // dikeyden
  const payandaAci = (Math.atan2(0.6, 0.72) * 180) / Math.PI; // direk ekseninden (3D ile aynı)
  return {
    kasAci,
    direkUst: !egik ? "düz" : t.direk.kasTipi === "v" ? `iki yana ${aci(kasAci / 2)} (çatı)` : `${aci(kasAci / 2)} gönye`,
    kasAlt: t.direk.kasTipi === "v" ? `${aci(kasAci / 2)} gönye` : `${aci(kasAci / 2)} gönye`,
    kasUst: "düz (kapak)",
    payandaAci,
    payandaUst: `${aci(90 - payandaAci)} (direğe yaslanır)`,
    payandaAlt: `${aci(payandaAci)} (zemine oturur)`,
  };
}

/** Çit üretim planı: direkler, kaş kolları, payandalar, kapı babaları; flanş, kapak, dübel, klips, tel. */
export function citUretimi(t: Tasarim, s: Sonuc, ay: Ayarlar): UretimPlani {
  const dt = direkTipi(t.direk.tip);
  const demir = dt.id !== "beton";
  const flans = flansliZemin(t);
  const kas = kasUzunlugu(t);
  // Eğik / V kaş ayrı kol olarak kaynaklanır; düz kaş direğin devamıdır
  const ayriKol = t.direk.kasli && t.direk.kasTipi !== "duz";
  const govde = direkBoyu(t) - (ayriKol ? kas : 0);
  const ara = t.direk.olcu;
  const guclu = ustOlcu(dt, ara);
  const nGuclu = s.sayilar.kose + s.sayilar.gergi + s.sayilar.uc + s.sayilar.kapi;
  const kesim: KesimParca[] = [];
  const sarf: Sarf[] = [];
  const notlar: string[] = [];
  if (demir) {
    const A = direkAcilari(t);
    const direkKesim = `alt düz · üst ${A.direkUst}`;
    kesim.push({ profil: profilAdi(dt.id, ara), ad: "Ara direk", boyCm: cm(govde), adet: s.sayilar.ara, kesim: direkKesim });
    kesim.push({ profil: profilAdi(dt.id, guclu), ad: "Köşe / gergi direği", boyCm: cm(govde), adet: nGuclu, kesim: direkKesim });
    if (ayriKol) {
      const kolSayi = t.direk.kasTipi === "v" ? 2 : 1;
      const kk = `alt ${A.kasAlt} · üst ${A.kasUst}`;
      kesim.push({ profil: profilAdi(dt.id, ara), ad: `Kaş kolu (ara, ${A.kasAci}°)`, boyCm: cm(kas), adet: s.sayilar.ara * kolSayi, kesim: kk });
      kesim.push({ profil: profilAdi(dt.id, guclu), ad: `Kaş kolu (köşe / gergi, ${A.kasAci}°)`, boyCm: cm(kas), adet: nGuclu * kolSayi + (ikiKasliKose(t) ? s.sayilar.kose : 0), kesim: kk });
    }
    if (s.sayilar.payanda)
      kesim.push({
        profil: profilAdi(dt.id, ara),
        ad: "Payanda",
        boyCm: cm(Math.ceil(t.tel.yukseklik * 1.3 * 4) / 4),
        adet: s.sayilar.payanda,
        kesim: `üst ${A.payandaUst} · alt ${A.payandaAlt}`,
      });
    sarf.push({ ad: `Tepe kapağı ${ara}`, adet: s.sayilar.ara, birim: "adet" }, { ad: `Tepe kapağı ${guclu}`, adet: nGuclu, birim: "adet" });
  } else {
    sarf.push(
      { ad: `Beton direk ${ara} · ${direkBoyu(t).toLocaleString("tr-TR")} m (hazır)`, adet: s.sayilar.ara, birim: "adet" },
      { ad: `Beton direk ${guclu} · ${direkBoyu(t).toLocaleString("tr-TR")} m (hazır)`, adet: nGuclu, birim: "adet" },
    );
    if (s.sayilar.payanda) sarf.push({ ad: "Beton payanda (hazır)", adet: s.sayilar.payanda, birim: "adet" });
    notlar.push("Beton direkler hazır alınır; kesim yok.");
  }
  // Kapı babaları her zaman demir
  for (const tur of ["arac", "yaya"] as const) {
    const n = s.babalar.filter((b) => b.tur === tur).length;
    if (!n) continue;
    const o = tur === "arac" ? ay.kapiBabasi.aracOlcu : ay.kapiBabasi.yayaOlcu;
    kesim.push({ profil: profilAdi("profil", o), ad: `${tur === "arac" ? "Araç" : "Yaya"} kapısı babası`, boyCm: cm(babaBoyu(t)), adet: n });
    sarf.push({ ad: `Tepe kapağı ${o}`, adet: n, birim: "adet" });
  }
  const direkAdet = s.direkler.length + s.babalar.length;
  if (flans) {
    sarf.push({ ad: "Flanş (ayak plakası)", adet: direkAdet, birim: "adet" });
    sarf.push({ ad: "Dübel", adet: direkAdet * ay.dubelDirek + s.sayilar.payanda * ay.dubelPayanda, birim: "adet" });
  }
  if (t.tel.tip === "panel") {
    const bombe = t.tel.yukseklik < 0.9 ? 1 : t.tel.yukseklik < 1.4 ? 2 : t.tel.yukseklik < 1.9 ? 3 : 4;
    sarf.push({ ad: `Panel ${t.tel.yukseklik.toLocaleString("tr-TR")} m`, adet: s.paket.adet, birim: "adet" });
    sarf.push({ ad: "Plastik panel klipsi", adet: s.direkler.length * (bombe + 2), birim: "adet" });
  } else sarf.push({ ad: `${t.tel.tip === "dikenli" ? "Dikenli tel" : "Tel"} ${t.tel.yukseklik.toLocaleString("tr-TR")} m`, adet: s.paket.adet, birim: s.paket.birim });
  const tel = s.kalemler.filter((k) => k.grup === "Bağlantı" && !k.ad.startsWith("Dübel"));
  for (const k of tel) sarf.push({ ad: k.ad, adet: k.miktar, birim: k.birim });
  if (s.kapilar.length) sarf.push({ ad: "Kapı (ayrı üretim)", adet: s.kapilar.length, birim: "adet" });
  return { baslik: "Çit", kesim: kesim.filter((k) => k.adet > 0 && k.boyCm > 0), alim: alimHesapla(kesim.filter((k) => k.adet > 0)), sarf: sarf.filter((x) => x.adet > 0), notlar };
}

/** Kapı üretim planı: kanat çerçevesi, ara dikme ve kuşaklar, dolgu, kolonlar; menteşe, kilit, ray… */
export function kapiUretimi(k: AracKapi, aile: KapiAilesi): UretimPlani {
  const yaya = aile === "yaya";
  const C = cerceveProfili(aile);
  const cerceve = `${Math.round(C * 1000)}x${Math.round(C * 1000)} kutu profil`;
  const kolon = yaya ? "70x70 kutu profil" : surgulu(k) ? "80x80 kutu profil" : "120x120 kutu profil";
  const H = k.yukseklik;
  const kesim: KesimParca[] = [];
  const sarf: Sarf[] = [];
  const notlar: string[] = [];
  const olcuNotlari: string[] = [];
  const kanatlar = kapiKanatlari(k, aile);
  const n = kanatlar.length;
  const y = kanatlar[0]; // kanatlar aynı ölçüde
  const G = "45° gönye (iki uç)" as const;
  const D = "düz" as const;
  // Çerçeve: dış ölçüden 45° gönye kesilip köşelerden kaynatılır
  kesim.push({ profil: cerceve, ad: "Çerçeve üst kuşak", boyCm: cm(y.w), adet: n, kesim: G });
  if (surgulu(k) && k.tip === "surgulu") kesim.push({ profil: "100x60 kutu profil", ad: "Alt taşıyıcı kiriş", boyCm: cm(y.w), adet: 1, kesim: G });
  else kesim.push({ profil: cerceve, ad: "Çerçeve alt kuşak", boyCm: cm(y.w), adet: n, kesim: G });
  kesim.push({ profil: cerceve, ad: "Çerçeve uç dikmesi", boyCm: cm(y.h), adet: n * 2, kesim: G });
  if (y.bolum > 1) kesim.push({ profil: cerceve, ad: "Ara dikme (kuşaklar arası)", boyCm: cm(y.ic), adet: n * (y.bolum - 1), kesim: D });
  const ok = Math.round(C * 700);
  if (y.ortaKusak) kesim.push({ profil: `${ok}x${ok} kutu profil`, ad: "Orta kuşak (dikmeler arası)", boyCm: cm(y.bw - C), adet: n * y.bolum, kesim: D });
  if (k.tip === "konsol") kesim.push({ profil: "100x60 kutu profil", ad: "Alt taşıyıcı C kiriş (kuyruk dahil)", boyCm: cm(kanatBoyu(k)), adet: 1, kesim: D });
  olcuNotlari.push(`Kanat dış ölçüsü ${cm(y.w)} × ${cm(y.h)} cm${n > 1 ? ` (${n} kanat)` : ""}; zeminden ${cm(y.yerden)} cm yukarıda.`);
  if (y.bolum > 1)
    olcuNotlari.push(`${y.bolum} bölüm: dikme eksenleri soldan ${y.dikmeX.map((x) => cm(x)).join(" / ")} cm (eksen aralığı ${cm(y.bw)} cm).`);
  if (y.ortaKusak) olcuNotlari.push(`Orta kuşak ekseni kanat altından ${cm(y.araKusakY)} cm.`);
  if (k.dolgu === "profil") {
    const ust = y.h - y.C - y.araKusakY - 0.35 * C;
    const alt = y.araKusakY - y.alt - 0.35 * C;
    kesim.push({ profil: "30x30 kutu profil", ad: "Dolgu çubuğu (orta kuşak altı)", boyCm: cm(alt), adet: n * y.bolum * y.dolguAdet, kesim: D });
    kesim.push({ profil: "30x30 kutu profil", ad: "Dolgu çubuğu (orta kuşak üstü)", boyCm: cm(ust), adet: n * y.bolum * y.dolguAdet, kesim: D });
    olcuNotlari.push(`Dolgu: bölüm başına ${y.dolguAdet} çubuk, eksen aralığı ${cm(y.dolguAralik)} cm (ilk çubuk dikme yüzünden ${cm(y.dolguAralik / 2)} cm).`);
  } else if (k.dolgu === "panel")
    sarf.push({ ad: `${y.duzPanel ? "Düz çift telli" : "Bombeli"} panel ${cm(y.bw - C)} × ${cm(y.ic)} cm`, adet: n * y.bolum, birim: "adet" });
  else if (k.dolgu === "kafes") sarf.push({ ad: `Kafes tel (çerçeve içi)`, adet: Math.ceil(n * y.w * y.ic * 10) / 10, birim: "m²" });
  else sarf.push({ ad: `Sac 1,5 mm ${cm(y.bw - C)} × ${cm((y.ic - 0.7 * C) / 2)} cm`, adet: n * y.bolum * 2, birim: "adet" });
  // Kolonlar
  const gom = yaya ? (k.montajTipi === "flans" ? 0 : 0.6) : 0;
  if (surgulu(k)) {
    // Baba yüksekliği = kanat üstü (mızrak varsa ucu) + 5 cm boşluk + üst kuşak profili
    const P = 0.08;
    const babaH = surguluBabaYuksekligi(k);
    olcuNotlari.push(`Kapı babası yüksekliği ${cm(babaH)} cm (kanat üstü${k.mizrak ? " / mızrak ucu" : ""} + 5 cm boşluk + 8 cm üst kuşak).`);
    const zKusak = 2 * (0.07 + P / 2) + P;
    kesim.push({ profil: kolon, ad: "Kapı babası dikmesi (motor tarafı, 4'lü)", boyCm: cm(babaH - P), adet: 4 });
    kesim.push({ profil: kolon, ad: "Baba üst kuşağı (kanat üstünden)", boyCm: cm(zKusak), adet: 2 });
    kesim.push({ profil: kolon, ad: "Baba üst kuşağı (yan)", boyCm: cm(0.4 + P), adet: 2 });
    kesim.push({ profil: kolon, ad: "Karşılama babası dikmesi", boyCm: cm(babaH - P), adet: 2 });
    kesim.push({ profil: kolon, ad: "Karşılama üst kuşağı", boyCm: cm(zKusak), adet: 1 });
    if (k.tip === "konsol") kesim.push({ profil: "40x40 kutu profil", ad: "Kuyruk eğik çubuğu", boyCm: cm(Math.hypot(kanatBoyu(k) - k.genislik, H)), adet: 1 });
  } else {
    kesim.push({ profil: kolon, ad: "Kolon (baba)", boyCm: cm(kanatliKolonBoyu(k, aile) + gom), adet: 2 });
    olcuNotlari.push(`Kolon boyu ${cm(kanatliKolonBoyu(k, aile) + gom)} cm${gom ? ` (${cm(gom)} cm betona gömülü)` : ""}.`);
  }
  if (k.mizrak) kesim.push({ profil: "12x12 kare demir", ad: "Mızrak çubuğu", boyCm: 20, adet: Math.round(kanatBoyu(k) / 0.2) });
  // Hırdavat
  if (k.tip === "tek" || k.tip === "cift") {
    sarf.push({ ad: yaya ? "Ayarlı (cıvatalı) menteşe" : "Bayraklı menteşe", adet: n * (H > 1.6 ? 3 : 2), birim: "adet" });
    if (k.tip === "cift") sarf.push({ ad: "Yere düşen sürgü", adet: 1, birim: "adet" });
  }
  if (k.kilit) sarf.push({ ad: "Kilit kutusu + silindir + kol", adet: 1, birim: "takım" });
  if (k.elektrikliKilit) sarf.push({ ad: "Elektrikli kilit + kart okuyucu", adet: 1, birim: "takım" });
  if (surgulu(k)) {
    if (k.tip === "surgulu") {
      kesim.push({ profil: "Ray (yuvarlak / V)", ad: "Zemin rayı", boyCm: cm(rayBoyu(k)), adet: 1 });
      sarf.push({ ad: "V kanallı tekerlek", adet: 2, birim: "adet" });
    } else sarf.push({ ad: "Konsol taşıyıcı araba", adet: 2, birim: "adet" });
    sarf.push({ ad: "Kılavuz makara takımı", adet: 2, birim: "takım" });
    if (k.motor) sarf.push({ ad: "Kremayer dişli (1 m)", adet: Math.ceil(kanatBoyu(k)), birim: "adet" });
  }
  if (k.motor) sarf.push({ ad: surgulu(k) ? "Sürgü motoru + 2 kumanda" : "Kanat kol motoru", adet: surgulu(k) ? 1 : n, birim: "adet" });
  if (k.fotosel) sarf.push({ ad: "Fotosel (çift)", adet: 1, birim: "takım" });
  if (k.flasor) sarf.push({ ad: "Flaşör", adet: 1, birim: "adet" });
  // 4'lü baba üstten kuşakla kapanır, kapak yalnız karşılama ve kanatlı kolonlarda
  const kolonAdet = 2;
  sarf.push({ ad: "Tepe kapağı", adet: kolonAdet, birim: "adet" });
  if (yaya && k.montajTipi === "flans") sarf.push({ ad: "Flanş (ayak plakası) + 4 dübel", adet: 2, birim: "takım" });
  if (!yaya || k.montajTipi !== "flans") notlar.push(yaya ? "Kolonlar 60 cm betona gömülür." : "Kolonlar zemine flanşla ya da betona gömülerek sabitlenir.");
  return { baslik: yaya ? "Yaya kapısı" : "Araç kapısı", kesim: kesim.filter((x) => x.adet > 0), alim: alimHesapla(kesim.filter((x) => x.adet > 0)), sarf: sarf.filter((x) => x.adet > 0), notlar, olcuNotlari };
}
