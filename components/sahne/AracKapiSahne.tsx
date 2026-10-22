"use client";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, GizmoHelper, GizmoViewcube, Lightformer, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type AracKapi, kanatBoyu, surgulu } from "@/lib/aracKapi";
import { DOLGU_CUBUK, MIZRAK_BOY, PORTAL_PROFIL, kanatYapisi } from "@/lib/kapiYapi";
import { direkRengi } from "@/lib/katalog";
import { useTema } from "@/lib/tema";
import { betonDokusu, hucreBoyu, telDokusu } from "./dokular";

const CERCEVE = 0.06; // kanat çerçeve profili, m

/** Elektrostatik toz boya (yarı mat) ya da sıcak daldırma galvaniz (parlak, gri) yüzey. */
function boyaMalzemesi(renk: string, boyali: boolean) {
  return new THREE.MeshPhysicalMaterial({
    color: renk,
    metalness: boyali ? 0.15 : 0.8,
    roughness: boyali ? 0.42 : 0.32,
    clearcoat: boyali ? 0.35 : 0,
    clearcoatRoughness: 0.5,
  });
}
const KOYU_METAL = new THREE.MeshStandardMaterial({ color: "#2b3038", metalness: 0.75, roughness: 0.35 });
const PASLANMAZ = new THREE.MeshStandardMaterial({ color: "#d9dee4", metalness: 1, roughness: 0.18 });
const PLASTIK = new THREE.MeshStandardMaterial({ color: "#1d2229", metalness: 0, roughness: 0.55 });
const PIRINC = new THREE.MeshStandardMaterial({ color: "#c9a14a", metalness: 1, roughness: 0.3 });
const DIREK = 0.16; // kapı kolonu, m

/** İki nokta arasında kare kesitli ince çubuk geometrisi (birleştirmek için). */
function cubuk(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const L = a.distanceTo(b);
  const g = new THREE.BoxGeometry(t, t, L);
  const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  return g.applyMatrix4(m);
}

/**
 * Bombeli (3D kıvrımlı) panel tel: 50 mm aralıklı dikey teller, bombe yerlerinde dışa V kıvrım;
 * 200 mm aralıklı yatay teller. Hepsi tek geometride.
 */
function bombeliPanel(w: number, h: number) {
  const parca: THREE.BufferGeometry[] = [];
  const bombeSay = h < 1.6 ? 2 : 3;
  const bombeler = Array.from({ length: bombeSay }, (_, i) => (h * (i + 1)) / (bombeSay + 1));
  const B = 0.035; // bombe derinliği
  const z = (y: number) => {
    for (const b of bombeler) if (Math.abs(y - b) < 0.05) return B * (1 - Math.abs(y - b) / 0.05);
    return 0;
  };
  const ys = [0, ...bombeler.flatMap((b) => [b - 0.05, b, b + 0.05]), h].sort((a, c) => a - c);
  for (let x = 0.025; x < w; x += 0.05)
    for (let i = 0; i < ys.length - 1; i++)
      parca.push(cubuk(new THREE.Vector3(x, ys[i], z(ys[i])), new THREE.Vector3(x, ys[i + 1], z(ys[i + 1])), 0.0045));
  for (let y = 0.1; y < h; y += 0.2) parca.push(cubuk(new THREE.Vector3(0, y, z(y) - 0.004), new THREE.Vector3(w, y, z(y) - 0.004), 0.0045));
  for (const b of bombeler) parca.push(cubuk(new THREE.Vector3(0, b, B - 0.004), new THREE.Vector3(w, b, B - 0.004), 0.0045));
  const g = mergeGeometries(parca);
  parca.forEach((x) => x.dispose());
  return g;
}

/**
 * Düz çift telli panel (2D, bombesiz): 50 mm aralıklı dikey teller, 200 mm'de bir dikey
 * tellerin iki yanında birer yatay tel (Setka tipi yaya kapısı ve yan çit dolgusu).
 */
function ciftTelPanel(w: number, h: number) {
  const parca: THREE.BufferGeometry[] = [];
  for (let x = 0.025; x < w; x += 0.05) parca.push(cubuk(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, h, 0), 0.005));
  for (let y = 0.05; y < h; y += 0.2)
    for (const z of [-0.0065, 0.0065]) parca.push(cubuk(new THREE.Vector3(0, y, z), new THREE.Vector3(w, y, z), 0.007));
  const g = mergeGeometries(parca);
  parca.forEach((x) => x.dispose());
  return g;
}

/**
 * Kanat: sol alt köşesi orijinde, +x yönünde w genişliğinde. Kalın çerçeve, ~2,5 m'de bir ara
 * dikme, sürgülüde kalın alt kiriş, seçilen dolgu ve isteğe bağlı mızrak uçlar.
 */
