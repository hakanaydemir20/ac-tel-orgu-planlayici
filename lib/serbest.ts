// Arazi şekli üzerindeki düzenleme işlemleri (çoğu elle çizim için).
// Hepsi taslak tasarımı yerinde değiştirir (store.guncelle içinde çağrılır).
import { Nokta2, Tasarim, kenarAyari, kenarlariHesapla, sekilNoktalari } from "./tasarim";

export const IZGARA = 0.5; // köşeler yarım metreye oturur
export const yasla = (v: number) => Math.round(v / IZGARA) * IZGARA;
const yuvarla = (v: number) => Math.round(v * 100) / 100;

const kenarSayisi = (t: Tasarim) => {
  const { noktalar, kapali } = sekilNoktalari(t);
  return noktalar.length < 2 ? 0 : kapali ? noktalar.length : noktalar.length - 1;
};

/** Hazır şekilden elle çizime geçerken mevcut şekli başlangıç olarak kopyalar. */
export function serbesteGec(t: Tasarim) {
  if (t.sekil !== "serbest" && t.serbest.noktalar.length === 0) {
    const { noktalar, kapali } = sekilNoktalari(t);
    t.serbest = { noktalar: noktalar.map(([x, z]) => [yuvarla(x), yuvarla(z)]), kapali };
  }
  t.sekil = "serbest";
}

export function temizle(t: Tasarim) {
  t.serbest = { noktalar: [], kapali: false };
  t.kenarlar = [];
  t.ekstra.kapilar = [];
}

/** Çizginin sonuna yeni köşe ekler. */
export function noktaEkle(t: Tasarim, p: Nokta2) {
  if (t.serbest.kapali) return;
  const son = t.serbest.noktalar.at(-1);
  if (son && son[0] === p[0] && son[1] === p[1]) return;
  t.serbest.noktalar.push(p);
}

export function noktaTasi(t: Tasarim, i: number, p: Nokta2) {
  t.serbest.noktalar[i] = p;
}

/** Kenarın ortasına yeni köşe ekler; sonraki kenar ayarları ve kapılar bir kayar. */
export function araNoktaEkle(t: Tasarim, kenar: number, p: Nokta2) {
  const a = t.serbest.noktalar[kenar];
  const bolum = a ? Math.hypot(p[0] - a[0], p[1] - a[1]) : 0; // yeni köşenin kenar başına uzaklığı
  t.serbest.noktalar.splice(kenar + 1, 0, p);
  const ayar = { ...kenarAyari(t, kenar) };
  t.kenarlar.splice(kenar + 1, 0, ayar);
  for (const k of t.ekstra.kapilar) {
    if (k.kenar > kenar) k.kenar++;
    // Bölünen kenarda yeni köşeden sonra başlayan kapı ikinci parçaya geçer
    else if (k.kenar === kenar && k.konum >= bolum) {
      k.kenar++;
      k.konum = yuvarla(k.konum - bolum);
    }
  }
}

/** Köşeyi siler; o köşeye bağlı kenarlardaki kapılar kaldırılır. */
export function noktaSil(t: Tasarim, i: number) {
  const n = t.serbest.noktalar.length;
  if (n === 0) return;
  t.serbest.noktalar.splice(i, 1);
  // i'den çıkan kenar silinir, (i-1)'den çıkan kenar yeni komşuya uzar
  const onceki = i === 0 ? (t.serbest.kapali ? n - 1 : -1) : i - 1;
  t.ekstra.kapilar = t.ekstra.kapilar
    .filter((k) => k.kenar !== i && k.kenar !== onceki)
    .map((k) => (k.kenar > i ? { ...k, kenar: k.kenar - 1 } : k));
  // Açık çizgide son köşe silinince ona giden kenar (i-1) kalkar; diğer durumlarda i'den çıkan
  const silinen = !t.serbest.kapali && i === n - 1 ? i - 1 : i;
  if (silinen >= 0 && t.kenarlar.length > silinen) t.kenarlar.splice(silinen, 1);
  if (t.serbest.noktalar.length < 3) t.serbest.kapali = false;
}

/** Son köşeyi geri alır (kapalıysa önce şekli açar). */
export function geriAl(t: Tasarim) {
  if (t.serbest.kapali) return kapaliYap(t, false);
  noktaSil(t, t.serbest.noktalar.length - 1);
}

export function kapaliYap(t: Tasarim, kapali: boolean) {
  if (kapali && t.serbest.noktalar.length < 3) return;
  if (!kapali) {
    // Kapanış kenarı kalkıyor; üzerindeki kapılar da kalkar
    const kapanis = t.serbest.noktalar.length - 1;
    t.ekstra.kapilar = t.ekstra.kapilar.filter((k) => k.kenar !== kapanis);
  }
  t.serbest.kapali = kapali;
}

/**
 * Kenarın uzunluğunu yön değiştirmeden ayarlar: kenarın bitiş köşesi kayar.
 * Kapalı şekilde son (kapanış) kenarda başlangıç köşesi sabit kalır, son köşe kayar.
 */
