import { beforeEach, describe, expect, it } from "vitest";
import { birlestir } from "./birlestir";
import { VARSAYILAN_AYARLAR } from "./katalog";
import { tasarimiTamamla, useTasarim } from "./store";
import { sayiOku } from "./sayi";
import { waNumarasi } from "./telefon";
import { useTeklifler } from "./teklifler";
import { bosMusteri, varsayilanTasarim } from "./tasarim";

describe("kayıtlı veriyi birleştirme", () => {
  it("eski ayar kaydına yeni alanlar varsayılanla eklenir, kullanıcı fiyatları korunur", () => {
    const eski = { telMetre: { kafes: { "1.5": 200, "3": 999 } }, kdvYuzde: 10, firma: { ad: "X Tel" } };
    const a = birlestir(VARSAYILAN_AYARLAR, eski);
    expect(a.telMetre.kafes["1.5"]).toBe(200);
    expect(a.telMetre.kafes["3"]).toBe(999); // kullanıcının eklediği anahtar kalır
    expect(a.telMetre.kafes["1"]).toBe(95); // eksik olan varsayılandan
    expect(a.kdvYuzde).toBe(10);
    expect(a.firma).toEqual({ ...VARSAYILAN_AYARLAR.firma, ad: "X Tel" });
    expect(a.dubelDirek).toBe(4);
  });

  it("tipi bozuk değer yok sayılır", () => {
    const a = birlestir(VARSAYILAN_AYARLAR, { kdvYuzde: "yirmi", montajMetre: null, nakliyeKm: NaN });
    expect(a.kdvYuzde).toBe(20);
    expect(a.montajMetre).toBe(VARSAYILAN_AYARLAR.montajMetre);
    expect(a.nakliyeKm).toBe(VARSAYILAN_AYARLAR.nakliyeKm);
  });

  it("tasarımdaki diziler (kapılar, köşeler) kayıttaki uzunlukla gelir", () => {
    const k = varsayilanTasarim();
    k.ekstra.kapilar = [];
    k.kenarlar = Array.from({ length: 12 }, () => ({ aktif: true, egim: 0 }));
    k.serbest = { noktalar: [[0, 0], [5, 0], [5, 5]], kapali: true };
    const { musteri: _m, ...musterisiz } = k; // musteri alanı olmayan eski kayıt
    const t = tasarimiTamamla(musterisiz);
    expect(t.ekstra.kapilar).toEqual([]);
    expect(t.kenarlar).toHaveLength(12);
    expect(t.serbest.noktalar).toHaveLength(3);
    expect(t.musteri).toEqual(bosMusteri());
  });
});

describe("WhatsApp numarası", () => {
  it.each([
    ["0532 123 45 67", "905321234567"],
    ["532 123 4567", "905321234567"],
    ["+90 (532) 123-45-67", "905321234567"],
    ["0090 532 123 45 67", "905321234567"],
    ["123", ""],
    ["", ""],
  ])("%s → %s", (girdi, beklenen) => expect(waNumarasi(girdi)).toBe(beklenen));
});

describe("teklif listesi", () => {
  beforeEach(() => {
    useTeklifler.setState({ liste: [] });
    useTasarim.getState().sifirla();
  });

  it("aynı numara güncellenir, yeni numara en üste eklenir", () => {
    const t = varsayilanTasarim();
    const k = { no: "AC-1", tarih: "2026-10-16T10:00:00.000Z", musteri: "Ali", toplam: 100, telUzunluk: 96, tasarim: t };
    useTeklifler.getState().kaydet(k);
    useTeklifler.getState().kaydet({ ...k, no: "AC-2", musteri: "Ayşe" });
    useTeklifler.getState().kaydet({ ...k, toplam: 150 });
    const l = useTeklifler.getState().liste;
    expect(l.map((x) => x.no)).toEqual(["AC-1", "AC-2"]);
    expect(l[0].toplam).toBe(150);
    useTeklifler.getState().sil("AC-1");
    expect(useTeklifler.getState().liste.map((x) => x.no)).toEqual(["AC-2"]);
  });

  it("kayıtlı teklif açılınca tasarım yerine geçer, kayıt değişmez", () => {
    const t = varsayilanTasarim();
    t.teklifNo = "AC-9";
    t.musteri.ad = "Veli";
    t.olculer.A = 55;
    useTeklifler.getState().kaydet({ no: "AC-9", tarih: "", musteri: "Veli", toplam: 1, telUzunluk: 1, tasarim: t });
    useTasarim.getState().yukle(useTeklifler.getState().liste[0].tasarim);
    useTasarim.getState().guncelle((x) => void (x.olculer.A = 60));
    expect(useTasarim.getState().tasarim.teklifNo).toBe("AC-9");
    expect(useTeklifler.getState().liste[0].tasarim.olculer.A).toBe(55);
  });
});