function Kanat({ w, h, k, altKiris = false, duzPanel = false, C = CERCEVE }: { w: number; h: number; k: AracKapi; altKiris?: boolean; duzPanel?: boolean; C?: number }) {
  const renk = direkRengi(k.renk).renk;
  const boyali = k.renk !== "galvaniz";
  const metal = useMemo(
    () => boyaMalzemesi(renk, boyali),
    [renk, boyali],
  );
  const telMat = useMemo(() => new THREE.MeshStandardMaterial({ color: renk, metalness: boyali ? 0.25 : 0.7, roughness: 0.45 }), [renk, boyali]);
  // Ölçüler üretim planı ve teknik resimle ortak hesaptan (lib/kapiYapi)
  const yapi = kanatYapisi(w, h, k.dolgu, altKiris, C);
  const { bolum, bw, alt, ic } = yapi;

  const panel = useMemo(() => (k.dolgu === "panel" ? (duzPanel ? ciftTelPanel(bw - C, ic) : bombeliPanel(bw - C, ic)) : null), [k.dolgu, bw, ic, C, duzPanel]);
  const tel = useMemo(() => {
    if (k.dolgu !== "kafes") return null;
    const doku = telDokusu("kafes", 50, 3).clone();
    const [hw, hh] = hucreBoyu("kafes", 50);
    doku.repeat.set((bw - C) / hw, ic / hh);
    doku.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: doku, color: renk, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 });
  }, [k.dolgu, bw, ic, renk, C]);
  const cubuklar = useMemo(
    () => Array.from({ length: yapi.dolguAdet }, (_, i) => C / 2 + (i + 0.5) * yapi.dolguAralik),
    [yapi.dolguAdet, yapi.dolguAralik, C],
  );
  const mizraklar = useMemo(() => {
    if (!k.mizrak) return [];
    const adet = Math.max(2, Math.round(w / 0.2));
    return Array.from({ length: adet }, (_, i) => ((i + 0.5) * w) / adet);
  }, [k.mizrak, w]);

  return (
    <group>
      {/* çerçeve: kenarları hafif yuvarlatılmış kutu profiller (üst, alt kiriş, dikmeler) */}
      <RoundedBox args={[w, C, C]} radius={0.006} smoothness={2} material={metal} position={[w / 2, h - C / 2, 0]} castShadow receiveShadow />
      <RoundedBox args={[w, alt, C * (altKiris ? 1.4 : 1)]} radius={0.006} smoothness={2} material={metal} position={[w / 2, alt / 2, 0]} castShadow receiveShadow />
      {/* orta kuşak: dikmeler arasında, kanat yüksekliğinin ortasında */}
      {yapi.ortaKusak &&
        Array.from({ length: bolum }, (_, b) => (
          <mesh key={`ok${b}`} material={metal} position={[(yapi.dikmeX[b] + yapi.dikmeX[b + 1]) / 2, yapi.araKusakY, 0]} castShadow>
            <boxGeometry args={[yapi.dikmeX[b + 1] - yapi.dikmeX[b] - C, C * 0.7, C * 0.7]} />
          </mesh>
        ))}
      {yapi.dikmeX.map((x, i) => (
        <RoundedBox
          key={i}
          args={[C, h, C]}
          radius={0.006}
          smoothness={2}
          material={metal}
          position={[x, h / 2, 0]}
          castShadow
          receiveShadow
        />
      ))}
      {/* bölüm dolguları */}
      {Array.from({ length: bolum }, (_, b) => {
        const x0 = b * bw + C / 2;
        return (
          <group key={b} position={[x0, alt, 0]}>
            {panel && <mesh geometry={panel} material={telMat} castShadow />}
            {tel && (
              <mesh material={tel} position={[(bw - C) / 2, ic / 2, 0]}>
                <planeGeometry args={[bw - C, ic]} />
              </mesh>
            )}
            {k.dolgu === "sac" && (
              <mesh material={metal} position={[(bw - C) / 2, ic / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[bw - C, ic, 0.012]} />
              </mesh>
            )}
            {cubuklar.map((x) => (
              <mesh key={x} material={metal} position={[x, ic / 2, 0]} castShadow>
                <boxGeometry args={[DOLGU_CUBUK, ic, DOLGU_CUBUK]} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* mızrak uçlar */}
      {mizraklar.map((x) => (
        <group key={x} position={[x, h, 0]}>
          <mesh material={metal} position={[0, 0.1, 0]}>
            <boxGeometry args={[0.014, 0.2, 0.014]} />
          </mesh>
          <mesh material={metal} position={[0, 0.24, 0]}>
            <coneGeometry args={[0.025, 0.09, 4]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Kare kapı kolonu: üstte kapak, altta cıvatalı ayak plakası (flanş) ya da beton dökümü.
 */
function Kolon({ x, z = 0, h, k = DIREK, mat, gomulu = false, kapak = true }: { x: number; z?: number; h: number; k?: number; mat: THREE.Material; gomulu?: boolean; kapak?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[k, h, k]} radius={0.008} smoothness={2} material={mat} position={[0, h / 2, 0]} castShadow receiveShadow />
      {/* üst kapak (üstten kuşakla birleşen babada yok) */}
      {kapak && (
        <mesh material={PLASTIK} position={[0, h + 0.012, 0]} castShadow>
          <boxGeometry args={[k + 0.012, 0.024, k + 0.012]} />
        </mesh>
      )}
      {/* ayak plakası ve 4 cıvata (zemine gömülü kolonda yok) */}
      {!gomulu && (
      <>
      <mesh material={mat} position={[0, 0.008, 0]} receiveShadow castShadow>
        <boxGeometry args={[k * 2, 0.016, k * 2]} />
      </mesh>
      {[-1, 1].flatMap((a) => [-1, 1].map((b) => [a, b] as const)).map(([a, b]) => (
        <mesh key={`${a}${b}`} material={KOYU_METAL} position={[a * k * 0.75, 0.024, b * k * 0.75]}>
          <cylinderGeometry args={[0.011, 0.011, 0.018, 6]} />
        </mesh>
      ))}
      </>
      )}
    </group>
  );
}

/**
 * Bayraklı (kaynaklı) menteşe: kolona kaynaklı alt yarım, kanada kaynaklı üst yarım;
 * aralarında pim. Kanat dönerken üst yarım kanatla birlikte döner.
 */
const MENTESE_Z = 0.05; // menteşe ekseni kapının ön yüzünde

function Mentese({ y }: { y: number; kolonYuz?: number }) {
  return (
    <group position={[0, y, MENTESE_Z]}>
      {/* kolon tarafı: kolon yüzüne kaynaklı bayrak + alt topuz */}
      <mesh material={KOYU_METAL} position={[-0.045, -0.035, -0.02]}>
        <boxGeometry args={[0.07, 0.05, 0.012]} />
      </mesh>
      <mesh material={KOYU_METAL} position={[0, -0.035, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.075, 20]} />
      </mesh>
      {/* pim başı */}
      <mesh material={PASLANMAZ} position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.016, 0.02, 0.014, 20]} />
      </mesh>
    </group>
  );
}
/**
 * Ayarlı (cıvatalı) menteşe, Setka tipi: kolonun içinden geçen dişli cıvata, iki yanda somun,
 * ucunda kanadın pimini taşıyan göz.
 */
function AyarliMentese({ y, kolon }: { y: number; kolon: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh material={PASLANMAZ} position={[-kolon / 2 + 0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.007, 0.007, kolon + 0.07, 10]} />
      </mesh>
      {[-kolon - 0.012, -0.012].map((x) => (
        <mesh key={x} material={PASLANMAZ} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.014, 0.014, 0.012, 6]} />
        </mesh>
      ))}
      <mesh material={PASLANMAZ} position={[0.012, 0, 0]}>
        <torusGeometry args={[0.012, 0.005, 8, 16]} />
      </mesh>
    </group>
  );
}
/** Ayarlı menteşenin kanat tarafı: kanat dikmesine kaynaklı dikey pim. */
function AyarliMenteseKanat({ y }: { y: number }) {
  return (
    <mesh material={KOYU_METAL} position={[0.012, y, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.09, 10]} />
    </mesh>
  );
}

/** Menteşenin kanatla dönen üst yarısı (kanat grubunun içinde, menteşe ekseninde). */
function MenteseKanat({ y }: { y: number }) {
  return (
    <group position={[0, y, MENTESE_Z]}>
      <mesh material={KOYU_METAL} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.075, 20]} />
      </mesh>
      {/* topuzlar arası pirinç pul */}
      <mesh material={PIRINC} position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, 0.006, 20]} />
      </mesh>
      {/* kanat dikmesine kaynaklı bayrak */}
      <mesh material={KOYU_METAL} position={[0.045, 0.035, -0.02]}>
        <boxGeometry args={[0.07, 0.05, 0.012]} />
      </mesh>
    </group>
  );
}

/**
 * Kilit kutusu (kanat dikmesine kaynaklı), iki yanda paslanmaz L kol, anahtar göbeği ve rozet.
 */
function KilitKutusu({ x, y }: { x: number; y: number }) {
  return (
    <group position={[x, y, 0]}>
      <RoundedBox args={[0.065, 0.22, 0.085]} radius={0.006} smoothness={2} material={KOYU_METAL} castShadow />
      {[1, -1].map((yan) => (
        <group key={yan} position={[0, 0.045, yan * 0.043]}>
          {/* rozet */}
          <mesh material={PASLANMAZ} position={[0, -0.02, yan * 0.003]}>
            <boxGeometry args={[0.03, 0.16, 0.004]} />
          </mesh>
          {/* kol: göbek + yatay tutamak */}
          <mesh material={PASLANMAZ} position={[0, 0, yan * 0.018]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.035, 12]} />
          </mesh>
          <mesh material={PASLANMAZ} position={[-0.055, 0, yan * 0.034]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.009, 0.1, 4, 10]} />
          </mesh>
          {/* silindir göbeği */}
          <mesh material={PASLANMAZ} position={[0, -0.075, yan * 0.006]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.008, 16]} />
          </mesh>
          <mesh material={KOYU_METAL} position={[0, -0.075, yan * 0.011]}>
            <boxGeometry args={[0.002, 0.012, 0.002]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Çift kanatta yere düşen sürgü: kanat dibinde dikey çubuk, tutamağı ve yerde yuva. */
function YerSurgusu({ x, aci }: { x: number; aci: number }) {
  return (
    <group>
      <group position={[0, 0, 0]} rotation={[0, aci, 0]}>
        <mesh material={PASLANMAZ} position={[x, 0.18, 0.04]}>
          <cylinderGeometry args={[0.008, 0.008, 0.34, 10]} />
        </mesh>
        <mesh material={PASLANMAZ} position={[x - 0.02, 0.24, 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.04, 8]} />
        </mesh>
        {[0.1, 0.3].map((y) => (
          <mesh key={y} material={KOYU_METAL} position={[x, y, 0.032]}>
            <boxGeometry args={[0.028, 0.02, 0.016]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Sürgülü kapının V kanallı tekerleği ve taşıyıcı kulakları. */
function Teker({ x }: { x: number }) {
  return (
    <group position={[x, 0.065, 0]}>
      <mesh material={KOYU_METAL} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.03, 24]} />
      </mesh>
      <mesh material={PASLANMAZ} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.07, 12]} />
      </mesh>
      {[-0.03, 0.03].map((zz) => (
        <mesh key={zz} material={KOYU_METAL} position={[0, 0.03, zz]}>
          <boxGeometry args={[0.1, 0.07, 0.008]} />
        </mesh>
      ))}
    </group>
  );
}

/** Kremayer dişli: sürgülü kanadın alt kirişinde, motor dişlisinin oturduğu dişli şerit. */
function Kremayer({ L }: { L: number }) {
  const geo = useMemo(() => {
    const parca: THREE.BufferGeometry[] = [new THREE.BoxGeometry(L, 0.02, 0.022).translate(L / 2, 0, 0)];
    for (let x = 0.01; x < L; x += 0.025) parca.push(new THREE.BoxGeometry(0.01, 0.012, 0.022).translate(x, 0.016, 0));
    const g = mergeGeometries(parca);
    parca.forEach((p) => p.dispose());
    return g;
  }, [L]);
  return <mesh geometry={geo} material={PLASTIK} />;
}

/** Kılavuz makara: portalda kanadın üst kirişini iki yandan tutan dikey makaralar. */
function KilavuzMakara({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      {[-0.05, 0.05].map((zz) => (
        <mesh key={zz} material={PLASTIK} position={[0, 0, zz]}>
          <cylinderGeometry args={[0.025, 0.025, 0.05, 16]} />
        </mesh>
      ))}
    </group>
  );
}

/** Kapı yanlarında bağlam için kısa panel çit (kolonlar + bombeli panel). */
function YanCit({ x0, x1, h, mat, duz = false }: { x0: number; x1: number; h: number; mat: THREE.Material; duz?: boolean }) {
  const L = Math.abs(x1 - x0);
  const geo = useMemo(() => (duz ? ciftTelPanel(L - 0.08, h) : bombeliPanel(L - 0.08, h)), [L, h, duz]);
  const sol = Math.min(x0, x1);
  return (
    <group>
      <mesh geometry={geo} material={mat} position={[sol + 0.04, 0.05, 0.035]} castShadow />
      {[sol, sol + L].map((x) => (
        <group key={x}>
          <RoundedBox args={[0.06, h + 0.12, 0.04]} radius={0.004} smoothness={2} material={mat} position={[x, (h + 0.12) / 2, 0]} castShadow />
          {[0.25, h * 0.5, h - 0.1].map((y) => (
            <mesh key={y} material={PLASTIK} position={[x, y, 0.03]}>
              <boxGeometry args={[0.025, 0.05, 0.02]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Kapi({ k, acik, yaya = false }: { k: AracKapi; acik: number; yaya?: boolean }) {
  const W = k.genislik;
  const H = k.yukseklik;
  const boyali = k.renk !== "galvaniz";
  const kolonMat = useMemo(() => boyaMalzemesi(direkRengi(k.renk).renk, boyali), [k.renk, boyali]);
  const rayMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e98a6", metalness: 0.85, roughness: 0.3 }), []);
  const betonMat = useMemo(() => {
    const d = betonDokusu().clone();
    d.repeat.set(2, 1);
    d.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: d, color: "#a4a9b0", roughness: 0.95 });
  }, []);
  const motorMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#3a4048", roughness: 0.4, clearcoat: 0.6 }), []);
  const sol = -W / 2;
  const kilitY = Math.min(1.05, H * 0.55); // kol yüksekliği
  const L = kanatBoyu(k);
  const z = 0.12; // sürgülü kanat çit hattının iç yanında kayar
  const kanatAci = acik * 1.45;
  // Yaya ve kanatlı kapılarda menteşe: altta, üstte; 1,6 m üstü kanatta ortada bir tane daha
  const menteseY = H > 1.6 ? [0.22, H / 2, H - 0.14] : [0.22, H - 0.14];
  const yan = Math.max(1.6, Math.min(3, W * 0.5)); // yan çit boyu
  // Yaya kapısı (Setka tipi): ince gömülü kolon, kanat yerden ~10 cm yukarıda, düz çift telli panel
  const KOL = yaya ? 0.07 : DIREK;
  const kanatY = yaya ? 0.1 : 0.06;
  const yayaMY = [0.18, H - 0.18];

  return (
    <group>
      {/* Beton zemin şeridi ve kapı önü */}
      <mesh material={betonMat} rotation={[-Math.PI / 2, 0, 0]} position={[surgulu(k) ? -W * 0.5 : 0, 0.002, 0.4]} receiveShadow>
        <planeGeometry args={[(surgulu(k) ? W * 2.2 : W + 1.4) + yan * 2, 3]} />
      </mesh>

      {/* Yan çitler: sağda kolondan sonra; solda kanatlıda kolondan, sürgülüde park yerinin ötesine */}
      <YanCit x0={W / 2 + KOL} x1={W / 2 + KOL + yan} h={yaya ? H + 0.1 : Math.min(H, 2)} mat={kolonMat} duz={yaya} />
      <YanCit x0={sol - KOL - (surgulu(k) ? L : 0)} x1={sol - KOL - (surgulu(k) ? L : 0) - yan} h={yaya ? H + 0.1 : Math.min(H, 2)} mat={kolonMat} duz={yaya} />
      {surgulu(k) && <YanCit x0={sol - DIREK} x1={sol - DIREK - L} h={Math.min(H, 2)} mat={kolonMat} />}

      {/* Kolonlar */}
      {surgulu(k) ? (
        <>
          {/* Motor tarafı: 4'lü kapı babası (kanadın iki yanında ikişer dikme), üstten
              kuşaklarla birleşik; karşı taraf: 2'li karşılama babası, üstten birleşik.
              Baba yüksekliği = kanat üstü (mızrak varsa mızrak ucu) + 5 cm boşluk + üst profil */}
          {(() => {
            const P = PORTAL_PROFIL;
            const kanatAlt = k.tip === "konsol" ? 0.32 : 0.12;
            const ustKenar = kanatAlt + H + (k.mizrak ? MIZRAK_BOY : 0);
            const babaH = ustKenar + 0.05 + P;
            const zAra = 0.07 + P / 2; // kanat ile dikme arası (z)
            const xler = [sol - P / 2, sol - P / 2 - 0.4];
            const zler = [z - zAra, z + zAra];
            return (
              <>
                {xler.flatMap((x) => zler.map((zz) => <Kolon key={`${x}${zz}`} x={x} z={zz} h={babaH - P} k={P} mat={kolonMat} kapak={false} />))}
                {/* üst birleşim: z yönünde (kanadın üstünden geçen) ve x yönünde kuşaklar */}
                {xler.map((x) => (
                  <RoundedBox key={`zk${x}`} args={[P, P, zAra * 2 + P]} radius={0.006} smoothness={2} material={kolonMat} position={[x, babaH - P / 2, z]} castShadow />
                ))}
                {zler.map((zz) => (
                  <RoundedBox key={`xk${zz}`} args={[0.4 + P, P, P]} radius={0.006} smoothness={2} material={kolonMat} position={[sol - P / 2 - 0.2, babaH - P / 2, zz]} castShadow />
                ))}
                <KilavuzMakara x={sol - P / 2} y={kanatAlt + H - 0.03} z={z} />
                {/* karşılama babası: 2 dikme + üst kuşak + kanat ucunu karşılayan arka levha */}
                {zler.map((zz) => (
                  <Kolon key={`k${zz}`} x={W / 2 + P / 2 + 0.02} z={zz} h={babaH - P} k={P} mat={kolonMat} />
                ))}
                <RoundedBox args={[P, P, zAra * 2 + P]} radius={0.006} smoothness={2} material={kolonMat} position={[W / 2 + P / 2 + 0.02, babaH - P / 2, z]} castShadow />
                <mesh material={KOYU_METAL} position={[W / 2 + P + 0.03, kanatAlt + H / 2, z]} castShadow>
                  <boxGeometry args={[0.02, H * 0.9, zAra * 2 - P]} />
                </mesh>
                <KilavuzMakara x={W / 2 + P / 2 + 0.02} y={kanatAlt + 0.2} z={z} />
              </>
            );
          })()}
        </>
      ) : (
        <>
          <Kolon x={sol - KOL / 2} h={H + (yaya ? 0.28 : 0.15)} k={KOL} mat={kolonMat} gomulu={yaya && k.montajTipi !== "flans"} />
          <Kolon x={W / 2 + KOL / 2} h={H + (yaya ? 0.28 : 0.15)} k={KOL} mat={kolonMat} gomulu={yaya && k.montajTipi !== "flans"} />
          {/* Betona gömülü kolonun dibinde görünen beton yaka */}
          {yaya && k.montajTipi !== "flans" &&
            [sol - KOL / 2, W / 2 + KOL / 2].map((x) => (
              <mesh key={x} material={betonMat} position={[x, 0.015, 0]} receiveShadow>
                <cylinderGeometry args={[0.15, 0.17, 0.03, 20]} />
              </mesh>
            ))}
        </>
      )}

      {k.tip === "surgulu" && (
        <>
          {/* Ray: açıklık + park yeri; zemine dübelli U taban */}
          {/* Ray: park yerinin başından (sol - W) karşılama kolonuna (W/2) kadar tam boy */}
          <mesh material={rayMat} position={[sol, 0.012, z]} receiveShadow castShadow>
            <boxGeometry args={[W * 2 + 0.3, 0.024, 0.03]} />
          </mesh>
          <mesh material={rayMat} position={[sol, 0.003, z]} receiveShadow>
            <boxGeometry args={[W * 2 + 0.3, 0.006, 0.08]} />
          </mesh>
          <group position={[sol - acik * W, 0.12, z]}>
            <Kanat w={W} h={H} k={k} altKiris />
            {[0.35, W - 0.35].map((x) => (
              <group key={x} position={[0, -0.12, 0]}>
                <Teker x={x} />
              </group>
            ))}
            {k.motor && (
              <group position={[0, 0.03, 0.05]}>
                <Kremayer L={W} />
              </group>
            )}
          </group>
        </>
      )}

      {k.tip === "konsol" && (
        <>
          {/* Uçan kapı (Setka tipi): kanat iki makaralı arabanın üstünde havada durur; arabalar
              flanşlı kısa ayaklarda, kılavuz kolonun hemen arkasında ve kuyruk tarafında */}
          {[sol - 0.35, sol - Math.max(0.9, (L - W) * 0.85)].map((x) => (
            <group key={x} position={[x, 0, z]}>
              {/* flanş plaka + 4 cıvata */}
              <mesh material={KOYU_METAL} position={[0, 0.008, 0]} receiveShadow castShadow>
                <boxGeometry args={[0.3, 0.016, 0.26]} />
              </mesh>
              {[-1, 1].flatMap((a) => [-1, 1].map((b) => [a, b] as const)).map(([a, b]) => (
                <mesh key={`${a}${b}`} material={PASLANMAZ} position={[a * 0.11, 0.022, b * 0.09]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.014, 6]} />
                </mesh>
              ))}
              {/* ayak + makaralı araba */}
              <mesh material={kolonMat} position={[0, 0.07, 0]} castShadow>
                <boxGeometry args={[0.08, 0.11, 0.08]} />
              </mesh>
              <RoundedBox args={[0.28, 0.07, 0.14]} radius={0.01} smoothness={2} material={KOYU_METAL} position={[0, 0.16, 0]} castShadow />
              {[-0.09, 0.09].map((dx) => (
                <mesh key={dx} material={PLASTIK} position={[dx, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.1, 16]} />
                </mesh>
              ))}
            </group>
          ))}
          <group position={[sol - (L - W) - acik * W, 0.32, z]}>
            {/* panel yalnız geçiş açıklığı kadar; kuyruk açık üçgen */}
            <group position={[L - W, 0, 0]}>
              <Kanat w={W} h={H} k={k} duzPanel />
            </group>
            {/* alt taşıyıcı C profil: kanadın tamamı boyunca */}
            <RoundedBox args={[L, 0.1, 0.08]} radius={0.006} smoothness={2} material={kolonMat} position={[L / 2, -0.05, 0]} castShadow />
            {/* kuyruk: panelin tepesinden kiriş ucuna inen eğik çubuk ve uç dikmesi */}
            <mesh
              material={kolonMat}
              position={[(L - W) / 2, H / 2, 0]}
              rotation={[0, 0, Math.atan2(H - 0.05, L - W)]}
              castShadow
            >
              <boxGeometry args={[Math.hypot(L - W, H - 0.05), 0.05, 0.05]} />
            </mesh>
            <mesh material={kolonMat} position={[0.025, 0.08, 0]} castShadow>
              <boxGeometry args={[0.05, 0.16, 0.05]} />
            </mesh>
            {k.motor && (
              <group position={[0, -0.02, 0.05]}>
                <Kremayer L={L} />
              </group>
            )}
          </group>
        </>
      )}

      {k.tip === "cift" && !yaya && (
        <>
          <group position={[sol, 0.06, 0]} rotation={[0, -kanatAci, 0]}>
            <Kanat w={W / 2 - 0.015} h={H} k={k} />
            {menteseY.map((y) => (
              <MenteseKanat key={y} y={y} />
            ))}
            {k.kilit && <KilitKutusu x={W / 2 - 0.05} y={kilitY} />}
            <YerSurgusu x={W / 2 - 0.12} aci={0} />
          </group>
          <group position={[W / 2, 0.06, 0]} rotation={[0, Math.PI + kanatAci, 0]}>
            <group scale={[1, 1, -1]}>
              <Kanat w={W / 2 - 0.015} h={H} k={k} />
              {menteseY.map((y) => (
                <MenteseKanat key={y} y={y} />
              ))}
              <YerSurgusu x={W / 2 - 0.12} aci={0} />
            </group>
          </group>
          {menteseY.map((y) => (
            <group key={y}>
              <group position={[sol, 0.06, 0]}>
                <Mentese y={y} kolonYuz={0} />
              </group>
              <group position={[W / 2, 0.06, 0]}>
                <Mentese y={y} kolonYuz={0} />
              </group>
            </group>
          ))}
          {/* orta stoper ve yer sürgüsü yuvaları */}
          <mesh material={KOYU_METAL} position={[0, 0.02, 0.06]} castShadow>
            <boxGeometry args={[0.08, 0.04, 0.12]} />
          </mesh>
        </>
      )}

      {k.tip === "tek" && yaya && (
        <>
          <group position={[sol + 0.03, kanatY, 0]} rotation={[0, -kanatAci, 0]}>
            <Kanat w={W - 0.05} h={H} k={k} duzPanel C={0.04} />
            {yayaMY.map((y) => (
              <AyarliMenteseKanat key={y} y={y} />
            ))}
            {k.kilit && <KilitKutusu x={W - 0.08} y={kilitY} />}
          </group>
          {yayaMY.map((y) => (
            <group key={y} position={[sol + 0.018, kanatY, 0]}>
              <AyarliMentese y={y} kolon={KOL} />
            </group>
          ))}
          {k.kilit && (
            <RoundedBox args={[0.03, 0.14, 0.05]} radius={0.004} smoothness={2} material={KOYU_METAL} position={[W / 2 + 0.012, kanatY + kilitY + 0.04, 0]} />
          )}
        </>
      )}

      {k.tip === "cift" && yaya && (
        <>
          <group position={[sol + 0.03, kanatY, 0]} rotation={[0, -kanatAci, 0]}>
            <Kanat w={W / 2 - 0.04} h={H} k={k} duzPanel C={0.04} />
            {yayaMY.map((y) => (
              <AyarliMenteseKanat key={y} y={y} />
            ))}
            {k.kilit && <KilitKutusu x={W / 2 - 0.07} y={kilitY} />}
            <YerSurgusu x={W / 2 - 0.15} aci={0} />
          </group>
          <group position={[W / 2 - 0.03, kanatY, 0]} rotation={[0, Math.PI + kanatAci, 0]}>
            <group scale={[1, 1, -1]}>
              <Kanat w={W / 2 - 0.04} h={H} k={k} duzPanel C={0.04} />
              {yayaMY.map((y) => (
                <AyarliMenteseKanat key={y} y={y} />
              ))}
            </group>
          </group>
          {yayaMY.map((y) => (
            <group key={y}>
              <group position={[sol + 0.018, kanatY, 0]}>
                <AyarliMentese y={y} kolon={KOL} />
              </group>
              <group position={[W / 2 - 0.018, kanatY, 0]} rotation={[0, Math.PI, 0]}>
                <AyarliMentese y={y} kolon={KOL} />
              </group>
            </group>
          ))}
        </>
      )}

      {k.tip === "tek" && !yaya && (
        <>
          <group position={[sol, 0.06, 0]} rotation={[0, -kanatAci, 0]}>
            <Kanat w={W - 0.015} h={H} k={k} />
            {menteseY.map((y) => (
              <MenteseKanat key={y} y={y} />
            ))}
            {k.kilit && <KilitKutusu x={W - 0.05} y={kilitY} />}
          </group>
          {menteseY.map((y) => (
            <group key={y} position={[sol, 0.06, 0]}>
              <Mentese y={y} kolonYuz={0} />
            </group>
          ))}
          {/* Karşı kolonda kilit karşılığı (dil yuvası) ve kapı stoperi */}
          {k.kilit && (
            <RoundedBox args={[0.035, 0.16, 0.06]} radius={0.004} smoothness={2} material={KOYU_METAL} position={[W / 2 + 0.018, kilitY + 0.06, 0]} />
          )}
          <mesh material={KOYU_METAL} position={[W / 2 - 0.01, H * 0.5, -0.045]}>
            <boxGeometry args={[0.03, H * 0.7, 0.012]} />
          </mesh>
        </>
      )}

      {/* Elektrikli kilit: kolonda kart okuyucu, kanat ucunda elektromanyetik kilit */}
      {k.elektrikliKilit && (k.tip === "tek" || k.tip === "cift") && (
        <>
          <group position={[W / 2 + KOL / 2, kanatY + kilitY + 0.3, KOL / 2 + 0.018]}>
            <RoundedBox args={[0.085, 0.14, 0.03]} radius={0.008} smoothness={3} material={PLASTIK} />
            <mesh position={[0, 0.035, 0.016]}>
              <boxGeometry args={[0.05, 0.022, 0.003]} />
              <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={1} />
            </mesh>
            <mesh position={[0, -0.02, 0.016]}>
              <circleGeometry args={[0.022, 24]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
          <RoundedBox args={[0.05, 0.25, 0.05]} radius={0.004} smoothness={2} material={PLASTIK} position={[W / 2 - 0.035, H - 0.05, -0.05]} />
        </>
      )}

      {/* Motor: sürgülüde zemine dübelli yuvarlatılmış gövde; kanatlıda kollu motor */}
      {k.motor && surgulu(k) && (
        <group position={[sol - 0.35, 0, z + 0.25]}>
          <RoundedBox args={[0.34, 0.3, 0.24]} radius={0.04} smoothness={4} material={motorMat} position={[0, 0.17, 0]} castShadow />
          <mesh material={KOYU_METAL} position={[0, 0.01, 0]} receiveShadow>
            <boxGeometry args={[0.4, 0.02, 0.3]} />
          </mesh>
          <mesh material={KOYU_METAL} position={[0.05, 0.06, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.06, 14]} />
          </mesh>
        </group>
      )}
      {k.motor &&
        (k.tip === "cift" ? [sol, W / 2] : k.tip === "tek" ? [sol] : []).map((x) => (
          <group key={x} position={[x + (x < 0 ? -0.06 : 0.06), H * 0.5, 0.06]} rotation={[0, x < 0 ? 0.35 - kanatAci * 0.5 : -0.35 + kanatAci * 0.5, 0]}>
            <RoundedBox args={[0.09, 0.09, 0.7]} radius={0.02} smoothness={3} material={motorMat} position={[0, 0, 0.35]} castShadow />
            <mesh material={PASLANMAZ} position={[0, 0, 0.75]}>
              <cylinderGeometry args={[0.015, 0.015, 0.12, 10]} />
            </mesh>
          </group>
        ))}
      {k.fotosel &&
        [sol - DIREK / 2, W / 2 + DIREK / 2].map((x) => (
          <group key={x} position={[x, 0.5, DIREK / 2 + 0.03]}>
            <RoundedBox args={[0.06, 0.11, 0.045]} radius={0.01} smoothness={3} material={PLASTIK} />
            <mesh position={[0, 0.02, 0.024]}>
              <circleGeometry args={[0.012, 16]} />
              <meshStandardMaterial color="#7f1d1d" emissive="#b91c1c" emissiveIntensity={0.6} />
            </mesh>
          </group>
        ))}
      {k.flasor && (
        <group position={[sol - DIREK / 2, surgulu(k) ? (k.tip === "konsol" ? 0.32 : 0.12) + H + (k.mizrak ? MIZRAK_BOY : 0) + 0.05 + PORTAL_PROFIL + 0.02 : H + 0.18, surgulu(k) ? z : 0]}>
          <mesh material={PLASTIK} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.04, 20]} />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.06, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#ffb020" emissive="#ff8a00" emissiveIntensity={0.7} transmission={0.2} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}

type Gorunum = { tur: "kose" | "genel" | "yon"; yon?: [number, number, number]; n: number };

/**
 * Kamera geçişi: Köşe (kilit/menteşe yakın çekim), Tümü (önden açılı) ya da küpten seçilen yön
 * (kapının ortasına hizalı). Kullanıcı sürükleyince animasyon bırakılır.
 */
function KapiKamera({ W, H, gorunum, uzak }: { W: number; H: number; gorunum: Gorunum; uzak: number }) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null;
  };
  const hedef = useRef<{ pos: THREE.Vector3; bak: THREE.Vector3 } | null>(null);
  useEffect(() => {
    const merkez = new THREE.Vector3(0, H / 2, 0);
    if (gorunum.tur === "yon" && gorunum.yon) {
      const yon = new THREE.Vector3(...gorunum.yon).normalize();
      yon.y = Math.max(yon.y, 0.02);
      if (yon.y > 0.98) yon.set(0, 1, 0.001);
      hedef.current = { pos: merkez.clone().add(yon.normalize().multiplyScalar(uzak)), bak: merkez };
    } else if (gorunum.tur === "kose")
      hedef.current = { pos: new THREE.Vector3(W / 2 + 0.9, H * 0.9 + 0.3, 1.9), bak: new THREE.Vector3(W / 2 - 0.2, H * 0.5, 0) };
    else hedef.current = { pos: new THREE.Vector3(W * 0.25, H + 1.2, uzak), bak: new THREE.Vector3(-W * 0.15, H / 2, 0) };
  }, [gorunum.n, gorunum.tur, W, H, uzak]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!controls) return;
    const dur = () => (hedef.current = null);
    controls.addEventListener("start", dur);
    return () => controls.removeEventListener("start", dur);
  }, [controls]);
  useFrame((_, dt) => {
    const h = hedef.current;
    if (!h) return;
    camera.position.lerp(h.pos, 1 - Math.exp(-dt * 3));
    if (controls) {
      controls.target.lerp(h.bak, 1 - Math.exp(-dt * 3.5));
      controls.update();
    } else camera.lookAt(h.bak);
    if (camera.position.distanceTo(h.pos) < 0.01) hedef.current = null;
  });
  return null;
}

/** Kapı 3D görünümü: gerçekçi ışık ve zemin, önden hafif açılı, döndürülebilir. */
export default function AracKapiSahne({ kapi, acik, yaya = false }: { kapi: AracKapi; acik: number; yaya?: boolean }) {
  const koyu = useTema((s) => s.tema) !== "acik";
  const W = kapi.genislik;
  const uzak = Math.max(W < 3 ? 3.6 : 6, W * 1.25 + 3);
  const [gorunum, setGorunum] = useState<Gorunum>({ tur: "genel", n: 0 });
  const sec = (tur: Gorunum["tur"], yon?: [number, number, number]) => setGorunum((g) => ({ tur, yon, n: g.n + 1 }));
  return (
    <div className="relative h-full w-full">
    <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: 40, near: 0.05, far: 500, position: [W * 0.25, kapi.yukseklik + 1.2, uzak] }}>
      <color attach="background" args={[koyu ? "#0b1a33" : "#dde6f1"]} />
      <fog attach="fog" args={[koyu ? "#0b1a33" : "#dde6f1", uzak * 2.5, uzak * 6]} />
      <hemisphereLight args={["#dfe9ff", "#3a3328", 0.55]} />
      <directionalLight
        position={[5, 9, 7]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-W - 4}
        shadow-camera-right={W + 4}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
      />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[16, 16, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#cfe0ff" position={[-9, 3, 5]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffe2c4" position={[9, 2, -5]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
      </Environment>
      {/* Zemin: asfalt / toprak tonu */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={koyu ? "#2b3138" : "#7d8691"} roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.004, 0]} opacity={0.45} scale={W * 4 + 8} blur={2.4} far={3} resolution={1024} />
      <Kapi k={kapi} acik={acik} yaya={yaya} />
      <OrbitControls makeDefault enableDamping target={[-W * 0.15, kapi.yukseklik / 2, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={0.8} maxDistance={60} />
      <KapiKamera W={W} H={kapi.yukseklik} gorunum={gorunum} uzak={uzak} />
      {/* Görünüm küpü: çit planlayıcıdakiyle aynı; yüzüne tıklayınca kamera o yönden bakar */}
      <GizmoHelper alignment="bottom-left" margin={[132, 62]}>
        <GizmoViewcube
          faces={["Sağ", "Sol", "Üst", "Alt", "Ön", "Arka"]}
          color="#0b2350"
          textColor="#ffffff"
          hoverColor="#d82628"
          strokeColor="#0a84c6"
          opacity={0.95}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            const p = e.object.position;
            const yon = p.lengthSq() > 1e-6 ? p : e.face?.normal;
            if (yon) sec("yon", [yon.x, yon.y, yon.z]);
            return null;
          }}
        />
      </GizmoHelper>
    </Canvas>
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5">
        {(
          [
            ["kose", "Köşe", "Kilit ve menteşe tarafından yakın görünüm"],
            ["genel", "Tümü", "Kapının tamamı"],
          ] as const
        ).map(([tur, ad, ipucu]) => (
          <button
            key={tur}
            type="button"
            title={ipucu}
            aria-label={ipucu}
            onClick={() => sec(tur)}
            className={`cam rounded-lg px-2.5 py-1.5 text-xs font-bold transition hover:bg-[var(--yuzey-2)] ${gorunum.tur === tur ? "ring-1 ring-ac-kirmizi" : ""}`}
          >
            {ad}
          </button>
        ))}
        <button
          type="button"
          title="Üstten görünüş"
          aria-label="Üstten görünüş"
          onClick={() => sec("yon", [0, 1, 0])}
          className={`cam rounded-lg px-2.5 py-1.5 text-xs font-bold transition hover:bg-[var(--yuzey-2)] ${gorunum.tur === "yon" && gorunum.yon?.[1] === 1 ? "ring-1 ring-ac-kirmizi" : ""}`}
        >
          Üst
        </button>
      </div>
    </div>
  );
}
