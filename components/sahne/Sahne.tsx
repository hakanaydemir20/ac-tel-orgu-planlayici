"use client";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Environment, GizmoHelper, GizmoViewcube, Grid, Lightformer, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTema } from "@/lib/tema";
import * as THREE from "three";
import type { Direk, Kosu, Nokta, Sonuc } from "@/lib/hesap";
import { KAS_UZUNLUK, direkRengi, direkTipi, ustOlcu } from "@/lib/katalog";
import { Tasarim, kenarHarfi, sekilNoktalari } from "@/lib/tasarim";
import { disNormal, icinde } from "@/lib/geometri";
import { sayiOku } from "@/lib/sayi";
import { betonDokusu, hucreBoyu, telDokusu } from "./dokular";

// ---------- yardımcılar ----------

/** useMemo ile kurulan three nesnesi yenilenince ya da bileşen kalkınca GPU belleğini boşaltır. */
function useAt(...nesneler: ({ dispose: () => void } | null | undefined)[]) {
  useEffect(() => () => nesneler.forEach((n) => n?.dispose()), nesneler); // eslint-disable-line react-hooks/exhaustive-deps
}

const V = (p: Nokta) => new THREE.Vector3(p[0], p[1], p[2]);
const YUKARI = new THREE.Vector3(0, 1, 0);

/** "10x10" → 0.10 m, "40x40" → 0.04 m, "Ø48" → 0.048 m */
function kesit(olcu: string) {
  const n = parseFloat(olcu.match(/\d+(\.\d+)?/)?.[0] ?? "10");
  return n >= 20 ? n / 1000 : n / 100;
}

/** İki nokta arasında kare kesitli çubuk (payanda, kapı çerçevesi, kaş kolu). */
function Cubuk({ a, b, k, renk, malzeme }: { a: THREE.Vector3; b: THREE.Vector3; k: number; renk?: string; malzeme?: THREE.Material }) {
  const { orta, q, boy } = useMemo(() => {
    const d = b.clone().sub(a);
    return {
      orta: a.clone().add(b).multiplyScalar(0.5),
      q: new THREE.Quaternion().setFromUnitVectors(YUKARI, d.clone().normalize()),
      boy: d.length(),
    };
  }, [a, b]);
  return (
    <mesh position={orta} quaternion={q} castShadow material={malzeme}>
      <boxGeometry args={[k, boy, k]} />
      {!malzeme && <meshStandardMaterial color={renk} metalness={0.6} roughness={0.4} />}
    </mesh>
  );
}

// ---------- tel yüzeyi ----------

function TelYuzeyi({ kosu, alt, h, malzeme, hucre }: { kosu: Kosu; alt: number; h: number; malzeme: THREE.Material; hucre: [number, number] }) {
  const geo = useMemo(() => {
    const [a, b] = [kosu.a, kosu.b];
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [a[0], a[1] + alt, a[2], b[0], b[1] + alt, b[2], b[0], b[1] + alt + h, b[2], a[0], a[1] + alt + h, a[2]],
        3
      )
    );
    const u = L / hucre[0];
    const v = h / hucre[1];
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, v], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, [kosu, alt, h, hucre]);
  useAt(geo);
  return <mesh geometry={geo} material={malzeme} />;
}

// ---------- direkler ----------

/**
 * Kaş kolunun birim yönü (dışa yatay dx, yukarı dy): düz kaş dik; beton direkte eğik/V kaş
 * gövdenin devamı olarak ~30° kırılır (görseldeki gibi); demir direkte 45°.
 */
export function kasVektoru(t: Tasarim) {
  if (t.direk.kasTipi === "duz") return { dx: 0, dy: 1 };
  if (t.direk.tip === "beton") return { dx: Math.sin(Math.PI / 6), dy: Math.cos(Math.PI / 6) };
  return { dx: Math.SQRT1_2, dy: Math.SQRT1_2 };
}