describe("ölçü kutusu okuma", () => {
  it.each([
    ["1.500", 1500],
    ["1500", 1500],
    ["1.500,5", 1500.5],
    ["1500,5", 1500.5],
    ["12,25", 12.25],
    ["12.25", 12.25],
  ])("%s → %s", (x, y) => expect(sayiOku(x)).toBe(y));
});

describe("yeni teklif", () => {
  it("ekranı temizler ve girilen kişi/firma bilgisiyle başlar", () => {
    useTasarim.getState().guncelle((x) => {
      x.olculer.A = 77;
      x.teklifNo = "AC-ESKI";
    });
    const m = { ...bosMusteri(), tip: "firma" as const, ad: "Yılmaz İnşaat", yetkili: "Ali Yılmaz", eposta: "ali@ornek.com" };
    useTasarim.getState().sifirla(m);
    const t = useTasarim.getState().tasarim;
    expect(t.olculer.A).toBe(30);
    expect(t.teklifNo).toBe("");
    expect(t.musteri).toEqual(m);
    m.ad = "değişti";
    expect(useTasarim.getState().tasarim.musteri.ad).toBe("Yılmaz İnşaat"); // kopya alınır
  });
});

describe("verilen teklif kendi fiyatlarıyla kalır", () => {
  beforeEach(() => {
    useTeklifler.setState({ liste: [] });
    useTasarim.getState().sifirla();
  });

  it("kaydedilince fiyatlar donar; Ayarlar değişse de toplam değişmez", async () => {
    const { hesapla } = await import("./hesap");
    const { etkinAyarlar } = await import("./ayarlar");
    const { teklifiKaydetSaf } = await import("./teklifKaydi");
    const guncel = structuredClone(VARSAYILAN_AYARLAR);
    const t0 = useTasarim.getState().tasarim;
    const s0 = hesapla(t0, etkinAyarlar(t0, guncel));
    teklifiKaydetSaf(t0, s0, guncel, new Date("2026-10-16T10:00:00Z"));

    const t = useTasarim.getState().tasarim;
    expect(t.fiyatlar?.tarih).toBe("2026-10-16T10:00:00.000Z");
    // Fiyatlar sonradan artırılıyor
    guncel.kafesMetre["1.5"]["50"]["2.5"] = 999;
    guncel.firma.telefon = "0212 000 00 00";
    expect(hesapla(t, etkinAyarlar(t, guncel)).toplam).toBe(s0.toplam);
    expect(etkinAyarlar(t, guncel).firma.telefon).toBe("0212 000 00 00"); // firma bilgisi güncel
    // Arşivden açılan teklif de eski fiyatlarla
    useTasarim.getState().sifirla();
    useTasarim.getState().yukle(useTeklifler.getState().liste[0].tasarim);
    const acilan = useTasarim.getState().tasarim;
    expect(hesapla(acilan, etkinAyarlar(acilan, guncel)).toplam).toBe(s0.toplam);
    expect(useTeklifler.getState().liste[0].kalemler?.length).toBe(s0.kalemler.length);
    // Yeni teklif güncel fiyatlarla
    useTasarim.getState().sifirla();
    const yeni = useTasarim.getState().tasarim;
    expect(hesapla(yeni, etkinAyarlar(yeni, guncel)).toplam).toBeGreaterThan(s0.toplam);
  });

  it("göz/kalınlık tablosundan önce dondurulmuş teklif eski tek fiyatıyla kalır", async () => {
    const { hesapla } = await import("./hesap");
    const { etkinAyarlar } = await import("./ayarlar");
    const { kafesMetre: _, ...eski } = structuredClone(VARSAYILAN_AYARLAR);
    eski.telMetre.kafes["1.5"] = 150;
    const t = { ...varsayilanTasarim(), fiyatlar: { tarih: "2026-01-01T00:00:00Z", ayarlar: eski as typeof VARSAYILAN_AYARLAR } };
    t.tel = { ...t.tel, goz: 40, kalinlik: 3.5 };
    const tel = hesapla(t, etkinAyarlar(t, VARSAYILAN_AYARLAR)).kalemler.find((k) => k.grup === "Tel")!;
    expect(tel.birimFiyat).toBe(150);
  });

  it("değişen teklif yeniden kaydedilince önceki hali revizyon olarak kalır", () => {
    const t = varsayilanTasarim();
    const k = { no: "AC-R", tarih: "", musteri: "", toplam: 100, telUzunluk: 1, tasarim: t };
    useTeklifler.getState().kaydet(k);
    useTeklifler.getState().kaydet({ ...k, toplam: 100 }); // değişmedi → revizyon yok
    useTeklifler.getState().kaydet({ ...k, toplam: 120 });
    const kayit = useTeklifler.getState().liste[0];
    expect(kayit.toplam).toBe(120);
    expect(kayit.gecmis?.map((g) => g.toplam)).toEqual([100]);
  });
});
