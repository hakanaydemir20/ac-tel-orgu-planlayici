// 2B yardımcılar: 3D sahne ve PDF arazi planı ortak kullanır.
import type { Nokta } from "./hesap";
import type { Nokta2 } from "./tasarim";

export function icinde(x: number, z: number, poli: Nokta2[]) {
  let ic = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, zi] = poli[i];
    const [xj, zj] = poli[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) ic = !ic;
  }
  return ic;
}

/** Bir noktada çitin dış tarafına bakan yatay normal (xz). Açık hatta sabit bir yan seçilir. */
export function disNormal(p: Nokta, yon: [number, number], poli: Nokta2[] | null): [number, number] {
  const n: [number, number] = [-yon[1], yon[0]];
  if (!poli) return n;
  return icinde(p[0] + n[0] * 0.3, p[2] + n[1] * 0.3, poli) ? [-n[0], -n[1]] : n;
}
