import { describe, expect, it } from "vitest";
import { enlemBoylamdanMetre, mesafe, uydudanUygula } from "./harita";
import { kenarlariHesapla, varsayilanTasarim } from "./tasarim";

describe("uydu haritasından arazi", () => {
  // Kadıköy civarı, 30 m doğu × 20 m güney dikdörtgen
  const lat = 40.99, lng = 29.03;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = 30 / (111320 * cos), dLat = 20 / 110540;
  const kose = [
    { lat, lng },
    { lat, lng: lng + dLng },
    { lat: lat - dLat, lng: lng + dLng },
    { lat: lat - dLat, lng },
  ];

  it("enlem/boylam köşeler metreye döner", () => {
    expect(enlemBoylamdanMetre(kose)).toEqual([
      [0, 0],
      [30, 0],
      [30, 20],
      [0, 20],
    ]);
    expect(mesafe(kose[0], kose[1])).toBeCloseTo(30, 1);
  });

  it("plana aktarınca kenarlar 30 ve 20 m", () => {
    const t = varsayilanTasarim();
    uydudanUygula(t, kose);
    expect(t.sekil).toBe("serbest");
    expect(t.konum).toEqual({ lat, lng });
    expect(kenarlariHesapla(t).map((k) => Math.round(k.yatay * 10) / 10)).toEqual([30, 20, 30, 20]);
  });
});

import { aramaSorgulari } from "./harita";
describe("aramaSorgulari", () => {
  it("kısaltmaları açar, kapı no ve sokağı atar, sonunda mahalle + ilçe dener", () => {
    const l = aramaSorgulari("Atatürk Mah. Gül Sk. No:12/3 Ataşehir İstanbul");
    expect(l[0]).toBe("Atatürk Mah. Gül Sk. No:12/3 Ataşehir İstanbul");
    expect(l).toContain("Atatürk Mahallesi, Ataşehir İstanbul");
    expect(l).toContain("Atatürk, Ataşehir İstanbul");
  });
  it("virgüllü adres", () => {
    const l = aramaSorgulari("Kocatepe mh., Kızılay cd. 5, Çankaya, Ankara");
    expect(l).toContain("Kocatepe Mahallesi, Çankaya, Ankara");
  });
});