function Direkler({
  direkler,
  t,
  poli,
  baslangic,
  animasyon = true,
  dubel,
}: {
  direkler: Direk[];
  t: Tasarim;
  poli: [number, number][] | null;
  baslangic: React.RefObject<number>;
  animasyon?: boolean;
  dubel: { direk: number; payanda: number };
}) {
  const dt = direkTipi(t.direk.tip);
  const h = t.tel.yukseklik + 0.08;
  const ara = kesit(t.direk.olcu);
  const guclu = kesit(ustOlcu(dt, t.direk.olcu));
  const boru = t.direk.tip === "boru";
  const renk = t.direk.renk;

  const betonDirek = t.direk.tip === "beton";
  const malzeme = useMemo(() => {
    if (!betonDirek) {
      const boyali = renk !== "galvaniz"; // boyalı: daha mat, metal parlaklığı az
      return new THREE.MeshStandardMaterial({ color: direkRengi(renk).renk, roughness: boyali ? 0.55 : 0.35, metalness: boyali ? 0.3 : 0.75 });
    }
    // Beton: dokulu, mat; doku 1 m'yi karşılar, direk boyunca tekrar eder
    const doku = betonDokusu().clone();
    doku.repeat.set(1, h);
    doku.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: doku, color: "#ffffff", roughness: 0.95, metalness: 0, flatShading: true });
  }, [betonDirek, renk, h]);
  // Beton direk: kare kesit, tepeye doğru hafif incelen gövde (4 kenarlı kesik piramit)
  const govde = (s: number) => {
    if (boru) return new THREE.CylinderGeometry(s / 2, s / 2, h, 16);
    if (!betonDirek) return new THREE.BoxGeometry(s, h, s);
    const g = new THREE.CylinderGeometry((s * 0.85) / Math.SQRT2, s / Math.SQRT2, h, 4, 1);
    g.rotateY(Math.PI / 4);
    return g;
  };
  const geoAra = useMemo(() => govde(ara), [boru, betonDirek, ara, h]); // eslint-disable-line react-hooks/exhaustive-deps
  const geoGuclu = useMemo(() => govde(guclu), [boru, betonDirek, guclu, h]); // eslint-disable-line react-hooks/exhaustive-deps
  useAt(malzeme, geoAra, geoGuclu);

  // Açılışta direkler sırayla "dikilir"
  const refler = useRef<(THREE.Group | null)[]>([]);
  const bitti = useRef(!animasyon);
  useFrame(() => {
    if (bitti.current) return;
    const s = (performance.now() - baslangic.current) / 1000;
    let hepsi = true;
    refler.current.forEach((g, i) => {
      if (!g) return;
      const k = THREE.MathUtils.clamp((s - 0.5 - i * 0.012) / 0.35, 0, 1);
      if (k < 1) hepsi = false;
      g.scale.y = Math.max(0.001, 1 - (1 - k) ** 3);
    });
    if (hepsi) bitti.current = true;
  });

  const kas = t.direk.kasli ? KAS_UZUNLUK : 0;
  const vKas = t.direk.kasTipi === "v";
  const kv = kasVektoru(t);
  const kasDy = kas * kv.dy;
  const kasDx = kas * kv.dx;
  const temelTabla = t.zemin === "toprak" && t.ekstra.temel; // toprakta dökülen beton temel görünür
  const tablaMalzeme = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7f8489", roughness: 1, metalness: 0 }), []);
  useAt(tablaMalzeme);
  const beton = t.zemin === "beton";
  const plakaMalzeme = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e98a6", metalness: 0.8, roughness: 0.35 }), []);
  const kapakMalzeme = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b2027", roughness: 0.7, metalness: 0.1 }), []);
  useAt(plakaMalzeme, kapakMalzeme);

  return (
    <group>
      {direkler.map((d, i) => {
        const g = d.rol !== "ara";
        const k = g ? guclu : ara;
        const n = d.dis; // hesapta kenarın ortasından bulunan dış yön
        const ust = new THREE.Vector3(d.p[0], d.p[1] + h, d.p[2]);
        return (
          <group key={i} position={[0, 0, 0]}>
            <group
              ref={(el) => void (refler.current[i] = el)}
              position={[d.p[0], d.p[1], d.p[2]]}
              scale={[1, bitti.current ? 1 : 0.001, 1]}
            >
              <mesh geometry={g ? geoGuclu : geoAra} material={malzeme} position={[0, h / 2, 0]} castShadow receiveShadow />
              {/* Demir direkte tepe kapağı (beton direkte yok) */}
              {t.direk.tip !== "beton" && (
                <mesh material={kapakMalzeme} position={[0, h + 0.008, 0]}>
                  {boru ? <cylinderGeometry args={[k * 0.58, k * 0.58, 0.016, 16]} /> : <boxGeometry args={[k * 1.15, 0.016, k * 1.15]} />}
                </mesh>
              )}
              {/* Flanş yalnız beton zeminde */}
              {beton && <Flans k={k} malzeme={malzeme} civata dubel={dubel.direk} />}
            </group>
            {temelTabla && (
              <mesh material={tablaMalzeme} position={[d.p[0], d.p[1] + 0.012, d.p[2]]} receiveShadow>
                <cylinderGeometry args={[k * 1.5, k * 1.7, 0.025, 10]} />
              </mesh>
            )}
            {kas > 0 && (
              <Cubuk a={ust} b={new THREE.Vector3(ust.x + n[0] * kasDx, ust.y + kasDy, ust.z + n[1] * kasDx)} k={betonDirek ? k * 0.85 : k * 0.8} malzeme={malzeme} />
            )}
            {/* V kaş: ikinci kol içe doğru */}
            {kas > 0 && vKas && (
              <Cubuk a={ust} b={new THREE.Vector3(ust.x - n[0] * kasDx, ust.y + kasDy, ust.z - n[1] * kasDx)} k={betonDirek ? k * 0.85 : k * 0.8} malzeme={malzeme} />
            )}
            {d.payanda.map((p, j) => (
              <group key={j}>
                <Cubuk
                  a={new THREE.Vector3(d.p[0], d.p[1] + h * 0.72, d.p[2])}
                  b={new THREE.Vector3(d.p[0] + p[0] * h * 0.6, d.p[1], d.p[2] + p[1] * h * 0.6)}
                  k={betonDirek ? ara * 0.9 : ara * 0.85}
                  malzeme={malzeme}
                />
                {temelTabla && (
                  <mesh material={tablaMalzeme} position={[d.p[0] + p[0] * h * 0.6, d.p[1] + 0.012, d.p[2] + p[1] * h * 0.6]} receiveShadow>
                    <cylinderGeometry args={[ara * 1.4, ara * 1.6, 0.025, 9]} />
                  </mesh>
                )}
                {/* Payanda ayağında flanş yok; dübel varsa yakın çekimde başları görünür */}
                {beton && !animasyon && dubel.payanda > 0 && (
                  <group position={[d.p[0] + p[0] * h * 0.6, d.p[1], d.p[2] + p[1] * h * 0.6]}>
                    <DubelBaslari adet={dubel.payanda} r={ara * 0.9} y={0.008} malzeme={plakaMalzeme} />
                  </group>
                )}
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Beton zeminde demir direğin flanşı; yakın çekimde dübel başları da çizilir. */
function Flans({ k, malzeme, civata, dubel }: { k: number; malzeme: THREE.Material; civata: boolean; dubel: number }) {
  const a = Math.max(k * 3, 0.14); // plaka kenarı (direkle aynı renk, görseldeki gibi kare taban)
  return (
    <group>
      <mesh material={malzeme} position={[0, 0.005, 0]} castShadow receiveShadow>
        <boxGeometry args={[a, 0.01, a]} />
      </mesh>
      {civata && <DubelBaslari adet={dubel} r={a / 2 - a * 0.15} y={0.016} malzeme={malzeme} />}
    </group>
  );
}

/** Dübel başları: köşelere (4), karşılıklı (2) ya da çember üstüne dizilir. */
function DubelBaslari({ adet, r, y, malzeme }: { adet: number; r: number; y: number; malzeme: THREE.Material }) {
  const yerler = Array.from({ length: adet }, (_, i) => {
    const aci = Math.PI / 4 + (i * 2 * Math.PI) / Math.max(adet, 1);
    const d = adet === 4 ? r * Math.SQRT2 : r;
    return [Math.cos(aci) * d, Math.sin(aci) * d] as const;
  });
  return (
    <>
      {yerler.map(([x, z], i) => (
        <mesh key={i} material={malzeme} position={[x, y, z]}>
          <cylinderGeometry args={[0.009, 0.009, 0.018, 6]} />
        </mesh>
      ))}
    </>
  );
}

// ---------- teller ----------

function YatayTeller({ kosular, yukseklikler, renk, kalinlik = 1.2 }: { kosular: Kosu[]; yukseklikler: number[]; renk: string; kalinlik?: number }) {
  return (
    <>
      {kosular.flatMap((k, i) =>
        yukseklikler.map((y, j) => (
          <Line
            key={`${i}-${j}`}
            points={[
              [k.a[0], k.a[1] + y, k.a[2]],
              [k.b[0], k.b[1] + y, k.b[2]],
            ]}
            color={renk}
            lineWidth={kalinlik}
          />
        ))
      )}
    </>
  );
}

/** Dikenli tel: yatay hat + her 15 cm'de küçük diken. */
function DikenliTeller({ hatlar }: { hatlar: [THREE.Vector3, THREE.Vector3][] }) {
  const dikenler = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Euler }[] = [];
    for (const [a, b] of hatlar) {
      const L = a.distanceTo(b);
      const n = Math.floor(L / 0.15);
      for (let i = 1; i < n; i++) out.push({ p: a.clone().lerp(b, i / n), q: new THREE.Euler(i * 1.3, 0, Math.PI / 4) });
    }
    return out;
  }, [hatlar]);
  return (
    <>
      {hatlar.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color="#8e98a6" lineWidth={1.4} />
      ))}
      <Tekrarli
        yerler={dikenler}
        geometri={() => new THREE.BoxGeometry(0.004, 0.05, 0.004)}
        malzeme={() => new THREE.MeshStandardMaterial({ color: "#9aa5b4", metalness: 0.8, roughness: 0.3 })}
      />
    </>
  );
}

/**
 * Aynı parçanın yüzlerce kopyası (diken, jiletli halka) tek InstancedMesh ile çizilir.
 * Kopya sayısı değişince mesh yeniden kurulur (tampon boyutu sabittir), eskisi bellekten atılır.
 */
function Tekrarli({
  yerler,
  geometri,
  malzeme,
}: {
  yerler: { p: THREE.Vector3; q: THREE.Euler | THREE.Quaternion; s?: THREE.Vector3 }[];
  geometri: () => THREE.BufferGeometry;
  malzeme: () => THREE.Material;
}) {
  const geo = useMemo(geometri, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(malzeme, []); // eslint-disable-line react-hooks/exhaustive-deps
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, mat, Math.max(1, yerler.length)), [geo, mat, yerler.length]);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const bir = new THREE.Vector3(1, 1, 1);
    yerler.forEach((y, i) =>
      mesh.setMatrixAt(i, m.compose(y.p, y.q instanceof THREE.Quaternion ? y.q : q.setFromEuler(y.q), y.s ?? bir))
    );
    mesh.count = yerler.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [mesh, yerler]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );
  return <primitive object={mesh} />;
}

/** Panel bombe sayısı: yüksekliğe göre (1,03 m: 2 · 1,53/1,73 m: 3 · 2 m+: 4). */
const bombeSayisi = (h: number) => (h < 0.9 ? 1 : h < 1.4 ? 2 : h < 1.9 ? 3 : 4);

/**
 * Gerçekçi 3D panel çit: direkten direğe paneller; dikey teller dışa V bombeli, tepede taşar,
 * yatay teller altta, üstte ve bombelerin iki yanında; panel uçlarında direğe kelepçe.
 */
function PanelCit({
  kosular,
  aralik,
  h,
  gozMm,
  kalinlikMm,
  renk,
  poli,
}: {
  kosular: Kosu[];
  aralik: number;
  h: number;
  gozMm: number;
  kalinlikMm: number;
  renk: string;
  poli: [number, number][] | null;
}) {
  const { teller, kelepceler } = useMemo(() => {
    const teller: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }[] = [];
    const kelepceler: { p: THREE.Vector3; q: THREE.Euler }[] = [];
    const r = Math.max(0.004, kalinlikMm / 1000) * 1.6; // uzaktan seçilsin diye biraz kalın
    const yukari = new THREE.Vector3(0, 1, 0);
    const parca = (a: THREE.Vector3, b: THREE.Vector3) => {
      const d = b.clone().sub(a);
      const L = d.length();
      if (L < 1e-4) return;
      teller.push({ p: a.clone().add(b).multiplyScalar(0.5), q: new THREE.Quaternion().setFromUnitVectors(yukari, d.normalize()), s: new THREE.Vector3(r, L, r) });
    };
    const bombe = bombeSayisi(h);
    const derinlik = 0.035; // V bombenin dışa çıkıntısı
    const yari = 0.05; // bombenin yarı yüksekliği
    const bombeler = Array.from({ length: bombe }, (_, k) => (h * (k + 1)) / (bombe + 1));
    const alt = 0.06;
    for (const k of kosular) {
      const a = V(k.a);
      const b = V(k.b);
      const yatay = Math.hypot(b.x - a.x, b.z - a.z);
      if (yatay < 0.1) continue;
      const yon: [number, number] = [(b.x - a.x) / yatay, (b.z - a.z) / yatay];
      const n = disNormal([(a.x + b.x) / 2, 0, (a.z + b.z) / 2], yon, poli);
      const dis = new THREE.Vector3(n[0], 0, n[1]);
      const adet = Math.max(1, Math.ceil(yatay / aralik - 1e-9));
      const nokta = (t: number, y: number, z = 0) => a.clone().lerp(b, t).add(new THREE.Vector3(0, y, 0)).addScaledVector(dis, z);
      for (let j = 0; j < adet; j++) {
        const [t0, t1] = [j / adet, (j + 1) / adet];
        const genislik = (t1 - t0) * yatay;
        const pay = 0.04 / yatay; // direk yanında boşluk
        const [u0, u1] = [t0 + pay, t1 - pay];
        // Dikey teller (bombeli)
        const tel = Math.max(2, Math.round((genislik - 0.08) / (gozMm / 1000)) + 1);
        for (let i = 0; i < tel; i++) {
          const t = u0 + ((u1 - u0) * i) / (tel - 1);
          let onceki = nokta(t, alt - 0.03);
          for (const yb of bombeler) {
            const p1 = nokta(t, yb - yari);
            const p2 = nokta(t, yb, derinlik);
            const p3 = nokta(t, yb + yari);
            parca(onceki, p1);
            parca(p1, p2);
            parca(p2, p3);
            onceki = p3;
          }
          parca(onceki, nokta(t, h + 0.03)); // tepede taşan uç
        }
        // Yatay teller: alt, üst ve her bombenin iki yanı
        for (const y of [alt, h - 0.02, ...bombeler.flatMap((yb) => [yb - yari, yb + yari])]) parca(nokta(u0, y), nokta(u1, y));
        // Kelepçeler: panelin iki ucunda, bombe hizalarında ve üstte
        for (const t of [t0 + pay * 0.4, t1 - pay * 0.4])
          for (const y of [...bombeler, h - 0.1]) {
            const p = nokta(t, y);
            kelepceler.push({ p, q: new THREE.Euler(0, Math.atan2(yon[0], yon[1]), 0) });
          }
      }
    }
    return { teller, kelepceler };
  }, [kosular, aralik, h, gozMm, kalinlikMm, poli]);

  const telMat = useMemo(() => new THREE.MeshStandardMaterial({ color: renk, metalness: 0.55, roughness: 0.4 }), [renk]);
  useAt(telMat);
  return (
    <>
      <Tekrarli key={`t${renk}`} yerler={teller} geometri={() => new THREE.CylinderGeometry(0.5, 0.5, 1, 5)} malzeme={() => telMat.clone()} />
      <Tekrarli
        key={`k${renk}`}
        yerler={kelepceler}
        geometri={() => new THREE.BoxGeometry(0.03, 0.06, 0.075)}
        malzeme={() => new THREE.MeshStandardMaterial({ color: renk, metalness: 0.4, roughness: 0.5 })}
      />
    </>
  );
}

