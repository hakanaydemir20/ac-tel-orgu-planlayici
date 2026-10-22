import { describe, expect, it } from "vitest";
import { direkBoyu, hesapla, yerlesim } from "./hesap";
import { VARSAYILAN_AYARLAR } from "./katalog";
import { icinde } from "./geometri";
import { Tasarim, sekilNoktalari, varsayilanTasarim } from "./tasarim";

const tasarim = (f: (t: Tasarim) => void) => {
  const t = varsayilanTasarim();
  t.ekstra.kapilar = [];
  f(t);
  return t;
};

describe("direk yerleşimi", () => {
  it("30×20 dikdörtgen, 2.5 m aralık, kapısız", () => {
    const s = hesapla(tasarim(() => {}));
    expect(s.cevre).toBe(100);
    expect(s.telUzunluk).toBe(100);
    // Kafes: 4 köşe × 2 (çift direk); 30 m kenarda 10. direk payandalı gergi
    expect(s.sayilar.kose).toBe(8);
    expect(s.sayilar.gergi).toBe(2);
    expect(s.sayilar.ara).toBe(34);
    expect(s.sayilar.toplamDirek).toBe(44);
    expect(s.sayilar.payanda).toBe(8 + 4);
  });

  it("profil direk + eğik kaş: köşeler tek direk, her köşede iki kaş", () => {
    const t = tasarim((t) => {
      t.direk.tip = "profil";
      t.direk.olcu = "50x50";
      t.direk.kasli = true;
      t.direk.kasTipi = "egik";
    });
    const s = hesapla(t);
    expect(s.sayilar.kose).toBe(4); // kafes telde bile çift değil, tek
    const koseler = yerlesim(t).direkler.filter((d) => d.rol === "kose");
    expect(koseler).toHaveLength(4);
    for (const d of koseler) {
      expect(d.dis2).toBeDefined();
      expect(Math.abs(d.dis[0] * d.dis2![0] + d.dis[1] * d.dis2![1])).toBeLessThan(0.01); // dik açılı iki kaş
    }
    expect(s.kalemler.some((k) => k.ad.startsWith("Köşe direği ek kaş kolu") && k.miktar === 4)).toBe(true);
  });

  it("4 m araç kapısı iki yanına kapı babası koyar, teli kısaltır", () => {
    const s = hesapla(
      tasarim((t) => (t.ekstra.kapilar = [{ id: "k", kenar: 0, konum: 13, tur: "arac", genislik: 4 }]))
    );
    expect(s.telUzunluk).toBe(96);
    expect(s.babalar.length).toBe(2); // kapı direkleri yerine kalın babalar
    expect(s.sayilar.kapi).toBe(0);
    expect(s.sayilar.gergi).toBe(1); // kapılı kenarın parçaları 10 direğe ulaşmıyor
    expect(s.sayilar.ara).toBe(34);
    expect(s.sayilar.toplamDirek).toBe(43);
    expect(s.sayilar.payanda).toBe(8 + 2);
    const baba = s.kalemler.find((k) => k.ad.startsWith("Araç kapısı babası 80x80"))!;
    expect(baba.miktar).toBe(2);
  });

  it("uzun kenarda 25 m'de bir gergi direği", () => {
    const s = hesapla(tasarim((t) => (t.sekil = "duz", t.olculer.A = 100)));
    // 100 m / 2.5 = 40 aralık → 10., 20., 30. direk gergi
    expect(s.sayilar.gergi).toBe(3);
    expect(s.sayilar.uc).toBe(2);
    expect(s.sayilar.toplamDirek).toBe(41);
    expect(s.sayilar.payanda).toBe(2 + 3 * 2);
  });

  it("çit olmayan kenar: köşeler uç direğine döner", () => {
    const s = hesapla(tasarim((t) => (t.kenarlar[2].aktif = false)));
    expect(s.cevre).toBe(70);
    expect(s.sayilar.kose).toBe(4); // iki köşe, kafeste çift
    expect(s.sayilar.uc).toBe(2);
  });

  it("eğimli kenar gerçek uzunluğu kullanır, kapalı şekil son kenarı dengeler", () => {
    const s = hesapla(tasarim((t) => (t.sekil = "kare", t.olculer.A = 10, t.kenarlar[0].egim = 30)));
    expect(s.kenarlar[0].gercek).toBeCloseTo(Math.hypot(10, 3));
    expect(s.kenarlar[3].son[1]).toBe(0);
    expect(s.kenarlar[3].bas[1]).toBeCloseTo(3);
  });
});