export function kenarUzunlugu(t: Tasarim, kenar: number, L: number) {
  const P = t.serbest.noktalar;
  const n = P.length;
  if (kenar >= kenarSayisi(t) || L <= 0) return;
  const kapanis = t.serbest.kapali && kenar === n - 1;
  const [sabit, oynak] = kapanis ? [0, n - 1] : [kenar, kenar + 1];
  const dx = P[oynak][0] - P[sabit][0];
  const dz = P[oynak][1] - P[sabit][1];
  const d = Math.hypot(dx, dz) || 1;
  P[oynak] = [yuvarla(P[sabit][0] + (dx / d) * L), yuvarla(P[sabit][1] + (dz / d) * L)];
}

/** İki kenar birbirini kesiyor mu (arazi çizgisi kendini kesmemeli). */
export function kendiniKesiyor(noktalar: Nokta2[], kapali: boolean) {
  const n = noktalar.length;
  const m = kapali ? n : n - 1;
  const kes = (a: Nokta2, b: Nokta2, c: Nokta2, d: Nokta2) => {
    const yon = (p: Nokta2, q: Nokta2, r: Nokta2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = yon(c, d, a);
    const d2 = yon(c, d, b);
    const d3 = yon(a, b, c);
    const d4 = yon(a, b, d);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  for (let i = 0; i < m; i++)
    for (let j = i + 2; j < m; j++) {
      if (kapali && i === 0 && j === m - 1) continue; // komşu kenarlar
      if (kes(noktalar[i], noktalar[(i + 1) % n], noktalar[j], noktalar[(j + 1) % n])) return true;
    }
  return false;
}

/** Kapalı şeklin alanı (m²), shoelace formülü. */
export function alan(noktalar: Nokta2[]) {
  let a = 0;
  for (let i = 0; i < noktalar.length; i++) {
    const [x1, z1] = noktalar[i];
    const [x2, z2] = noktalar[(i + 1) % noktalar.length];
    a += x1 * z2 - x2 * z1;
  }
  return Math.abs(a) / 2;
}

/**
 * 3D'deki kenar etiketinden ölçü girişi: kenarın gerçek (eğimli) uzunluğu L olur.
 * Hazır şekillerde ilgili ölçüye (en, boy, kesik…) yazılır; elle çizimde kenar uzar/kısalır.
 */
export function kenarOlcusuYaz(t: Tasarim, kenar: number, L: number) {
  const k = kenarlariHesapla(t)[kenar];
  if (!k || !(L > 0)) return;
  const yatay = yuvarla(L * (k.yatay / (k.gercek || 1))); // eğim korunur
  const o = t.olculer;
  switch (t.sekil) {
    case "serbest":
      return kenarUzunlugu(t, kenar, yatay);
    case "duz":
    case "kare":
      o.A = yatay;
      return;
    case "dikdortgen":
      if (kenar % 2 === 0) o.A = yatay;
      else o.B = yatay;
      return;
    case "L": {
      // Kenarlar: A, B−D, C, D, A−C, B. Yazılan değer diğer ölçüyü eksiye düşürecekse
      // karşı kenarı koruyup dış ölçü büyütülür/küçültülür; şekil hep geçerli kalır.
      const [bd, ac] = [o.B - o.D, o.A - o.C];
      if (kenar === 0) {
        o.A = yatay;
        o.C = Math.min(o.C, yuvarla(yatay - 0.5));
      } else if (kenar === 1) o.B = yuvarla(yatay + o.D);
      else if (kenar === 2) {
        o.C = yatay;
        if (o.C > o.A - 0.5) o.A = yuvarla(o.C + ac);
      } else if (kenar === 3) {
        o.D = yatay;
        if (o.D > o.B - 0.5) o.B = yuvarla(o.D + bd);
      } else if (kenar === 4) o.A = yuvarla(yatay + o.C);
      else {
        o.B = yatay;
        o.D = Math.min(o.D, yuvarla(yatay - 0.5));
      }
      return;
    }
    case "U": {
      // Kenarlar: A, B, (A−C)/2, D, C, D, (A−C)/2, B
      const kol = (o.A - o.C) / 2;
      if (kenar === 0) {
        o.A = yatay;
        o.C = Math.min(o.C, yuvarla(yatay - 1));
      } else if (kenar === 1 || kenar === 7) {
        o.B = yatay;
        o.D = Math.min(o.D, yuvarla(yatay - 0.5));
      } else if (kenar === 2 || kenar === 6) {
        // En sabit, boşluk daralır; boşluk kalmayacaksa en büyür
        const c = yuvarla(o.A - 2 * yatay);
        if (c >= 1) o.C = c;
        else o.A = yuvarla(o.C + 2 * yatay);
      }
      else if (kenar === 4) {
        o.C = yatay;
        o.A = yuvarla(yatay + 2 * kol);
      } else {
        o.D = yatay;
        if (o.D > o.B - 0.5) o.B = yuvarla(o.D + 0.5);
      }
      return;
    }
  }
}