/** Düzlemsel jiletli: çit düzleminde, iç içe geçen yassı halkalardan bir bant (baklava görünümü). */
function Duzlemsel({ kosular, y }: { kosular: Kosu[]; y: number }) {
  const R = 0.3;
  const halkalar = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Euler }[] = [];
    for (const k of kosular) {
      const a = V(k.a);
      const b = V(k.b);
      // Halka düzlemi çitin doğrultusunu içersin (normal çite dik)
      const aci = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
      const n = Math.max(1, Math.round(a.distanceTo(b) / R));
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        p.y += y + R;
        out.push({ p, q: new THREE.Euler(0, aci, 0) });
      }
    }
    return out;
  }, [kosular, y]);
  return (
    <Tekrarli
      yerler={halkalar}
      geometri={() => new THREE.TorusGeometry(R, 0.007, 4, 36)}
      malzeme={() => new THREE.MeshStandardMaterial({ color: "#d4dbe4", metalness: 0.9, roughness: 0.25 })}
    />
  );
}

/** Jiletli spiral: çit boyunca dizilmiş eğik halkalar. */
function Jiletli({ kosular, y }: { kosular: Kosu[]; y: number }) {
  const halkalar = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Euler }[] = [];
    for (const k of kosular) {
      const a = V(k.a);
      const b = V(k.b);
      const aci = Math.atan2(b.x - a.x, b.z - a.z);
      const n = Math.max(2, Math.floor(a.distanceTo(b) / 0.12));
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        p.y += y + 0.25;
        out.push({ p, q: new THREE.Euler(i % 2 ? 0.35 : -0.35, aci, 0, "YXZ") });
      }
    }
    return out;
  }, [kosular, y]);
  return (
    <Tekrarli
      yerler={halkalar}
      geometri={() => new THREE.TorusGeometry(0.25, 0.006, 4, 28)}
      malzeme={() => new THREE.MeshStandardMaterial({ color: "#c9d2dc", metalness: 0.9, roughness: 0.25 })}
    />
  );
}