describe("yazdırılan tutarlar", () => {
  it("tutarlar tam lira; ara toplam + KDV = toplam", () => {
    const t = tasarim((t) => {
      t.olculer = { A: 10, B: 11, C: 1, D: 1 };
      t.tel.yukseklik = 1;
      t.tel.kaplama = "pvc";
    });
    const s = hesapla(t);
    expect(s.kalemler.every((k) => Number.isInteger(k.tutar))).toBe(true);
    expect(s.araToplam).toBe(s.kalemler.reduce((a, k) => a + k.tutar, 0));
    expect(Number.isInteger(s.kdv)).toBe(true);
    expect(s.toplam).toBe(s.araToplam + s.kdv);
  });
});

describe("kapı köşeye dayalıyken", () => {
  it("açık hattın ucundaki kapının köşe tarafına da direk konur", () => {
    const s = hesapla(
      tasarim((t) => {
        t.sekil = "duz";
        t.olculer.A = 20;
        t.ekstra.kapilar = [{ id: "k", kenar: 0, konum: 16, tur: "arac", genislik: 4 }];
      })
    );
    const xler = [...s.direkler, ...s.babalar].map((d) => Math.round(d.p[0] * 100) / 100).sort((a, b) => a - b);
    expect(xler).toContain(16);
    expect(xler).toContain(20); // eskiden eksikti
    expect(s.babalar.length).toBe(2);
    expect(s.sayilar.toplamDirek).toBe(7);
  });

  it("çitsiz kenarın yanındaki köşede kapı olunca köşe direği eksik kalmaz", () => {
    const s = hesapla(
      tasarim((t) => {
        t.kenarlar[1].aktif = false; // (30,0)→(30,20) çitsiz
        t.ekstra.kapilar = [{ id: "k", kenar: 0, konum: 26, tur: "arac", genislik: 4 }]; // köşeye dayalı
      })
    );
    expect([...s.direkler, ...s.babalar].some((d) => Math.abs(d.p[0] - 30) < 1e-6 && Math.abs(d.p[2]) < 1e-6)).toBe(true);
  });
});

describe("malzeme", () => {
  it("montaj metresi kayan nokta yüzünden fazla yuvarlanmaz", () => {
    const s = hesapla(
      tasarim((t) => {
        t.sekil = "L";
        t.olculer = { A: 10.9, B: 12.1, C: 3.3, D: 2.3 };
      })
    );
    expect(s.kalemler.find((k) => k.ad === "Montaj işçiliği")!.miktar).toBe(46);
  });

  it("kafes tel metre fiyatı, rulo sayısı ve toplam KDV", () => {
    const s = hesapla(tasarim(() => {}));
    const tel = s.kalemler.find((k) => k.grup === "Tel")!;
    expect(tel).toMatchObject({ miktar: 100, birim: "m", birimFiyat: 145, tutar: 14500 });
    expect(s.paket).toEqual({ adet: 7, birim: "rulo" }); // 102 m / 15 m
    expect(s.toplam).toBeCloseTo(s.araToplam * 1.2, 1);
  });

  it("ayarlardaki fiyat değişince toplam değişir, PVC farkı eklenir", () => {
    const t = tasarim((t) => (t.tel.kaplama = "pvc"));
    const ay = structuredClone(VARSAYILAN_AYARLAR);
    ay.kafesMetre["1.5"]["50"]["2.5"] = 200;
    const tel = hesapla(t, ay).kalemler.find((k) => k.grup === "Tel")!;
    expect(tel.birimFiyat).toBe(250); // 200 + %25
  });

  it("kafes tel fiyatı göz aralığına ve tel kalınlığına göre değişir", () => {
    const ay = structuredClone(VARSAYILAN_AYARLAR);
    ay.kafesMetre["1.5"]["40"]["3.5"] = 300;
    ay.kafesMetre["1.5"]["60"]["2"] = 110;
    const fiyat = (goz: number, kal: number) =>
      hesapla(tasarim((t) => ((t.tel.goz = goz), (t.tel.kalinlik = kal))), ay).kalemler.find((k) => k.grup === "Tel")!;
    const kalin = fiyat(40, 3.5);
    expect(kalin.birimFiyat).toBe(300);
    expect(kalin.tutar).toBe(kalin.miktar * 300); // metretül × fiyat
    expect(fiyat(60, 2).birimFiyat).toBe(110);
  });

  it("panel çit adet hesabı", () => {
    const s = hesapla(tasarim((t) => (t.tel.tip = "panel", t.tel.yukseklik = 1.5, t.tel.kalinlik = 4)));
    expect(s.paket).toEqual({ adet: 40, birim: "panel" }); // 2×(30/2.5) + 2×(20/2.5)
    expect(s.kalemler.find((k) => k.grup === "Tel")!.birimFiyat).toBe(320);
  });
});

