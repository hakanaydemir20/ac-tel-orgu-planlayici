import { describe, expect, it } from "vitest";
import { alimHesapla, boyPlani } from "./uretim";

describe("6 m boy kesim optimizasyonu", () => {
  it("parçaları en az boya yerleştirir", () => {
    // 4 × 200 cm + 2 × 150 cm = 1100 cm → 2 boy (200+200+150+testere, 200+200+150)
    expect(boyPlani([200, 200, 200, 200, 150, 150]).length).toBe(2);
    // 3 × 250 cm: her boya 2 tane sığar (500 + testere) → 2 boy
    expect(boyPlani([250, 250, 250]).length).toBe(2);
  });

  it("6 m'den uzun parça ek boyla karşılanır", () => {
    expect(boyPlani([800]).length).toBe(2);
  });

  it("alım özeti: profil başına toplam, boy ve fire", () => {
    const [a] = alimHesapla([{ profil: "40x40 kutu profil", ad: "Ara direk", boyCm: 225, adet: 8 }]);
    expect(a.parcaAdet).toBe(8);
    expect(a.toplamCm).toBe(1800);
    expect(a.boy).toBe(4); // her boydan 2 parça (450 cm), 8 parça → 4 boy
    expect(a.fireYuzde).toBe(25);
  });
});