// ---------- kapılar ----------

function Kapilar({ kapilar, h, telMalzeme }: { kapilar: Sonuc["kapilar"]; h: number; telMalzeme: THREE.Material }) {
  const cerceve = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b3038", metalness: 0.7, roughness: 0.35 }), []);
  return (
    <>
      {kapilar.map((k, i) => {
        const a = V(k.a);
        const b = V(k.b);
        const kanatlar: [THREE.Vector3, THREE.Vector3][] =
          k.kapi.tur === "arac" ? [[a, a.clone().lerp(b, 0.5)], [a.clone().lerp(b, 0.5), b]] : [[a, b]];
        return kanatlar.map(([p, q], j) => {
          const p0 = p.clone().add(new THREE.Vector3(0, 0.08, 0));
          const q0 = q.clone().add(new THREE.Vector3(0, 0.08, 0));
          const p1 = p0.clone().add(new THREE.Vector3(0, h, 0));
          const q1 = q0.clone().add(new THREE.Vector3(0, h, 0));
          return (
            <group key={`${i}-${j}`}>
              <Cubuk a={p0} b={q0} k={0.05} malzeme={cerceve} />
              <Cubuk a={p1} b={q1} k={0.05} malzeme={cerceve} />
              <Cubuk a={p0} b={p1} k={0.05} malzeme={cerceve} />
              <Cubuk a={q0} b={q1} k={0.05} malzeme={cerceve} />
              <TelYuzeyi kosu={{ a: [p.x, p.y, p.z], b: [q.x, q.y, q.z], uzunluk: 0 }} alt={0.1} h={h - 0.04} malzeme={telMalzeme} hucre={[0.05, 0.2]} />
            </group>
          );
        });
      })}
    </>
  );
}

// ---------- kenar etiketi ----------