describe("arazi planı (PDF)", () => {
  it("her direk bir daire, her kenar bir ölçü yazısı, kapı etiketi", async () => {
    const { planSvg } = await import("./plan");
    const t = varsayilanTasarim();
    const s = hesapla(t);
    const svg = planSvg(t, s);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("30 m");
    expect(svg).toContain("Araç kapısı 4 m");
    // direk daireleri + kenar numarası daireleri
    expect(svg.match(/<circle/g)!.length).toBe(s.direkler.length + s.kenarlar.length);
  });
});

describe("kapılar", () => {
  it("araç ve yaya kapısı yan yana, ortak tek direkle", async () => {
    const { kapiEkle } = await import("./tasarim");
    const t = tasarim((x) => {
      x.ekstra.kapilar = [];
      kapiEkle(x, "arac");
      kapiEkle(x, "yaya");
    });
    const [a, y] = t.ekstra.kapilar;
    expect(a.kenar).toBe(y.kenar);
    expect(y.konum).toBeCloseTo(a.konum + a.genislik); // bitişik
    expect(a.konum).toBeCloseTo((30 - 5) / 2); // grup ortada
    const s = hesapla(t);
    expect(s.babalar.length).toBe(3); // sol, ortak, sağ
    expect(s.babalar.filter((b) => b.tur === "arac").length).toBe(2); // ortak baba araç ölçüsünde
  });
});

describe("düzlemsel jiletli", () => {
  it("kaşlı direkte kaş boyu halka çapı kadar; direk boyu buna göre", () => {
    const t = tasarim((t) => ((t.ekstra.ustTel = "duzlemsel"), (t.ekstra.duzlemselCap = 90), (t.direk.kasli = true)));
    expect(direkBoyu(t)).toBe(3); // 1,5 + 0,5 gömme + 0,9 kaş → 2,9 → çeyrek metreye yuvarlı 3
  });

  it("helezon jiletli fiyatı da çapa göre", () => {
    const k = hesapla(tasarim((t) => ((t.ekstra.ustTel = "jiletli"), (t.ekstra.jiletliCap = 90)))).kalemler.find((k) => k.ad.startsWith("Helezon"))!;
    expect(k.birimFiyat).toBe(VARSAYILAN_AYARLAR.jiletliCapMetre["90"]);
  });

  it("fiyat seçilen çapa göre", () => {
    for (const cap of [30, 45, 60, 90] as const) {
      const k = hesapla(tasarim((t) => ((t.ekstra.ustTel = "duzlemsel"), (t.ekstra.duzlemselCap = cap)))).kalemler.find((k) => k.ad.startsWith("Düzlemsel"))!;
      expect(k.birimFiyat).toBe(VARSAYILAN_AYARLAR.duzlemselCapMetre[String(cap)]);
      expect(k.ad).toContain(`Ø${cap} cm`);
    }
  });
});

const DD = VARSAYILAN_AYARLAR.demirDirek;
/** Galvaniz demir direğin boydan bağımsız sabit maliyeti (boya hariç) */
const SABIT = DD.kaynak + DD.kapak + DD.nakliye + DD.diger;

