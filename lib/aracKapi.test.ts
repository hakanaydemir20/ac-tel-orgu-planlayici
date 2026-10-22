import { describe, expect, it } from "vitest";
import { VARSAYILAN_ARAC_KAPI_FIYAT as F, VARSAYILAN_YAYA_KAPI_FIYAT as Y, aracKapiHesapla, kanatBoyu, rayBoyu, varsayilanAracKapi } from "./aracKapi";
import { AILELER } from "./kapiAilesi";

const ay = { kdvYuzde: 20, aracKapi: F };

describe("araç kapısı fiyatı", () => {
  it("raylı sürgülü: m² × fiyat + motor + fotosel + ray (2× açıklık) + montaj", () => {
    const k = { ...varsayilanAracKapi(), genislik: 5, yukseklik: 2, dolgu: "profil" as const };
    const s = aracKapiHesapla(k, ay);
    expect(s.alan).toBe(10);
    expect(s.kalemler[0].tutar).toBe(10 * F.m2.surgulu.profil);
    expect(s.kalemler.find((x) => x.ad.startsWith("Ray"))!.miktar).toBe(10);
    expect(s.toplam).toBe(s.araToplam + Math.round(s.araToplam * 0.2));
  });

  it("konsol kanadı kuyrukla 1,5 kat uzun", () => {
    const k = { ...varsayilanAracKapi(), tip: "konsol" as const, genislik: 6 };
    expect(kanatBoyu(k)).toBe(9);
    expect(rayBoyu(k)).toBe(4);
    expect(aracKapiHesapla(k, ay).alan).toBe(9 * k.yukseklik);
  });

  it("çift kanatta iki kol motoru, ray yok", () => {
    const s = aracKapiHesapla({ ...varsayilanAracKapi(), tip: "cift" }, ay);
    expect(s.kalemler.find((x) => x.ad.startsWith("Kanat kol motoru"))!.miktar).toBe(2);
    expect(s.kalemler.some((x) => x.ad.startsWith("Ray"))).toBe(false);
  });
});

describe("yaya kapısı ve genişlik sınırları", () => {
  it("tek kanat 1×2 m panel: 2 m² × fiyat + kilit, motor/ray yok", () => {
    const k = { ...AILELER.yaya.varsayilan(), dolgu: "panel" as const };
    const s = aracKapiHesapla(k, { kdvYuzde: 20, aracKapi: Y }, "yaya");
    expect(s.alan).toBe(2);
    expect(s.kalemler[0].tutar).toBe(2 * Y.m2.tek.panel);
    expect(s.kalemler[0].ad).toContain("Tek Kanat Personel kapısı");
    expect(s.kalemler.some((x) => x.ad.startsWith("Silindir kilit"))).toBe(true);
    expect(s.kalemler.some((x) => /motor|Ray|Fotosel/.test(x.ad))).toBe(false);
  });

  it("çift kanat yaya kapısında tek kilit; elektrikli kilit ayrı kalem", () => {
    const k = { ...AILELER.yaya.varsayilan(), tip: "cift" as const, genislik: 2, elektrikliKilit: true };
    const s = aracKapiHesapla(k, { kdvYuzde: 20, aracKapi: Y }, "yaya");
    expect(s.kalemler.find((x) => x.ad.startsWith("Silindir"))!.miktar).toBe(1);
    expect(s.kalemler.find((x) => x.ad.startsWith("Elektrikli"))!.birimFiyat).toBe(Y.elektrikliKilit);
  });

  it("araçta 12 m yalnız raylı/konsolda; kanatlıda 10 m'ye kadar", () => {
    expect(AILELER.arac.genislikler({ tip: "surgulu" })).toContain(12);
    expect(AILELER.arac.genislikler({ tip: "cift" })).not.toContain(12);
    const s = aracKapiHesapla({ ...varsayilanAracKapi(), genislik: 12, yukseklik: 2 }, ay);
    expect(s.alan).toBe(24);
    expect(rayBoyu({ tip: "surgulu", genislik: 12 })).toBe(24);
  });
});