/** 3D'deki kenar ölçüsü; tıklayınca yeni ölçü yazılır (Enter kaydeder, Esc vazgeçer). */
function KenarEtiketi({ no, uzunluk, aktif, onOlcu }: { no: number; uzunluk: number; aktif: boolean; onOlcu?: (kenar: number, L: number) => void }) {
  const [yaziyor, setYaziyor] = useState(false);
  const [deger, setDeger] = useState("");
  const iptal = useRef(false); // Esc sonrası blur kaydetmesin
  const metin = uzunluk.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  // Kutuya binlik ayraçsız yazılır ("1500,5"); "1.500" 1,5 diye okunmasın
  const yazilacak = uzunluk.toLocaleString("tr-TR", { maximumFractionDigits: 2, useGrouping: false });
  const kaydet = () => {
    if (iptal.current) return;
    const L = sayiOku(deger);
    if (L > 0 && Math.abs(L - uzunluk) > 0.001) onOlcu?.(no, L);
    setYaziyor(false);
  };
  const kutu = `flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold shadow-lg ${
    aktif ? "bg-ac-gece/85 text-white ring-1 ring-ac-mavi" : "bg-black/50 text-white/50"
  }`;
  const rozet = <span className="grid h-4 w-4 place-items-center rounded-full bg-ac-kirmizi text-[10px] text-white">{kenarHarfi(no)}</span>;

  if (yaziyor)
    return (
      <form
        className={`${kutu} ring-2 ring-ac-kirmizi`}
        onSubmit={(e) => {
          e.preventDefault();
          kaydet();
        }}
      >
        {rozet}
        <input
          autoFocus
          inputMode="decimal"
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={kaydet}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            iptal.current = true;
            setYaziyor(false);
          }}
          className="w-16 bg-transparent text-right text-base outline-none sm:text-xs"
          aria-label={`${kenarHarfi(no)}. kenar uzunluğu`}
        />
        m
      </form>
    );
  return (
    <button
      type="button"
      title="Ölçüyü değiştirmek için tıklayın"
      onClick={() => {
        if (!onOlcu) return;
        setDeger(yazilacak);
        iptal.current = false;
        setYaziyor(true);
      }}
      className={`${kutu} ${onOlcu ? "cursor-pointer transition hover:bg-ac-kirmizi/80" : "pointer-events-none"} ${aktif ? "" : "line-through"}`}
    >
      {rozet}
      {metin} m{onOlcu && <span className="text-[10px] opacity-60">✎</span>}
    </button>
  );
}

// ---------- kamera ----------

/** Hazır kamera görünümleri: köşe (varsayılan, ekrandaki çite yakın bakış) ve tüm arazi. */
export type GorunumTuru = "kose" | "genel" | "yon";
/** Görünüm isteği: tür, küpten gelen bakış yönü (yon) ve her istekte artan sayaç */
type GorunumIstegi = { tur: GorunumTuru; n: number; yon?: Nokta3 };
type Nokta3 = [number, number, number];

function KameraRig({
  boyut,
  anahtar,
  gorunum,
  kose,
}: {
  boyut: number;
  anahtar: string;
  gorunum: GorunumIstegi;
  kose: { pos: Nokta3; bak: Nokta3 } | null;
}) {
  const { camera, controls, size } = useThree() as unknown as {
    size: { width: number; height: number };
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null;
  };
  const hedef = useRef<{ pos: THREE.Vector3; bak: THREE.Vector3 } | null>(null);
  const ilk = useRef(true);

  useEffect(() => {
    // Dar (telefon) ekranda araziyi sığdırmak için geri çekil
    const S = Math.max(boyut, 6) * Math.max(1, 1.15 / (size.width / size.height));
    if (gorunum.tur === "yon" && gorunum.yon) {
      // Küp: alanın merkezine bak, tüm alan ekrana sığacak uzaklıktan o yönden
      const yon = new THREE.Vector3(...gorunum.yon).normalize();
      yon.y = Math.max(yon.y, 0.02); // zeminin altına inme
      if (Math.abs(yon.y) > 0.999) yon.z += 0.001; // tam tepeden bakışta yön belirsiz olmasın
      const uzaklik = (S * 0.62) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + 3;
      hedef.current = { pos: yon.normalize().multiplyScalar(uzaklik), bak: new THREE.Vector3(0, 0, 0) };
    } else
      hedef.current =
        gorunum.tur === "kose" && kose
          ? { pos: new THREE.Vector3(...kose.pos), bak: new THREE.Vector3(...kose.bak) }
          : { pos: new THREE.Vector3(S * 0.45, S * 0.3 + 2.5, S * 0.7 + 3), bak: new THREE.Vector3(0, 0, 0) };
    if (ilk.current) {
      camera.position.set(S * 1.6, S * 1.8 + 30, S * 2.4);
      ilk.current = false;
    }
  }, [anahtar, boyut, camera, size.width, size.height, gorunum.tur, gorunum.n]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!controls) return;
    const dur = () => (hedef.current = null); // kullanıcı tutunca animasyon bırakır
    controls.addEventListener("start", dur);
    return () => controls.removeEventListener("start", dur);
  }, [controls]);

  useFrame((_, dt) => {
    const h = hedef.current;
    if (!h) return;
    camera.position.lerp(h.pos, 1 - Math.exp(-dt * 2.4));
    if (controls) {
      controls.target.lerp(h.bak, 1 - Math.exp(-dt * 3));
      controls.update();
    } else camera.lookAt(h.bak);
    if (camera.position.distanceTo(h.pos) < 0.03 && (!controls || controls.target.distanceTo(h.bak) < 0.03)) hedef.current = null;
  });
  return null;
}

/** Köşe direğine dışarıdan, göz hizasının biraz üstünden yakın çekim; birkaç kare sonra PNG verir. */
function DetayKamera({
  noktalar,
  merkez,
  h,
  aralik,
  onHazir,
}: {
  noktalar: [number, number][];
  merkez: readonly [number, number];
  h: number;
  aralik: number;
  onHazir?: (png: string) => void;
}) {
  const { camera, gl, controls, advance } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    gl: THREE.WebGLRenderer;
    controls: { target: THREE.Vector3; update: () => void } | null;
    advance: (zaman: number) => void;
  };
  const verildi = useRef(false);
  // Üst bileşen her çizimde yeni bir onHazir verebilir; döngü yeniden başlamasın
  const hazirRef = useRef(onHazir);
  hazirRef.current = onHazir;

  useEffect(() => {
    if (noktalar.length < 3) return;
    const [p0, k, p2] = noktalar;
    const kose = new THREE.Vector2(k[0] - merkez[0], k[1] - merkez[1]);
    const u1 = new THREE.Vector2(p0[0] - k[0], p0[1] - k[1]).normalize();
    const u2 = new THREE.Vector2(p2[0] - k[0], p2[1] - k[1]).normalize();
    const ic = u1.clone().add(u2).normalize();
    // Yakın çekim: köşe direği, payandalar ve tel gözleri seçilebilsin
    const D = h * 0.75 + 0.9;
    const hedef = new THREE.Vector3(kose.x + ic.x * aralik * 0.3, h * 0.52, kose.y + ic.y * aralik * 0.3);
    camera.position.set(kose.x - ic.x * D, h * 0.8 + 0.3, kose.y - ic.y * D);
    camera.fov = 50;
    camera.updateProjectionMatrix();
    camera.lookAt(hedef);
    if (controls) {
      controls.target.copy(hedef);
      controls.update();
    }
  }, [noktalar, merkez, h, aralik, camera, controls]);

  // Kareleri kendimiz çizeriz (frameloop="never"): tarayıcı ekran döngüsünü yavaşlatsa da
  // (arka plan sekmesi, düşük güç) görüntü birkaç yüz milisaniyede hazır olur
  useEffect(() => {
    if (!hazirRef.current || noktalar.length < 3) return;
    let iptal = false;
    (async () => {
      for (let i = 0; i < 6 && !iptal; i++) {
        advance(performance.now());
        await new Promise((r) => setTimeout(r, 40));
      }
      if (iptal || verildi.current) return;
      verildi.current = true;
      hazirRef.current?.(gl.domElement.toDataURL("image/png"));
    })();
    return () => void (iptal = true);
  }, [noktalar, advance, gl]);
  return null;
}