describe("demir direk sabit maliyeti", () => {
  it("kısa direk asgari boyun altına inmez; payandada sabit kalem var", () => {
    const s = hesapla(tasarim((t) => ((t.direk.tip = "profil"), (t.direk.olcu = "40x40"), (t.tel.yukseklik = 1), (t.direk.kasli = false))));
    const m = VARSAYILAN_AYARLAR.direkMetre.profil["40x40"];
    expect(direkBoyu(tasarim((t) => ((t.direk.tip = "profil"), (t.tel.yukseklik = 1), (t.direk.kasli = false))))).toBe(1.5);
    expect(s.kalemler.find((k) => k.ad.startsWith("Ara direk"))!.birimFiyat).toBe(SABIT + Math.max(1.5, DD.asgariBoy) * m);
    const p = s.kalemler.find((k) => k.ad.startsWith("Payanda"))!;
    expect(p.birimFiyat).toBeGreaterThan(DD.payandaSabit);
  });

  it("eski (sabit maliyetten önce) teklif eski fiyatla kalır", async () => {
    const { etkinAyarlar } = await import("./ayarlar");
    const { demirDirek: _, ...eski } = structuredClone(VARSAYILAN_AYARLAR);
    const t = tasarim((t) => ((t.direk.tip = "profil"), (t.direk.olcu = "40x40"), (t.direk.renk = "antrasit")));
    t.fiyatlar = { tarih: "2026-01-01T00:00:00Z", ayarlar: eski as typeof VARSAYILAN_AYARLAR };
    const ara = hesapla(t, etkinAyarlar(t, VARSAYILAN_AYARLAR)).kalemler.find((k) => k.ad.startsWith("Ara direk"))!;
    expect(ara.birimFiyat).toBeCloseTo(2 * VARSAYILAN_AYARLAR.direkMetre.profil["40x40"] * (1 + VARSAYILAN_AYARLAR.boyaFarkYuzde / 100));
  });
});

describe("kurulum alanı", () => {
  it("duvar üstü: gömme yok, flanşlı direk + dübel, payanda yok, duvar montaj tarifesi", () => {
    const t = tasarim((t) => {
      t.zemin = "duvar";
      t.duvarYukseklik = 0.8;
      t.direk.tip = "profil";
      t.direk.olcu = "40x40";
    });
    const s = hesapla(t);
    expect(direkBoyu(t)).toBe(1.5);
    expect(s.sayilar.payanda).toBe(0);
    expect(s.kalemler.some((k) => k.ad.startsWith("Dübel"))).toBe(true);
    expect(s.kalemler.some((k) => k.ad === "Direk beton temeli")).toBe(false);
    const montaj = s.kalemler.find((k) => k.ad.startsWith("Duvar üstü montaj"))!;
    expect(montaj.birimFiyat).toBe(VARSAYILAN_AYARLAR.montajDuvarMetre);
  });

  it("toprakta direk 50 cm gömülür, beton temel kalemi var, flanş yok", () => {
    const t = tasarim(() => {});
    const s = hesapla(t);
    expect(direkBoyu(t)).toBe(2); // 1,5 + 0,5
    expect(s.kalemler.some((k) => k.ad === "Direk beton temeli")).toBe(true);
    expect(s.kalemler.some((k) => k.ad.startsWith("Flanş") || k.ad.startsWith("Dübel"))).toBe(false);
  });

  it("betonda direk gömülmez; temel yerine direk başına flanş + 4 dübel gelir", () => {
    const t = tasarim((t) => {
      t.zemin = "beton";
      t.direk.tip = "profil";
      t.direk.olcu = "40x40";
    });
    const s = hesapla(t);
    expect(direkBoyu(t)).toBe(1.5);
    expect(s.kalemler.some((k) => k.ad === "Direk beton temeli")).toBe(false);
    const dubel = s.kalemler.find((k) => k.ad.startsWith("Dübel"))!;
    // Flanş ayrı satır değil: direk fiyatı = flanş + sabit kalemler + boy × metre fiyatı
    const ara = s.kalemler.find((k) => k.ad.startsWith("Ara direk"))!;
    expect(ara.ad).toContain("flanşlı");
    expect(ara.birimFiyat).toBe(VARSAYILAN_AYARLAR.flansAdet + SABIT + 1.5 * VARSAYILAN_AYARLAR.direkMetre.profil["40x40"]);
    expect(dubel.miktar).toBe(s.sayilar.toplamDirek * 4 + s.sayilar.payanda * 2); // 40×4 + 8×2
    expect(dubel.tutar).toBe(dubel.miktar * VARSAYILAN_AYARLAR.dubelAdet);
  });

  it("betonda uzun direk yalnız profil metresi kadar pahalı, sabit temel aynı", () => {
    const fiyat = (h: number) =>
      hesapla(tasarim((t) => ((t.zemin = "beton"), (t.direk.tip = "boru"), (t.direk.olcu = "Ø48"), (t.tel.yukseklik = h)))).kalemler.find((k) =>
        k.ad.startsWith("Ara direk"),
      )!.birimFiyat;
    const m = VARSAYILAN_AYARLAR.direkMetre.boru["Ø48"];
    // 1 m çit → 1 m direk, asgari 1,5 m'den fiyatlanır; 2 m çit → 2 m direk
    expect(fiyat(1)).toBe(VARSAYILAN_AYARLAR.flansAdet + SABIT + 1.5 * m);
    expect(fiyat(2) - fiyat(1)).toBeCloseTo(0.5 * m); // fark yalnız profil metresi
  });

  it("boyalı profil direkte metre fiyatına boya farkı eklenir, galvanizde eklenmez", () => {
    const ara = (renk: "galvaniz" | "antrasit") =>
      hesapla(tasarim((t) => ((t.direk.tip = "profil"), (t.direk.olcu = "40x40"), (t.direk.renk = renk)))).kalemler.find((k) =>
        k.ad.startsWith("Ara direk"),
      )!;
    const m = VARSAYILAN_AYARLAR.direkMetre.profil["40x40"];
    expect(ara("galvaniz").birimFiyat).toBeCloseTo(SABIT + 2 * m);
    const boyali = ara("antrasit");
    expect(boyali.birimFiyat).toBeCloseTo(SABIT + VARSAYILAN_AYARLAR.demirDirek.boya + 2 * m); // boya sabit kalem
    expect(boyali.ad).toContain("antrasit");
  });

  it("dübel adetleri ayarlardan değişir; payanda 0 ise yalnız direk dübeli", () => {
    const t = tasarim((t) => {
      t.zemin = "beton";
      t.direk.tip = "boru";
      t.direk.olcu = "Ø48";
    });
    const ay = structuredClone(VARSAYILAN_AYARLAR);
    ay.dubelDirek = 3;
    ay.dubelPayanda = 0;
    const s = hesapla(t, ay);
    const dubel = s.kalemler.find((k) => k.ad.startsWith("Dübel"))!;
    expect(dubel.miktar).toBe(s.sayilar.toplamDirek * 3);
    expect(dubel.ad).toBe("Dübel (direk başına 3)");
  });

  it("betonda kaşlı direk: gömme yok, kaş payı var", () => {
    const t = tasarim((t) => {
      t.zemin = "beton";
      t.direk.tip = "boru";
      t.direk.olcu = "Ø48";
      t.direk.kasli = true;
    });
    expect(direkBoyu(t)).toBe(2); // 1,5 + 0,4 → 2'ye yuvarlanır
  });
});

