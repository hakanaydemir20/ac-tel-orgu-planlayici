import { beforeEach, describe, expect, it } from "vitest";
import { useTasarim } from "./store";

describe("zemin seçimi", () => {
  beforeEach(() => useTasarim.getState().sifirla());

  it("beton zemine geçince beton direk profile döner", () => {
    expect(useTasarim.getState().tasarim.direk.tip).toBe("beton");
    useTasarim.getState().zeminSec("beton");
    const t = useTasarim.getState().tasarim;
    expect(t.zemin).toBe("beton");
    expect(t.direk).toMatchObject({ tip: "profil", olcu: "40x40" });
  });

  it("beton zeminde beton direk seçilemez, toprağa dönünce seçilebilir", () => {
    useTasarim.getState().zeminSec("beton");
    useTasarim.getState().direkTipiSec("beton");
    expect(useTasarim.getState().tasarim.direk.tip).toBe("profil");
    useTasarim.getState().zeminSec("toprak");
    useTasarim.getState().direkTipiSec("beton");
    expect(useTasarim.getState().tasarim.direk.tip).toBe("beton");
  });

  it("boru direk seçiliyken zemin değişimi direği korur", () => {
    useTasarim.getState().direkTipiSec("boru");
    useTasarim.getState().zeminSec("beton");
    expect(useTasarim.getState().tasarim.direk.tip).toBe("boru");
  });
});