// ---------- arsa ----------

function Arsa({ poli, yukseklik, beton }: { poli: [number, number][]; yukseklik: (x: number, z: number) => number; beton: boolean }) {
  const geo = useMemo(() => {
    const sekil = new THREE.Shape(poli.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ShapeGeometry(sekil);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      pos.setXYZ(i, x, yukseklik(x, z) + 0.005, z);
    }
    g.computeVertexNormals();
    return g;
  }, [poli, yukseklik]);
  useAt(geo);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial color={beton ? "#3f454d" : "#1c4a35"} roughness={beton ? 0.95 : 1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------- ana sahne ----------

export interface SahneProps {
  /** genel: tüm arazi, etiketli, döndürülebilir · detay: köşeye yakın çekim, PDF için tek kare */
  mod?: "genel" | "detay";
  /** detay modunda görüntü hazır olunca PNG (data URL) ile çağrılır */
  onHazir?: (png: string) => void;
  /** Kenar etiketine yazılan yeni ölçü (m) */
  onKenarOlcu?: (kenar: number, uzunluk: number) => void;
  /** Beton zeminde dübel adetleri (Ayarlar); yakın çekimde başları çizilir */
  dubel?: { direk: number; payanda: number };
  tasarim: Tasarim;
  sonuc: Sonuc;
}

/** Kenar etiketi: dünya konumu (sahne merkezine göre) ve gösterilecek değerler. */
interface EtiketVeri {
  no: number;
  konum: [number, number, number];
  uzunluk: number;
  aktif: boolean;
}

/**
 * Her karede etiketlerin ekran konumunu hesaplayıp DOM öğelerini kaydırır.
 * (drei Html yerine: React 19 ile etiketler kalkarken hata veriyordu.)
 */
function EtiketYansit({ etiketler, domlar }: { etiketler: EtiketVeri[]; domlar: React.RefObject<Map<number, HTMLElement>> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const e of etiketler) {
      const el = domlar.current.get(e.no);
      if (!el) continue;
      v.set(...e.konum).project(camera);
      const gorunur = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
      el.style.visibility = gorunur ? "visible" : "hidden";
      el.style.transform = `translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px) translate(-50%, -50%)`;
    }
  });
  return null;
}