describe("düzlemsel jiletli tel", () => {
  it("çit metresi kadar, Ayarlar'daki metre fiyatıyla", () => {
    const s = hesapla(tasarim((t) => (t.ekstra.ustTel = "duzlemsel")));
    const k = s.kalemler.find((x) => x.ad.startsWith("Düzlemsel jiletli"))!;
    expect(k).toMatchObject({ miktar: 100, birim: "m", birimFiyat: VARSAYILAN_AYARLAR.duzlemselMetre, tutar: 14000 });
    expect(k.ad).toContain("(7 rulo)"); // 102 m / 15 m
  });
});

describe("kaş tipi", () => {
  it("eğik ve düz kaş direği aynı uzatır, kalem adında tip yazar", () => {
    const egik = tasarim((t) => (t.direk.kasli = true));
    const duz = tasarim((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "duz")));
    expect(direkBoyu(egik)).toBe(direkBoyu(duz));
    expect(direkBoyu(duz)).toBe(2.5); // 1,5 + 0,5 gömme + 0,4 kaş → 2,5
    expect(hesapla(duz).kalemler.find((k) => k.ad.startsWith("Ara direk"))!.ad).toContain("düz kaşlı");
    expect(hesapla(egik).kalemler.find((k) => k.ad.startsWith("Ara direk"))!.ad).toContain("eğik kaşlı");
  });
});

describe("V kaş", () => {
  it("üst dikenli tel iki kola çekilir: sıra sayısı iki kat", () => {
    const egik = hesapla(tasarim((t) => ((t.direk.kasli = true), (t.ekstra.ustTel = "dikenli"), (t.ekstra.ustSira = 3))));
    const v = hesapla(tasarim((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "v"), (t.ekstra.ustTel = "dikenli"), (t.ekstra.ustSira = 3))));
    const m = (s: typeof v) => s.kalemler.find((k) => k.ad.startsWith("Üst dikenli"))!;
    expect(m(v).miktar).toBe(m(egik).miktar * 2);
    expect(m(v).ad).toContain("iki kolda 3+3");
    expect(v.kalemler.find((k) => k.ad.startsWith("Ara direk"))!.ad).toContain("V kaşlı");
  });
});

