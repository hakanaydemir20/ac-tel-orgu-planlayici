"use client";
import { Canvas } from "@react-three/fiber";
import { Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { type AracKapi, kanatBoyu, surgulu } from "@/lib/aracKapi";
import { direkRengi } from "@/lib/katalog";
import { useTema } from "@/lib/tema";
import { hucreBoyu, telDokusu } from "./dokular";

const CERCEVE = 0.06; // kanat çerçeve profili, m
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
 * Kanat: sol alt köşesi orijinde, +x yönünde w genişliğinde. Kalın çerçeve, ~2,5 m'de bir ara
 * dikme, sürgülüde kalın alt kiriş, seçilen dolgu ve isteğe bağlı mızrak uçlar.
 */
function Kanat({ w, h, k, altKiris = false }: { w: number; h: number; k: AracKapi; altKiris?: boolean }) {
  const renk = direkRengi(k.renk).renk;
  const boyali = k.renk !== "galvaniz";
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: renk, metalness: boyali ? 0.3 : 0.75, roughness: boyali ? 0.5 : 0.35 }),
    [renk, boyali],
  );
  const telMat = useMemo(() => new THREE.MeshStandardMaterial({ color: renk, metalness: boyali ? 0.25 : 0.7, roughness: 0.45 }), [renk, boyali]);
  const bolum = Math.max(1, Math.ceil((w - 0.05) / 2.5));
  const bw = w / bolum; // bölüm genişliği
  const C = CERCEVE;
  const alt = altKiris ? 0.12 : C; // sürgülü kanatta taşıyıcı alt kiriş
  const ic = h - C - alt;

  const panel = useMemo(() => (k.dolgu === "panel" ? bombeliPanel(bw - C, ic) : null), [k.dolgu, bw, ic, C]);
  const tel = useMemo(() => {
    if (k.dolgu !== "kafes") return null;
    const doku = telDokusu("kafes", 50, 3).clone();
    const [hw, hh] = hucreBoyu("kafes", 50);
    doku.repeat.set((bw - C) / hw, ic / hh);
    doku.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: doku, color: renk, transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.4 });
  }, [k.dolgu, bw, ic, renk, C]);
  const cubuklar = useMemo(() => {
    if (k.dolgu !== "profil") return [];
    const adet = Math.max(2, Math.round((bw - C) / 0.12));
    return Array.from({ length: adet }, (_, i) => C / 2 + ((i + 0.5) * (bw - C)) / adet);
  }, [k.dolgu, bw, C]);
  const mizraklar = useMemo(() => {
    if (!k.mizrak) return [];
    const adet = Math.max(2, Math.round(w / 0.2));
    return Array.from({ length: adet }, (_, i) => ((i + 0.5) * w) / adet);
  }, [k.mizrak, w]);

  return (
    <group>
      {/* çerçeve: üst, alt (kiriş), dikmeler */}
      <mesh material={metal} position={[w / 2, h - C / 2, 0]} castShadow>
        <boxGeometry args={[w, C, C]} />
      </mesh>
      <mesh material={metal} position={[w / 2, alt / 2, 0]} castShadow>
        <boxGeometry args={[w, alt, C * (altKiris ? 1.4 : 1)]} />
      </mesh>
      {Array.from({ length: bolum + 1 }, (_, i) => (
        <mesh key={i} material={metal} position={[Math.min(w - C / 2, Math.max(C / 2, i * bw)), h / 2, 0]} castShadow>
          <boxGeometry args={[C, h, C]} />
        </mesh>
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
                <boxGeometry args={[0.03, ic, 0.03]} />
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

function Kapi({ k, acik }: { k: AracKapi; acik: number }) {
  const W = k.genislik;
  const H = k.yukseklik;
  const kolonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: direkRengi(k.renk).renk, metalness: 0.4, roughness: 0.5 }), [k.renk]);
  const rayMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8e98a6", metalness: 0.8, roughness: 0.3 }), []);
  const betonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9aa0a8", roughness: 0.95 }), []);
  const motorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2f37", roughness: 0.6 }), []);
  const sol = -W / 2;
  const L = kanatBoyu(k);
  const z = 0.12; // sürgülü kanat çit hattının iç yanında kayar

  return (
    <group>
      {/* Kolonlar: kanatlıda iki menteşe kolonu; sürgülüde kapının içinden geçtiği kılavuz
          portal (çift dikme + üst kuşak) ve karşı tarafta karşılama kolonu */}
      {surgulu(k) ? (
        <>
          {[z - 0.13, z + 0.13].map((zz) => (
            <mesh key={zz} material={kolonMat} position={[sol - DIREK / 2, (H + 0.35) / 2, zz]} castShadow>
              <boxGeometry args={[DIREK * 0.7, H + 0.35, DIREK * 0.7]} />
            </mesh>
          ))}
          <mesh material={kolonMat} position={[sol - DIREK / 2, H + 0.35, z]} castShadow>
            <boxGeometry args={[DIREK * 0.7, DIREK * 0.5, 0.26 + DIREK * 0.7]} />
          </mesh>
          {/* karşılama: kanat ucunu tutan U kolon */}
          {[z - 0.09, z + 0.09].map((zz) => (
            <mesh key={zz} material={kolonMat} position={[W / 2 + DIREK / 2, (H + 0.15) / 2, zz]} castShadow>
              <boxGeometry args={[DIREK * 0.8, H + 0.15, 0.05]} />
            </mesh>
          ))}
          <mesh material={kolonMat} position={[W / 2 + DIREK, (H + 0.15) / 2, z]} castShadow>
            <boxGeometry args={[0.05, H + 0.15, 0.23]} />
          </mesh>
          {/* kolon ayak plakaları */}
          {[sol - DIREK / 2, W / 2 + DIREK / 2].map((x) => (
            <mesh key={x} material={kolonMat} position={[x, 0.01, z]}>
              <boxGeometry args={[0.35, 0.02, 0.45]} />
            </mesh>
          ))}
        </>
      ) : (
        [sol - DIREK / 2, W / 2 + DIREK / 2].map((x) => (
          <mesh key={x} material={kolonMat} position={[x, (H + 0.15) / 2, 0]} castShadow>
            <boxGeometry args={[DIREK, H + 0.15, DIREK]} />
          </mesh>
        ))
      )}

      {k.tip === "surgulu" && (
        <>
          {/* Ray: açıklık + kapının park yeri */}
          <mesh material={rayMat} position={[sol - W / 2, 0.015, z]} receiveShadow>
            <boxGeometry args={[W * 2, 0.03, 0.05]} />
          </mesh>
          <group position={[sol - acik * W, 0.08, z]}>
            <Kanat w={W} h={H} k={k} altKiris />
            {[0.3, W - 0.3].map((x) => (
              <mesh key={x} material={rayMat} position={[x, -0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
              </mesh>
            ))}
          </group>
        </>
      )}

      {k.tip === "konsol" && (
        <>
          {/* Taşıyıcı beton temel ve makaralı arabalar kuyruk tarafında */}
          <mesh material={betonMat} position={[sol - (L - W) / 2 - 0.5, 0.05, z]} receiveShadow>
            <boxGeometry args={[L - W + 1, 0.1, 0.5]} />
          </mesh>
          {[sol - 0.4, sol - (L - W) + 0.2].map((x) => (
            <mesh key={x} material={motorMat} position={[x, 0.17, z]} castShadow>
              <boxGeometry args={[0.35, 0.14, 0.18]} />
            </mesh>
          ))}
          <group position={[sol - (L - W) - acik * W, 0.26, z]}>
            <Kanat w={L} h={H} k={k} altKiris />
            {/* alt taşıyıcı kiriş */}
            <mesh material={rayMat} position={[L / 2, -0.04, 0]}>
              <boxGeometry args={[L, 0.08, 0.08]} />
            </mesh>
          </group>
        </>
      )}

      {k.tip === "cift" && (
        <>
          <group position={[sol, 0.08, 0]} rotation={[0, -acik * 1.45, 0]}>
            <Kanat w={W / 2 - 0.01} h={H} k={k} />
          </group>
          <group position={[W / 2, 0.08, 0]} rotation={[0, Math.PI + acik * 1.45, 0]}>
            <group scale={[1, 1, -1]}>
              <Kanat w={W / 2 - 0.01} h={H} k={k} />
            </group>
          </group>
        </>
      )}

      {k.tip === "tek" && (
        <group position={[sol, 0.08, 0]} rotation={[0, -acik * 1.45, 0]}>
          <Kanat w={W - 0.01} h={H} k={k} />
        </group>
      )}

      {/* Motor: sürgülüde kolon dibinde kutu, kanatlıda kolonlarda kol */}
      {k.motor && (k.tip === "surgulu" || k.tip === "konsol") && (
        <mesh material={motorMat} position={[sol - 0.35, 0.2, z + 0.28]} castShadow>
          <boxGeometry args={[0.32, 0.3, 0.22]} />
        </mesh>
      )}
      {k.motor &&
        (k.tip === "cift" ? [sol, W / 2] : k.tip === "tek" ? [sol] : []).map((x) => (
          <mesh key={x} material={motorMat} position={[x + (x < 0 ? -0.05 : 0.05), H * 0.55, 0.35]} castShadow>
            <boxGeometry args={[0.1, 0.1, 0.6]} />
          </mesh>
        ))}
      {k.fotosel &&
        [sol - DIREK / 2, W / 2 + DIREK / 2].map((x) => (
          <mesh key={x} material={motorMat} position={[x, 0.5, DIREK / 2 + 0.03]}>
            <boxGeometry args={[0.07, 0.11, 0.05]} />
          </mesh>
        ))}
      {k.flasor && (
        <mesh position={[sol - DIREK / 2, H + 0.25, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial color="#ffb020" emissive="#ff8a00" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

/** Araç kapısı 3D görünümü: önden hafif açılı, döndürülebilir. */
export default function AracKapiSahne({ kapi, acik }: { kapi: AracKapi; acik: number }) {
  const koyu = useTema((s) => s.tema) !== "acik";
  const W = kapi.genislik;
  const uzak = Math.max(6, W * 1.25 + 3);
  return (
    <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true, antialias: true }} camera={{ fov: 40, near: 0.1, far: 500, position: [W * 0.25, kapi.yukseklik + 1.2, uzak] }}>
      <color attach="background" args={[koyu ? "#071733" : "#dbe5f1"]} />
      <hemisphereLight args={["#bcd4ff", "#0b1a2e", 0.9]} />
      <directionalLight position={[6, 10, 8]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#7fb6ff" position={[-8, 2, 4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
      </Environment>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={koyu ? "#0c1d38" : "#a7b4c5"} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[80, 80]}
        cellSize={0.5}
        sectionSize={1}
        cellColor={koyu ? "#16325f" : "#8796ab"}
        sectionColor="#0a84c6"
        fadeDistance={30}
        infiniteGrid
      />
      <Kapi k={kapi} acik={acik} />
      <OrbitControls makeDefault enableDamping target={[-W * 0.15, kapi.yukseklik / 2, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={2} maxDistance={60} />
    </Canvas>
  );
}