function Icerik({
  tasarim: t,
  sonuc,
  mod = "genel",
  onHazir,
  dubel = { direk: 4, payanda: 2 },
  etiketBildir,
  etiketDom,
  gorunum = { tur: "kose", n: 0 },
}: SahneProps & {
  etiketBildir?: (e: EtiketVeri[]) => void;
  etiketDom?: React.RefObject<Map<number, HTMLElement>>;
  gorunum?: GorunumIstegi;
}) {
  const detay = mod === "detay";
  const baslangic = useRef(performance.now());
  const { noktalar, kapali } = useMemo(() => sekilNoktalari(t), [t]);
  const poli = kapali ? noktalar : detay && noktalar.length >= 3 ? noktalar : null;

  // Sahneyi merkeze al
  const { merkez, boyut } = useMemo(() => {
    if (!noktalar.length) return { merkez: [0, 0] as const, boyut: 20 };
    const xs = noktalar.map((p) => p[0]);
    const zs = noktalar.map((p) => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    return { merkez: [(x0 + x1) / 2, (z0 + z1) / 2] as const, boyut: Math.max(x1 - x0, z1 - z0) };
  }, [noktalar]);

  const yukseklik = useMemo(() => {
    const ys = new Map(sonuc.kenarlar.map((k) => [`${k.bas[0].toFixed(3)},${k.bas[2].toFixed(3)}`, k.bas[1]]));
    return (x: number, z: number) => ys.get(`${x.toFixed(3)},${z.toFixed(3)}`) ?? 0;
  }, [sonuc.kenarlar]);
  const minY = Math.min(0, ...sonuc.kenarlar.map((k) => Math.min(k.bas[1], k.son[1])));

  const tip = t.tel.tip;
  const h = t.tel.yukseklik;
  const pvc = t.tel.kaplama === "pvc";
  const hucre = useMemo(() => hucreBoyu(tip, t.tel.goz), [tip, t.tel.goz]);
  const telMalzeme = useMemo(() => {
    if (tip === "dikenli") return null;
    return new THREE.MeshStandardMaterial({
      map: telDokusu(tip, t.tel.goz, t.tel.kalinlik),
      color: pvc ? "#2f9a58" : "#e8eef5",
      emissive: pvc ? "#0d3a1f" : "#3a4656",
      transparent: true,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
      metalness: pvc ? 0.1 : 0.45,
      roughness: 0.3,
    });
  }, [tip, t.tel.goz, t.tel.kalinlik, pvc]);
  useAt(telMalzeme); // doku önbellekte kalır, yalnız malzeme atılır
  const kapiMalzeme = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: telDokusu("panel", 50, 5),
        color: "#3a404a",
        transparent: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        metalness: 0.6,
        roughness: 0.4,
      }),
    []
  );

  // Üst tel hatları kaş kolu boyunca dizilir: eğik kaşta dışa doğru, düz kaşta dik
  const kvU = kasVektoru(t);
  const kas = t.direk.kasli ? KAS_UZUNLUK * kvU.dy : 0; // dikey yükselme
  const kasYatay = t.direk.kasli ? KAS_UZUNLUK * kvU.dx : 0;
  const ustHatlar = useMemo(() => {
    if (t.ekstra.ustTel !== "dikenli") return [];
    const out: [THREE.Vector3, THREE.Vector3][] = [];
    for (const k of sonuc.kosular) {
      const L = Math.hypot(k.b[0] - k.a[0], k.b[2] - k.a[2]) || 1;
      const yon: [number, number] = [(k.b[0] - k.a[0]) / L, (k.b[2] - k.a[2]) / L];
      const orta: Nokta = [(k.a[0] + k.b[0]) / 2, 0, (k.a[2] + k.b[2]) / 2];
      const n = disNormal(orta, yon, poli);
      for (let r = 0; r < t.ekstra.ustSira; r++) {
        const f = t.ekstra.ustSira === 1 ? 1 : (r + 1) / t.ekstra.ustSira;
        const d = kasYatay * f;
        const y = h + 0.08 + (kas ? kas * f : 0.12 * (r + 1));
        // V kaşta aynı sıra iki kola da çekilir (yön: dış ve iç)
        for (const yan of t.direk.kasli && t.direk.kasTipi === "v" ? [1, -1] : [1])
          out.push([
            new THREE.Vector3(k.a[0] + n[0] * d * yan, k.a[1] + y, k.a[2] + n[1] * d * yan),
            new THREE.Vector3(k.b[0] + n[0] * d * yan, k.b[1] + y, k.b[2] + n[1] * d * yan),
          ]);
      }
    }
    return out;
  }, [sonuc.kosular, t.ekstra.ustTel, t.ekstra.ustSira, t.direk.kasli, t.direk.kasTipi, kas, kasYatay, h, poli]);

  const anaDikenli = useMemo(() => {
    if (tip !== "dikenli") return [];
    const out: [THREE.Vector3, THREE.Vector3][] = [];
    for (const k of sonuc.kosular)
      for (let r = 0; r < t.tel.sira; r++) {
        const y = 0.2 + ((h - 0.2) * r) / Math.max(1, t.tel.sira - 1);
        out.push([new THREE.Vector3(k.a[0], k.a[1] + y, k.a[2]), new THREE.Vector3(k.b[0], k.b[1] + y, k.b[2])]);
      }
    return out;
  }, [tip, sonuc.kosular, t.tel.sira, h]);

  const gergiSira = tip === "kafes" || tip === "tavuk" ? (h >= 1.5 ? [0.06, h / 2 + 0.05, h + 0.04] : [0.06, h + 0.04]) : [];
  const S = Math.max(boyut, 6);

  // Köşe görünümü: ön-sağdaki köşe direğinin dışından, göz hizasının biraz üstünden içeri bakış
  const koseGorunum = useMemo(() => {
    if (!kapali || noktalar.length < 3) return null;
    const n = noktalar.length;
    let en = 0;
    noktalar.forEach((p, i) => p[0] + p[1] > noktalar[en][0] + noktalar[en][1] && (en = i));
    const k = noktalar[en];
    const u1 = new THREE.Vector2(noktalar[(en - 1 + n) % n][0] - k[0], noktalar[(en - 1 + n) % n][1] - k[1]).normalize();
    const u2 = new THREE.Vector2(noktalar[(en + 1) % n][0] - k[0], noktalar[(en + 1) % n][1] - k[1]).normalize();
    const ic = u1.add(u2).normalize();
    if (!icinde(k[0] + ic.x * 0.5, k[1] + ic.y * 0.5, noktalar)) ic.negate();
    const D = h * 1.4 + 2.2;
    const a = t.direk.aralik;
    return {
      pos: [k[0] - ic.x * D - merkez[0], h * 1.25 + 0.8, k[1] - ic.y * D - merkez[1]] as Nokta3,
      bak: [k[0] + ic.x * a * 2.5 - merkez[0], h * 0.55, k[1] + ic.y * a * 2.5 - merkez[1]] as Nokta3,
    };
  }, [kapali, noktalar, merkez, h, t.direk.aralik]);

  // Kenar etiketleri: kenar ortasının biraz dışında; sahne merkezine göre kaydırılmış
  const etiketler = useMemo<EtiketVeri[]>(() => {
    if (detay) return [];
    const d = Math.max(1.2, S * 0.05);
    return sonuc.kenarlar.map((k) => {
      const orta: Nokta = [(k.bas[0] + k.son[0]) / 2, (k.bas[1] + k.son[1]) / 2, (k.bas[2] + k.son[2]) / 2];
      const yon: [number, number] = [(k.son[0] - k.bas[0]) / (k.yatay || 1), (k.son[2] - k.bas[2]) / (k.yatay || 1)];
      const n = disNormal(orta, yon, poli);
      return {
        no: k.i,
        konum: [orta[0] + n[0] * d - merkez[0], orta[1] + 0.2, orta[2] + n[1] * d - merkez[1]],
        uzunluk: k.gercek,
        aktif: k.aktif,
      };
    });
  }, [detay, sonuc.kenarlar, poli, S, merkez]);
  useEffect(() => etiketBildir?.(etiketler), [etiketler, etiketBildir]);
  const acik = useTema((x) => x.tema === "acik");
  const renk = acik
    ? { gok: "#dbe5f1", zemin: "#9fadbf", hucre: "#7f8fa6" }
    : { gok: "#071733", zemin: "#0c1d38", hucre: "#16325f" };

  return (
    <>
      <color attach="background" args={[detay ? "#e9eef5" : renk.gok]} />
      {!detay && <fog attach="fog" args={[renk.gok, S * 2.2, S * 6]} />}
      <hemisphereLight args={["#bcd4ff", "#0b1a2e", 0.9]} />
      {/* Dosya indirmeden yerel stüdyo ışığı: metaller parlasın */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#7fb6ff" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ff8a8a" position={[8, 2, -4]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <directionalLight
        position={[S * 0.6, S * 1.2, S * 0.4]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-S}
        shadow-camera-right={S}
        shadow-camera-top={S}
        shadow-camera-bottom={-S}
        shadow-camera-far={S * 4}
      />
      <directionalLight position={[-S, S * 0.5, -S]} intensity={0.6} color="#ff6b6b" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, minY - 0.03, 0]} receiveShadow>
        <planeGeometry args={[S * 12, S * 12]} />
        <meshStandardMaterial color={detay ? (t.zemin === "beton" ? "#b4bac2" : "#a9b59c") : renk.zemin} roughness={1} />
      </mesh>
      {/* Izgara derinlik yazmasın, yoksa şeffaf tel yüzeyini örter */}
      {!detay && <Grid
        renderOrder={-1}
        onUpdate={(m: THREE.Mesh) => void ((m.material as THREE.Material).depthWrite = false)}
        position={[0, minY - 0.02, 0]}
        args={[S * 12, S * 12]}
        cellSize={1}
        sectionSize={5}
        cellColor={renk.hucre}
        sectionColor="#0a84c6"
        sectionThickness={1}
        fadeDistance={S * 3.5}
        fadeStrength={1.5}
        infiniteGrid
      />}

      <group position={[-merkez[0], 0, -merkez[1]]}>
        {kapali && poli && <Arsa poli={poli} yukseklik={yukseklik} beton={t.zemin === "beton"} />}

        {tip === "panel" ? (
          <PanelCit
            kosular={sonuc.kosular}
            aralik={t.direk.aralik}
            h={h}
            gozMm={t.tel.goz}
            kalinlikMm={t.tel.kalinlik}
            renk={pvc ? "#1d6b45" : "#c9d1db"}
            poli={poli}
          />
        ) : (
          telMalzeme &&
          sonuc.kosular.map((k, i) => <TelYuzeyi key={i} kosu={k} alt={0.06} h={h - 0.02} malzeme={telMalzeme} hucre={hucre} />)
        )}
        {gergiSira.length > 0 && <YatayTeller kosular={sonuc.kosular} yukseklikler={gergiSira} renk={pvc ? "#2f9a58" : "#aeb8c4"} />}
        {anaDikenli.length > 0 && <DikenliTeller hatlar={anaDikenli} />}
        {ustHatlar.length > 0 && <DikenliTeller hatlar={ustHatlar} />}
        {t.ekstra.ustTel === "jiletli" && tip !== "dikenli" && <Jiletli kosular={sonuc.kosular} y={h + 0.08 + kas * 0.5} />}
        {t.ekstra.ustTel === "duzlemsel" && tip !== "dikenli" && <Duzlemsel kosular={sonuc.kosular} y={h + 0.08} />}

        <Direkler direkler={sonuc.direkler} t={t} poli={poli} baslangic={baslangic} animasyon={!detay} dubel={dubel} />
        <Kapilar kapilar={sonuc.kapilar} h={Math.max(1, h)} telMalzeme={kapiMalzeme} />

      </group>

      {!detay && etiketDom && <EtiketYansit etiketler={etiketler} domlar={etiketDom} />}
      {detay ? (
        <DetayKamera noktalar={noktalar} merkez={merkez} h={h} aralik={t.direk.aralik} onHazir={onHazir} />
      ) : (
        <KameraRig boyut={boyut} anahtar={`${t.sekil}-${Math.round(boyut / 5)}`} gorunum={gorunum} kose={koseGorunum} />
      )}
    </>
  );
}