describe("payanda aralığı ve çift köşe direği", () => {
  it("kaç direkte bir payanda seçilebilir; 0 iken yalnız köşe/uçta", () => {
    const dz = (n: number) => hesapla(tasarim((t) => ((t.sekil = "duz"), (t.olculer.A = 100), (t.direk.payandaHer = n))));
    expect(dz(5).sayilar.gergi).toBe(7); // 40 aralık: 5,10,…,35
    expect(dz(10).sayilar.gergi).toBe(3);
    expect(dz(0).sayilar.gergi).toBe(0);
    expect(dz(0).sayilar.payanda).toBe(2);
  });

  it("çift köşe yalnız kafes telde; ikiz direk köşenin hemen yanında", () => {
    const kafes = hesapla(tasarim(() => {}));
    const panel = hesapla(tasarim((t) => (t.tel.tip = "panel")));
    expect(kafes.sayilar.kose).toBe(8);
    expect(panel.sayilar.kose).toBe(4);
    const koseler = kafes.direkler.filter((d) => d.rol === "kose");
    const yakin = koseler.filter((d) => koseler.some((e) => e !== d && Math.hypot(e.p[0] - d.p[0], e.p[2] - d.p[2]) < 0.25));
    expect(yakin).toHaveLength(8); // her köşe direğinin 20 cm yanında ikizi var
    expect(koseler.every((d) => d.payanda.length === 1)).toBe(true);
  });
});

describe("kaş yönü", () => {
  it("tüm direklerde (çift köşe ikizi dahil) dış yön arazinin dışına bakar", () => {
    for (const sekil of ["dikdortgen", "L", "U"] as const) {
      const s = hesapla(tasarim((t) => ((t.sekil = sekil), (t.direk.kasli = true))));
      for (const d of s.direkler) {
        // Direğin 1 m dış yönündeki nokta arazi çokgeninin dışında olmalı
        const x = d.p[0] + d.dis[0] * 1;
        const z = d.p[2] + d.dis[1] * 1;
        const { noktalar } = sekilNoktalari({ ...varsayilanTasarim(), sekil });
        expect(icinde(x, z, noktalar)).toBe(false);
      }
    }
  });
});

describe("çift köşe kuralı", () => {
  const kose = (f: (t: Tasarim) => void) => hesapla(tasarim(f)).sayilar.kose;
  it("kafes: her zaman çift", () => {
    expect(kose(() => {})).toBe(8);
    expect(kose((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "duz")))).toBe(8);
  });
  it("panel: tek; yalnızca eğik kaşta çift", () => {
    const panel = (f: (t: Tasarim) => void) => kose((t) => ((t.tel.tip = "panel"), f(t)));
    expect(panel(() => {})).toBe(4);
    expect(panel((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "egik")))).toBe(8);
    expect(panel((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "duz")))).toBe(4);
    expect(panel((t) => ((t.direk.kasli = true), (t.direk.kasTipi = "v")))).toBe(4);
    expect(panel((t) => ((t.direk.kasli = false), (t.direk.kasTipi = "egik")))).toBe(4);
  });
  it("dikenli ve tavuk teli: tek", () => {
    expect(kose((t) => ((t.tel.tip = "tavuk"), (t.direk.kasli = true)))).toBe(4);
    expect(kose((t) => ((t.tel.tip = "dikenli"), (t.direk.kasli = true)))).toBe(4);
  });
});

describe("panelde payanda", () => {
  it("panel çitte payanda yok; eğik kaşta var", () => {
    const panel = hesapla(tasarim((t) => (t.tel.tip = "panel")));
    expect(panel.sayilar.payanda).toBe(0);
    expect(panel.sayilar.gergi).toBe(0);
    expect(panel.kalemler.some((k) => k.ad.startsWith("Payanda"))).toBe(false);
    expect(panel.direkler.every((d) => d.payanda.length === 0)).toBe(true);
    const egik = hesapla(tasarim((t) => ((t.tel.tip = "panel"), (t.direk.kasli = true), (t.direk.kasTipi = "egik"))));
    expect(egik.sayilar.payanda).toBeGreaterThan(0);
    const duz = hesapla(tasarim((t) => ((t.tel.tip = "panel"), (t.direk.kasli = true), (t.direk.kasTipi = "duz"))));
    expect(duz.sayilar.payanda).toBe(0);
  });
  it("kafeste payanda değişmez", () => {
    expect(hesapla(tasarim(() => {})).sayilar.payanda).toBe(12);
  });
});
