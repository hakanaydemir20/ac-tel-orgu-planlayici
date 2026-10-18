import { describe, expect, it } from "vitest";
import { VARSAYILAN_ARAC_KAPI_FIYAT as F, aracKapiHesapla, kanatBoyu, rayBoyu, varsayilanAracKapi } from "./aracKapi";

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
