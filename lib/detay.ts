// PDF'teki yakın çekim için örnek çit parçası: aynı tel/direk seçimiyle küçük bir köşe.
import { Tasarim } from "./tasarim";

export function detayTasarimi(t: Tasarim): Tasarim {
  const a = Math.max(1, t.direk.aralik);
  const d = structuredClone(t);
  d.sekil = "serbest";
  // İki direk aralığı + köşe + 1,6 aralık: köşe, gergi payandası ve tel deseni görünür
  d.serbest = { noktalar: [[0, 0], [2 * a, 0], [2 * a, 1.6 * a]], kapali: false };
  d.kenarlar = [];
  d.ekstra = { ...d.ekstra, kapilar: [] };
  return d;
}
