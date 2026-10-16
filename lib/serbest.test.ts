import { describe, expect, it } from "vitest";
import { hesapla } from "./hesap";
import {
  alan,
  kenarOlcusuYaz,
  araNoktaEkle,
  geriAl,
  kapaliYap,
  kendiniKesiyor,
  kenarUzunlugu,
  noktaEkle,
  noktaSil,
  serbesteGec,
  temizle,
} from "./serbest";
import { Tasarim, varsayilanTasarim } from "./tasarim";

const bos = () => {
  const t = varsayilanTasarim();
  serbesteGec(t);
  temizle(t);
  return t;
};
const ucgen = () => {
  const t = bos();
  noktaEkle(t, [0, 0]);
  noktaEkle(t, [30, 0]);
  noktaEkle(t, [30, 40]);
  return t;
};

describe("elle çizim", () => {
  it("hazır şekilden geçince köşeleri kopyalar", () => {
    const t = varsayilanTasarim();
    serbesteGec(t);
    expect(t.sekil).toBe("serbest");
    expect(t.serbest).toEqual({ noktalar: [[0, 0], [30, 0], [30, 20], [0, 20]], kapali: true });
    expect(hesapla(t).cevre).toBe(100);
  });

  it("açık çizgi kenar sayısı köşe − 1, kapatınca köşe sayısı", () => {
    const t = ucgen();
    expect(hesapla(t).kenarlar).toHaveLength(2);
    expect(hesapla(t).cevre).toBe(70);
    // Kafes: köşe çift direk; her kenarın 10. direği payandalı gergi
    expect(hesapla(t).sayilar).toMatchObject({ toplamDirek: 30, uc: 2, kose: 2, gergi: 2 });
    kapaliYap(t, true);
    expect(hesapla(t).kenarlar).toHaveLength(3);
    expect(hesapla(t).cevre).toBe(120); // 30 + 40 + 50
  });

  it("tek köşe ya da boş çizim hesabı bozmaz", () => {
    const t = bos();
    expect(hesapla(t).direkler).toHaveLength(0);
    noktaEkle(t, [5, 5]);
    expect(hesapla(t).kenarlar).toHaveLength(0);
    expect(hesapla(t).toplam).toBeGreaterThanOrEqual(0);
  });

  it("aynı noktaya iki kez dokunmak köşe eklemez", () => {
    const t = bos();
    noktaEkle(t, [1, 1]);
    noktaEkle(t, [1, 1]);
    expect(t.serbest.noktalar).toHaveLength(1);
  });

  it("kenar uzunluğu yönü koruyarak bitiş köşesini kaydırır", () => {
    const t = ucgen();
    kenarUzunlugu(t, 1, 20);
    expect(t.serbest.noktalar[2]).toEqual([30, 20]);
  });

  it("kapanış kenarının uzunluğu son köşeyi kaydırır", () => {
    const t = ucgen();
    kapaliYap(t, true);
    kenarUzunlugu(t, 2, 25); // (30,40) → (0,0) kenarı 50 m idi
    expect(t.serbest.noktalar[0]).toEqual([0, 0]);
    expect(t.serbest.noktalar[2]).toEqual([15, 20]);
  });

  it("ara köşe eklenince sonraki kapılar bir kenar kayar", () => {
    const t = ucgen();
    kapaliYap(t, true);
    t.ekstra.kapilar = [{ id: "k", kenar: 2, konum: 5, tur: "yaya", genislik: 1 }];
    araNoktaEkle(t, 0, [15, 0]);
    expect(t.serbest.noktalar).toHaveLength(4);
    expect(t.ekstra.kapilar[0].kenar).toBe(3);
    expect(hesapla(t).cevre).toBe(120);
  });

  it("köşe silinince ona bağlı kenarlardaki kapılar kalkar", () => {
    const t = ucgen();
    noktaEkle(t, [0, 40]);
    kapaliYap(t, true);
    t.ekstra.kapilar = [
      { id: "a", kenar: 1, konum: 5, tur: "yaya", genislik: 1 },
      { id: "b", kenar: 3, konum: 5, tur: "yaya", genislik: 1 },
    ];
    noktaSil(t, 2);
    expect(t.ekstra.kapilar.map((k) => [k.id, k.kenar])).toEqual([["b", 2]]);
  });

  it("geri al önce şekli açar, sonra son köşeyi siler", () => {
    const t = ucgen();
    kapaliYap(t, true);
    geriAl(t);
    expect(t.serbest.kapali).toBe(false);
    expect(t.serbest.noktalar).toHaveLength(3);
    geriAl(t);
    expect(t.serbest.noktalar).toHaveLength(2);
  });

  it("kendini kesen çizim ve alan", () => {
    expect(kendiniKesiyor([[0, 0], [10, 0], [0, 10], [10, 10]], true)).toBe(true);
    expect(kendiniKesiyor([[0, 0], [10, 0], [10, 10], [0, 10]], true)).toBe(false);
    expect(alan([[0, 0], [30, 0], [30, 20], [0, 20]])).toBe(600);
  });

  it("eğim kenar sayısı 8'i aşan çizimde de çalışır", () => {
    const t: Tasarim = bos();
    for (let i = 0; i < 12; i++) noktaEkle(t, [Math.cos((i / 12) * 2 * Math.PI) * 20, Math.sin((i / 12) * 2 * Math.PI) * 20]);
    kapaliYap(t, true);
    expect(hesapla(t).kenarlar).toHaveLength(12);
  });
});

