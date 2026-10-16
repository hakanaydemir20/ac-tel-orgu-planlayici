// Tel desenleri: tek bir göz hücresini canvas'a çizip tekrarlayan doku yapar.
import * as THREE from "three";
import { TelTipiId } from "@/lib/katalog";

const PX = 128;
const onbellek = new Map<string, THREE.CanvasTexture>();

/** Bir doku hücresinin metre cinsinden boyutu (genişlik, yükseklik). */
export function hucreBoyu(tip: TelTipiId, gozMm: number): [number, number] {
  const g = gozMm / 1000;
  if (tip === "kafes") return [g * 1.41, g * 1.41];
  if (tip === "tavuk") return [g * 1.732, g * 3]; // altıgen döşeme
  if (tip === "panel") return [g, 0.2];
  return [g, g];
}

export function telDokusu(tip: TelTipiId, gozMm: number, kalinlikMm: number) {
  const anahtar = `${tip}-${gozMm}-${kalinlikMm}`;
  const var_ = onbellek.get(anahtar);
  if (var_) return var_;

  const [w, h] = hucreBoyu(tip, gozMm);
  const cw = PX;
  const ch = Math.round((PX * h) / w);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const x = c.getContext("2d")!;
  // Hafif bir taban örtüsü: uzaktan bakınca tel tamamen kaybolmasın
  x.fillStyle = "rgba(255,255,255,0.12)";
  x.fillRect(0, 0, cw, ch);
  x.strokeStyle = "#fff";
  x.lineCap = "round";
  // Çizgi kalınlığı gerçek tel oranında, ama uzaktan kaybolmasın diye alt sınırlı
  x.lineWidth = Math.max(11, (kalinlikMm / 1000 / w) * cw * 2.5);

  if (tip === "kafes") {
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(cw, ch);
    x.moveTo(cw, 0);
    x.lineTo(0, ch);
    x.stroke();
  } else if (tip === "tavuk") {
    // Altıgen döşeme: hücre = √3·r × 3r
    const r = cw / Math.sqrt(3);
    const hx = (cx: number, cy: number) => {
      x.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    };
    for (const [cx, cy] of [
      [cw / 2, 0],
      [cw / 2, ch],
      [0, ch / 2],
      [cw, ch / 2],
    ])
      hx(cx, cy);
  } else if (tip === "panel") {
    x.lineWidth = Math.max(14, x.lineWidth);
    x.beginPath();
    x.moveTo(x.lineWidth / 2, 0);
    x.lineTo(x.lineWidth / 2, ch);
    x.moveTo(0, ch - x.lineWidth / 2);
    x.lineTo(cw, ch - x.lineWidth / 2);
    x.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  onbellek.set(anahtar, t);
  return t;
}

let betonOnbellek: THREE.CanvasTexture | null = null;

/**
 * Beton direk dokusu: açık gri zemin, ince kum lekeleri, birkaç koyu leke ve
 * yaklaşık 40 cm'de bir hafif yatay çentik (kalıp izi / tel bağlama yeri).
 * Doku 1 m yüksekliği karşılar; malzemede repeat.y = direk boyu.
 */
export function betonDokusu() {
  if (betonOnbellek) return betonOnbellek;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#c9ccce";
  x.fillRect(0, 0, c.width, c.height);
  // Kum lekeleri (belirli tohumla, her açılışta aynı)
  let tohum = 7;
  const rast = () => ((tohum = (tohum * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2200; i++) {
    const g = 175 + Math.floor(rast() * 60);
    x.fillStyle = `rgba(${g},${g + 2},${g + 4},${0.35 + rast() * 0.4})`;
    x.fillRect(rast() * c.width, rast() * c.height, 1 + rast() * 1.5, 1 + rast() * 1.5);
  }
  for (let i = 0; i < 9; i++) {
    x.fillStyle = `rgba(120,124,128,${0.06 + rast() * 0.08})`;
    x.beginPath();
    x.ellipse(rast() * c.width, rast() * c.height, 4 + rast() * 10, 3 + rast() * 14, 0, 0, Math.PI * 2);
    x.fill();
  }
  // Yatay çentikler
  for (const y of [40, 142, 244]) {
    x.fillStyle = "rgba(95,100,105,0.45)";
    x.fillRect(0, y, c.width, 2);
    x.fillStyle = "rgba(255,255,255,0.35)";
    x.fillRect(0, y + 2, c.width, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  betonOnbellek = t;
  return t;
}