export default function Sahne(props: SahneProps) {
  const detay = props.mod === "detay";
  const [etiketler, setEtiketler] = useState<EtiketVeri[]>([]);
  const [gorunum, setGorunum] = useState<GorunumIstegi>({ tur: "kose", n: 0 });
  const gorunumSec = (tur: GorunumTuru, yon?: Nokta3) => setGorunum((g) => ({ tur, yon, n: g.n + 1 }));
  const domlar = useRef(new Map<number, HTMLElement>());
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={detay ? "never" : "always"}
        camera={{ fov: 42, near: 0.1, far: 5000, position: [40, 40, 60] }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <Icerik {...props} etiketBildir={detay ? undefined : setEtiketler} etiketDom={domlar} gorunum={gorunum} />
        <OrbitControls makeDefault enableDamping enabled={!detay} maxPolarAngle={Math.PI / 2.05} minDistance={1} maxDistance={3000} />
        {/* Görünüm küpü: yüzüne tıklayınca kamera o yöne döner */}
        {!detay && (
          <GizmoHelper alignment="bottom-left" margin={[62, 62]}>
            <GizmoViewcube
              faces={["Sağ", "Sol", "Üst", "Alt", "Ön", "Arka"]}
              color="#0b2350"
              textColor="#ffffff"
              hoverColor="#d82628"
              strokeColor="#0a84c6"
              opacity={0.95}
              // Yüz, kenar ya da köşe parçası: o yönden, alanın merkezine hizalı bakış
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                const p = e.object.position;
                const yon = p.lengthSq() > 1e-6 ? p : e.face?.normal;
                if (yon) gorunumSec("yon", [yon.x, yon.y, yon.z]);
                return null;
              }}
            />
          </GizmoHelper>
        )}
      </Canvas>
      {!detay && (
        <div className="absolute bottom-3 left-[124px] z-20 flex flex-col gap-1.5">
          {(
            [
              ["kose", "Köşe", "Köşe direğinden yakın görünüm"],
              ["genel", "Tümü", "Tüm araziyi göster"],
            ] as const
          ).map(([tur, ad, ipucu]) => (
            <button
              key={tur}
              type="button"
              title={ipucu}
              aria-label={ipucu}
              onClick={() => gorunumSec(tur)}
              className={`cam rounded-lg px-2.5 py-1.5 text-xs font-bold transition hover:bg-[var(--yuzey-2)] ${gorunum.tur === tur ? "ring-1 ring-ac-kirmizi" : ""}`}
            >
              {ad}
            </button>
          ))}
        </div>
      )}
      {!detay && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {etiketler.map((e) => (
            <div
              key={e.no}
              ref={(el) => {
                if (el) domlar.current.set(e.no, el);
                else domlar.current.delete(e.no);
              }}
              className="pointer-events-auto absolute left-0 top-0"
              style={{ visibility: "hidden" }}
            >
              <KenarEtiketi no={e.no} uzunluk={e.uzunluk} aktif={e.aktif} onOlcu={props.onKenarOlcu} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