describe("3D etiketten ölçü yazma", () => {
  it("dikdörtgende karşılıklı kenarlar birlikte değişir", () => {
    const t = varsayilanTasarim();
    kenarOlcusuYaz(t, 3, 25);
    expect(t.olculer.B).toBe(25);
    expect(hesapla(t).kenarlar.map((k) => k.gercek)).toEqual([30, 25, 30, 25]);
  });

  it("L şeklinde her kenar kendi ölçüsünü verir", () => {
    const t = varsayilanTasarim();
    t.sekil = "L"; // A30 B20 C10 D8
    kenarOlcusuYaz(t, 1, 15); // B−D = 15 → D = 5
    kenarOlcusuYaz(t, 4, 18); // A−C = 18 → C = 12
    const L = hesapla(t).kenarlar.map((k) => k.gercek);
    expect(L[1]).toBe(15);
    expect(L[4]).toBe(18);
  });

  it("U şeklinde kol genişliği boşluğu ayarlar", () => {
    const t = varsayilanTasarim();
    t.sekil = "U";
    kenarOlcusuYaz(t, 2, 12); // (A−C)/2 = 12 → C = 6
    expect(t.olculer.C).toBe(6);
  });

  it("eğimli kenarda yazılan değer gerçek uzunluk olur", () => {
    const t = varsayilanTasarim();
    t.sekil = "duz";
    t.kenarlar[0].egim = 10;
    kenarOlcusuYaz(t, 0, 50);
    expect(hesapla(t).kenarlar[0].gercek).toBeCloseTo(50, 1);
  });

  it("elle çizimde kenar yönünü koruyarak uzar", () => {
    const t = ucgen();
    kenarOlcusuYaz(t, 0, 40);
    expect(t.serbest.noktalar[1]).toEqual([40, 0]);
  });
});

describe("ölçü yazma sınırları ve çizim düzenleme", () => {
  it("L: kenara ana ölçüden uzun değer yazılınca ölçüler eksiye düşmez", () => {
    const t = varsayilanTasarim();
    t.sekil = "L"; // A30 B20 C10 D8
    kenarOlcusuYaz(t, 1, 25); // B−D = 25 → B = 33, D = 8 kalır
    kenarOlcusuYaz(t, 2, 40); // C = 40 → A = 40 + (30 − 10)
    expect(t.olculer).toMatchObject({ A: 60, B: 33, C: 40, D: 8 });
    const L = hesapla(t).kenarlar.map((k) => k.gercek);
    expect(L[1]).toBe(25);
    expect(L[2]).toBe(40);
    expect(Object.values(t.olculer).every((v) => v > 0)).toBe(true);
  });

  it("U: kol boşluktan geniş yazılınca en büyür", () => {
    const t = varsayilanTasarim();
    t.sekil = "U"; // A30 C10
    kenarOlcusuYaz(t, 2, 20); // 30 − 40 < 1 → A = 10 + 40
    expect(t.olculer).toMatchObject({ A: 50, C: 10 });
  });

  it("ara köşe eklenince bölünen kenardaki kapı ikinci parçaya geçer", () => {
    const t = ucgen();
    t.ekstra.kapilar = [{ id: "k", kenar: 0, konum: 20, tur: "yaya", genislik: 1 }];
    araNoktaEkle(t, 0, [15, 0]);
    expect(t.ekstra.kapilar[0]).toMatchObject({ kenar: 1, konum: 5 });
    const g = hesapla(t).kapilar[0];
    expect(g.a[0]).toBe(20);
  });

  it("açık çizgide son köşe silinince o kenarın ayarı da gider", () => {
    const t = ucgen();
    t.kenarlar = [{ aktif: true, egim: 0 }, { aktif: false, egim: 5 }];
    noktaSil(t, 2);
    expect(t.kenarlar).toEqual([{ aktif: true, egim: 0 }]);
  });
});
