"use client";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Environment, GizmoHelper, GizmoViewcube, Grid, Lightformer, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTema } from "@/lib/tema";
import * as THREE from "three";
import { DETAY_ORAN } from "../pdf";
import type { Direk, Kosu, Nokta, Sonuc } from "@/lib/hesap";
import { KAS_DELIKLERI, KAS_DELIK_CAP, kasUzunlugu } from "@/lib/hesap";
import { VARSAYILAN_AYARLAR, direkRengi, direkTipi, ustOlcu } from "@/lib/katalog";
import { Tasarim, kenarHarfi, sekilNoktalari } from "@/lib/tasarim";
import { disNormal, icinde } from "@/lib/geometri";
import { sayiOku } from "@/lib/sayi";
import { varlik } from "@/lib/yol";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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
function Cubuk({ a, b, k, renk, malzeme, yuvarlak = false }: { a: THREE.Vector3; b: THREE.Vector3; k: number; renk?: string; malzeme?: THREE.Material; yuvarlak?: boolean }) {
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
      {yuvarlak ? <cylinderGeometry args={[k / 2, k / 2, boy, 16]} /> : <boxGeometry args={[k, boy, k]} />}
      {!malzeme && <meshStandardMaterial color={renk} metalness={0.6} roughness={0.4} />}
    </mesh>
  );
}

/**
 * Demir direk kaş kolu (direğin yerel ekseninde): direkle aynı profilden, 45° (yarım açı) gönye
 * birleşimli. Direk ve kol birleşimde e = k/2·tan(θ/2) uzatılır; iki kutunun birleşimi tam gönye
 * köşesi verir. Uçta profil kapağı, kol üstünde gergi teli için 3 delik (çit doğrultusunda).
 */
function KasKolu({ yon, L, k, h, boru, malzeme, kapak }: { yon: THREE.Vector3; L: number; k: number; h: number; boru: boolean; malzeme: THREE.Material; kapak: THREE.Material }) {
  const { q, e, eksen } = useMemo(() => {
    const d = yon.clone().normalize();
    const teta = YUKARI.angleTo(d);
    // kol dönme ekseni yatay kalır: kutu yüzleri direğin yüzleriyle aynı hizada
    return { q: new THREE.Quaternion().setFromUnitVectors(YUKARI, d), e: (k / 2) * Math.tan(teta / 2), eksen: d };
  }, [yon, k]);
  const ust = new THREE.Vector3(0, h, 0);
  const merkez = ust.clone().addScaledVector(eksen, (L - e) / 2);
  // delik ekseni: kol yönüne ve dönme eksenine dik → çit doğrultusu (yerel z, kol yan yatınca da)
  const delikYon = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
  const delikQ = new THREE.Quaternion().setFromUnitVectors(YUKARI, delikYon);
  return (
    <group>
      {/* gönye için direk üst ucu e kadar uzatılır */}
      {e > 1e-4 && (
        <mesh material={malzeme} position={[0, h + e / 2, 0]} castShadow>
          {boru ? <cylinderGeometry args={[k / 2, k / 2, e, 20]} /> : <boxGeometry args={[k, e, k]} />}
        </mesh>
      )}
      <mesh material={malzeme} position={merkez} quaternion={q} castShadow receiveShadow>
        {boru ? <cylinderGeometry args={[k / 2, k / 2, L + e, 20]} /> : <boxGeometry args={[k, L + e, k]} />}
      </mesh>
      {/* uç kapağı */}
      <mesh material={kapak} position={ust.clone().addScaledVector(eksen, L + 0.006)} quaternion={q}>
        {boru ? <cylinderGeometry args={[k * 0.58, k * 0.58, 0.012, 20]} /> : <boxGeometry args={[k * 1.1, 0.012, k * 1.1]} />}
      </mesh>
      {/* gergi teli delikleri (iki yüzde koyu daire) */}
      {KAS_DELIKLERI.map((f) => (
        <mesh key={f} material={kapak} position={ust.clone().addScaledVector(eksen, L * f)} quaternion={delikQ}>
          <cylinderGeometry args={[KAS_DELIK_CAP / 2, KAS_DELIK_CAP / 2, k + 0.003, 12]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Demir direk payandası: direkle aynı profil. Üst ucu direğin yüzüne açılı kesimle oturur (kol
 * direk içine k/2·cot α uzar, dışa taşmaz), alt ucu zemine yatay kesimle basar (k/2·tan α zemine).
 */
function Payanda({ ust, alt, k, boru, malzeme }: { ust: THREE.Vector3; alt: THREE.Vector3; k: number; boru: boolean; malzeme: THREE.Material }) {
  const { orta, q, boy } = useMemo(() => {
    const d = alt.clone().sub(ust).normalize();
    const alfa = Math.acos(Math.min(1, Math.abs(d.y))); // dikeyle açı
    const a = ust.clone().addScaledVector(d, -(k / 2) / Math.max(0.2, Math.tan(alfa)));
    const b = alt.clone().addScaledVector(d, (k / 2) * Math.tan(alfa));
    return {
      orta: a.clone().add(b).multiplyScalar(0.5),
      q: new THREE.Quaternion().setFromUnitVectors(YUKARI, b.clone().sub(a).normalize()),
      boy: a.distanceTo(b),
    };
  }, [ust, alt, k]);
  return (
    <mesh position={orta} quaternion={q} castShadow material={malzeme}>
      {boru ? <cylinderGeometry args={[k / 2, k / 2, boy, 16]} /> : <boxGeometry args={[k, boy, k]} />}
    </mesh>
  );
}

// ---------- açılış animasyonu ----------

/**
 * Açılış: kamera uzaktan köşeye yaklaşırken direkler görünmeyen bir yükseklikten düşer. Dalga
 * görünüm köşesindeki direkten başlar, çit boyunca iki yana yayılır; en uzaktaki en son düşer.
 * Dalga başladıktan 2 sn sonra teller aynı köşeden rulodan serilir gibi iki yana açılır.
 */
const DUSUS = { yukseklik: 60, direkGecikme: 0.6, direkSure: 1.15, dalgaSuresi: 2.6, telGecikme: 2, telSuresi: 3.2, telSure: 0.7 };
/** Sekmeli iniş (0 → 1): yere çarpıp iki kez hafifçe sıçrar. */
function sekme(x: number) {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
}
/**
 * Çit boyunca (çevre üzerinden) görünüm köşesine uzaklık: düşme dalgası ve tel serilmesi bununla
 * sıralanır. Kapalı arazide iki yönden kısa olan alınır.
 */
function cevreMesafesi(noktalar: [number, number][], kapali: boolean, bas: number) {
  const n = noktalar.length;
  const sira = kapali ? Array.from({ length: n + 1 }, (_, i) => noktalar[(bas + i) % n]) : noktalar;
  const kum = [0];
  for (let i = 1; i < sira.length; i++) kum.push(kum[i - 1] + Math.hypot(sira[i][0] - sira[i - 1][0], sira[i][1] - sira[i - 1][1]));
  const P = kum.at(-1)!;
  const olc = (x: number, z: number) => {
    let en = Infinity, s = 0;
    for (let i = 1; i < sira.length; i++) {
      const [ax, az] = sira[i - 1], [bx, bz] = sira[i];
      const L = Math.hypot(bx - ax, bz - az) || 1e-9;
      const t = THREE.MathUtils.clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L), 0, 1);
      const d = Math.hypot(ax + t * (bx - ax) - x, az + t * (bz - az) - z);
      if (d < en) (en = d), (s = kum[i - 1] + t * L);
    }
    return kapali ? Math.min(s, P - s) : s;
  };
  return { olc, enUzak: kapali ? P / 2 : P };
}

/**
 * Bir koşunun telleri: köşeye yakın ucundan uzak ucuna doğru "rulodan serilir" (koşu boyunca
 * ölçeklenerek açılır). Serilme cephesi çevre mesafesiyle ilerler; bitince ölçek 1'de kalır.
 */
function Seril({ kosu, olc, hiz, baslangic, gecikme, children }: { kosu: Kosu; olc: (x: number, z: number) => number; hiz: number; baslangic: React.RefObject<number>; gecikme: number | null; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { yakin, aci, d0, L } = useMemo(() => {
    const da = olc(kosu.a[0], kosu.a[2]);
    const db = olc(kosu.b[0], kosu.b[2]);
    const [n, u] = da <= db ? [kosu.a, kosu.b] : [kosu.b, kosu.a];
    return { yakin: n, aci: -Math.atan2(u[2] - n[2], u[0] - n[0]), d0: Math.min(da, db), L: Math.hypot(u[0] - n[0], u[2] - n[2]) || 1 };
  }, [kosu, olc]);
  const bitti = useRef(gecikme === null);
  useFrame(() => {
    if (bitti.current || !ref.current || gecikme === null) return;
    const T = (performance.now() - baslangic.current) / 1000 - gecikme;
    const k = THREE.MathUtils.clamp((T * hiz - d0) / L, 0, 1);
    ref.current.scale.x = Math.max(1e-4, k);
    ref.current.visible = k > 0;
    if (k >= 1) bitti.current = true;
  });
  return (
    <group position={[yakin[0], 0, yakin[2]]} rotation={[0, aci, 0]}>
      <group ref={ref} scale={[gecikme === null ? 1 : 1e-4, 1, 1]} visible={gecikme === null}>
        <group rotation={[0, -aci, 0]}>
          <group position={[-yakin[0], 0, -yakin[2]]}>{children}</group>
        </group>
      </group>
    </group>
  );
}

/** İçindekileri belli bir anda görünür yapar (köşe parçaları serilme cephesi oraya varınca). */
function Belir({ baslangic, an, children }: { baslangic: React.RefObject<number>; an: number | null; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (an === null || !ref.current || ref.current.visible) return;
    if ((performance.now() - baslangic.current) / 1000 >= an) ref.current.visible = true;
  });
  return (
    <group ref={ref} visible={an === null}>
      {children}
    </group>
  );
}

// ---------- beton direk modeli ----------

/**
 * Beton çit direği 3D modeli (public/modeller/beton_direk.obj): 2,94 m, gövde 0–2,46 m
 * (alt 12, üst 10 cm), üstte gövdeyle tek döküm konsol (kaş). Model, plandaki direk boyuna ve
 * kaş açısı / boyuna göre uyarlanır: gövde dikeyde ölçeklenir, konsol kaş vektörüne kaydırılır;
 * böylece üst teller konsolun üstündeki yerlerine oturur.
 */
// kolSapOrta / kolSapYari: konsol köşelerinin kol ekseninden yatay sapmasının ortası ve yarısı (modelden ölçüldü)
const BETON_MODEL = { govdeUst: 2.46, kolDy: 0.46, kolEgim: 0.42 / 0.46, kesit: 0.1, kolSapOrta: -0.0064, kolSapYari: 0.0798 };
let betonModelSoz: Promise<THREE.BufferGeometry> | null = null;
function betonModeliYukle() {
  betonModelSoz ??= import("three/examples/jsm/loaders/OBJLoader.js").then(({ OBJLoader }) =>
    new OBJLoader().loadAsync(varlik("/modeller/beton_direk.obj")).then((g) => {
      const parcalar: THREE.BufferGeometry[] = [];
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) parcalar.push(m.geometry.index ? m.geometry.toNonIndexed() : m.geometry);
      });
      return parcalar.length > 1 ? mergeGeometries(parcalar)! : parcalar[0];
    }),
  );
  return betonModelSoz;
}
function BetonDirekModeli({ h, kasDx, kasDy, k, malzeme, aci = 0, ayna = false }: { h: number; kasDx: number; kasDy: number; k: number; malzeme: THREE.Material; aci?: number; ayna?: boolean }) {
  const [ham, setHam] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => void betonModeliYukle().then(setHam), []);
  const geo = useMemo(() => {
    if (!ham) return null;
    const g = ham.clone();
    const p = g.attributes.position as THREE.BufferAttribute;
    const M = BETON_MODEL;
    const sk = k / M.kesit; // kesit ölçeği
    const sy = h / M.govdeUst;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y <= M.govdeUst) p.setXYZ(i, x * sk, y * sy, z * sk);
      else {
        // konsol: eksen çizgisinden sapma korunur, eksen plandaki kaş vektörüne taşınır
        // konsol kesiti direk kesitiyle aynı (10x10 direkte kaş da 10x10): modeldeki kol
        // genişliği -1..1'e indirgenip kola dik doğrultuda k/2'ye ölçeklenir
        const u = (y - M.govdeUst) / M.kolDy; // 0..1 konsol boyunca
        const sap = (x - u * M.kolDy * M.kolEgim - M.kolSapOrta) / M.kolSapYari;
        const L = Math.hypot(kasDx, kasDy);
        const [ax, ay] = L > 1e-6 ? [kasDx / L, kasDy / L] : [0, 1];
        p.setXYZ(i, u * kasDx + sap * (k / 2) * ay, h + u * kasDy - sap * (k / 2) * ax, z * sk);
      }
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [ham, h, kasDx, kasDy, k]);
  useAt(geo ?? undefined);
  if (!geo) return null;
  return <mesh geometry={geo} material={malzeme} rotation={[0, aci, 0]} scale={[ayna ? -1 : 1, 1, 1]} castShadow receiveShadow />;
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

/** Kaş kollarının direğin yerel eksenindeki yönleri (+x: kenarın dışı, z: çit doğrultusu). */
function kasYonleri(d: Direk, kv: { dx: number; dy: number }, vKas: boolean) {
  const n = d.dis;
  const out = [new THREE.Vector3(kv.dx, kv.dy, 0)];
  if (d.dis2) {
    // ikinci kenarın dış yönü, direğin yerel eksenine çevrilir
    const lx = d.dis2[0] * n[0] + d.dis2[1] * n[1];
    const lz = -d.dis2[0] * n[1] + d.dis2[1] * n[0];
    out.push(new THREE.Vector3(lx * kv.dx, kv.dy, lz * kv.dx));
  }
  if (vKas) out.push(new THREE.Vector3(-kv.dx, kv.dy, 0));
  return out;
}

function Direkler({
  direkler,
  t,
  poli,
  baslangic,
  animasyon = true,
  dubel,
  gecikmeler,
}: {
  direkler: Direk[];
  t: Tasarim;
  poli: [number, number][] | null;
  baslangic: React.RefObject<number>;
  animasyon?: boolean;
  dubel: { direk: number; payanda: number };
  /** açılışta her direğin düşmeye başlayacağı an (sn) */
  gecikmeler?: number[];
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

  // Açılışta direkler sırayla tepeden düşüp zemine oturur (hafif sekme)
  const refler = useRef<(THREE.Group | null)[]>([]);
  const bitti = useRef(!animasyon);
  useFrame(() => {
    if (bitti.current) return;
    const s = (performance.now() - baslangic.current) / 1000;
    let hepsi = true;
    refler.current.forEach((g, i) => {
      if (!g) return;
      const k = THREE.MathUtils.clamp((s - (gecikmeler?.[i] ?? DUSUS.direkGecikme)) / DUSUS.direkSure, 0, 1);
      if (k < 1) hepsi = false;
      g.position.y = (1 - sekme(k)) * DUSUS.yukseklik;
      g.visible = k > 0; // düşmeye başlamayan direk gökyüzünde görünmesin
    });
    if (hepsi) bitti.current = true;
  });

  const kas = kasUzunlugu(t);
  const vKas = t.direk.kasTipi === "v";
  const kv = kasVektoru(t);
  const kasDy = kas * kv.dy;
  const kasDx = kas * kv.dx;
  const temelTabla = t.zemin === "toprak" && t.ekstra.temel; // toprakta dökülen beton temel görünür
  const tablaMalzeme = useMemo(() => new THREE.MeshStandardMaterial({ color: "#7f8489", roughness: 1, metalness: 0 }), []);
  useAt(tablaMalzeme);
  const beton = t.zemin !== "toprak"; // beton zemin ve duvar üstü: flanş + dübel
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
          <group key={i} ref={(el) => void (refler.current[i] = el)} position={[0, bitti.current ? 0 : DUSUS.yukseklik, 0]} visible={bitti.current}>
            <group
              position={[d.p[0], d.p[1], d.p[2]]}
              // Direk gövdesi ve flanş plakası bulunduğu kenara paralel döner (kenar dış yönüne göre)
              rotation={[0, -Math.atan2(n[1], n[0]), 0]}
            >
              {betonDirek ? (
                <>
                  {/* beton direk: gerçek model, konsol (kaş) gövdeyle tek parça; kaş yoksa konsol gövde tepesine katlanır */}
                  <BetonDirekModeli h={h} kasDx={kas > 0 ? kasDx : 0} kasDy={kas > 0 ? kasDy : 0} k={k} malzeme={malzeme} />
                  {kas > 0 && vKas && <BetonDirekModeli h={h} kasDx={kasDx} kasDy={kasDy} k={k} malzeme={malzeme} ayna />}
                  {kas > 0 && d.dis2 && (
                    <BetonDirekModeli
                      h={h}
                      kasDx={kasDx}
                      kasDy={kasDy}
                      k={k}
                      malzeme={malzeme}
                      aci={Math.atan2(-(-d.dis2[0] * n[1] + d.dis2[1] * n[0]), d.dis2[0] * n[0] + d.dis2[1] * n[1])}
                    />
                  )}
                </>
              ) : (
                <mesh geometry={g ? geoGuclu : geoAra} material={malzeme} position={[0, h / 2, 0]} castShadow receiveShadow />
              )}
              {/* Demir direkte tepe kapağı (beton direkte yok); kaşlıda kapak kaş ucunda */}
              {t.direk.tip !== "beton" && !(kas > 0) && (
                <mesh material={kapakMalzeme} position={[0, h + 0.008, 0]}>
                  {boru ? <cylinderGeometry args={[k * 0.58, k * 0.58, 0.016, 16]} /> : <boxGeometry args={[k * 1.15, 0.016, k * 1.15]} />}
                </mesh>
              )}
              {/* Demir direk kaş kolları: direkle aynı profil, gönye birleşim (yerel eksende: +x dış) */}
              {kas > 0 && !betonDirek &&
                kasYonleri(d, kv, vKas).map((y, j) => <KasKolu key={j} yon={y} L={kas} k={k} h={h} boru={boru} malzeme={malzeme} kapak={kapakMalzeme} />)}
              {/* Flanş yalnız beton zeminde ve duvar üstünde */}
              {beton && <Flans k={k} malzeme={malzeme} civata dubel={dubel.direk} />}
            </group>
            {temelTabla && (
              <mesh material={tablaMalzeme} position={[d.p[0], d.p[1] + 0.012, d.p[2]]} receiveShadow>
                <cylinderGeometry args={[k * 1.5, k * 1.7, 0.025, 10]} />
              </mesh>
            )}
            {/* Profil + eğik kaş: tek köşe direğinden ikinci kenarın dışına ikinci kaş */}
            {/* V kaş: ikinci kol içe doğru */}
            {d.payanda.map((p, j) => (
              <group key={j}>
                {betonDirek ? (
                  <Cubuk
                    a={new THREE.Vector3(d.p[0], d.p[1] + h * 0.72, d.p[2])}
                    b={new THREE.Vector3(d.p[0] + p[0] * h * 0.6, d.p[1], d.p[2] + p[1] * h * 0.6)}
                    k={ara * 0.9}
                    malzeme={malzeme}
                  />
                ) : (
                  // direğin yüzüne (eksenden k/2 dışarı) oturur
                  <Payanda
                    ust={new THREE.Vector3(d.p[0] + p[0] * (k / 2), d.p[1] + h * 0.72, d.p[2] + p[1] * (k / 2))}
                    alt={new THREE.Vector3(d.p[0] + p[0] * h * 0.6, d.p[1], d.p[2] + p[1] * h * 0.6)}
                    k={ara}
                    boru={boru}
                    malzeme={malzeme}
                  />
                )}
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
  direkK,
}: {
  kosular: Kosu[];
  aralik: number;
  h: number;
  gozMm: number;
  kalinlikMm: number;
  renk: string;
  poli: [number, number][] | null;
  /** direk kesiti, m: panel direklerin dış yüzüne monte edilir */
  direkK: number;
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
      // Panel arazinin dış tarafında, direklerin dış yüzüne yaslı (direk ekseninden yarım kesit + tel)
      const disYuz = direkK / 2 + r + 0.004;
      const nokta = (t: number, y: number, z = 0) => a.clone().lerp(b, t).add(new THREE.Vector3(0, y, 0)).addScaledVector(dis, disYuz + z);
      for (let j = 0; j < adet; j++) {
        const [t0, t1] = [j / adet, (j + 1) / adet];
        const genislik = (t1 - t0) * yatay;
        const pay = 0.012 / yatay; // komşu panelle arada küçük boşluk (direk önünden geçer)
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
        // Plastik klipsler: her direğin dış yüzünde, panel yatay tellerini direğe tutturur
        // (altta, bombe hizalarında ve üstte); iki panelin birleştiği yerde tek klips
        for (const t of j === 0 ? [t0, t1] : [t1])
          for (const y of [alt + 0.04, ...bombeler.map((yb) => yb + yari), h - 0.06]) {
            const p = nokta(t, y, 0.008); // klips derinliğinin yarısı kadar dışta
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
        // Plastik klips (ürün ölçüsü): 2,5 cm genişlik (çit boyunca) × 5 cm yükseklik × 2 cm derinlik, koyu yeşil
        geometri={() => new THREE.BoxGeometry(0.02, 0.05, 0.025)}
        malzeme={() => new THREE.MeshStandardMaterial({ color: "#1d3a2a", metalness: 0, roughness: 0.6 })}
      />
    </>
  );
}

/** Bir koşunun yatay yönü ve dış normali. */
function kosuYonu(k: Kosu, poli: [number, number][] | null) {
  const L = Math.hypot(k.b[0] - k.a[0], k.b[2] - k.a[2]) || 1;
  const yon: [number, number] = [(k.b[0] - k.a[0]) / L, (k.b[2] - k.a[2]) / L];
  const n = disNormal([(k.a[0] + k.b[0]) / 2, 0, (k.a[2] + k.b[2]) / 2], yon, poli);
  return { yon, n };
}

/**
 * Köşeler: bir koşunun bittiği noktada sonraki koşu başlıyorsa (kapalı arazide son → ilk dahil)
 * o nokta köşedir. Üst tel / jiletli bu köşelerde iki kenarın kaş kolları arasından dolaştırılır.
 */
function kosuKoseleri(kosular: Kosu[], poli: [number, number][] | null) {
  const out: { p: THREE.Vector3; n1: [number, number]; n2: [number, number]; y1: [number, number]; y2: [number, number] }[] = [];
  const ayni = (a: Nokta, b: Nokta) => Math.hypot(a[0] - b[0], a[2] - b[2]) < 1e-3;
  for (let i = 0; i < kosular.length; i++)
    for (let j = 0; j < kosular.length; j++) {
      if (i === j || !ayni(kosular[i].b, kosular[j].a)) continue;
      const A = kosuYonu(kosular[i], poli);
      const B = kosuYonu(kosular[j], poli);
      if (Math.abs(A.yon[0] * B.yon[0] + A.yon[1] * B.yon[1]) > 0.999) continue; // düz devam, köşe değil
      out.push({ p: V(kosular[i].b), n1: A.n, n2: B.n, y1: A.yon, y2: B.yon });
    }
  return out;
}

/** Düzlemsel jiletli: çit düzleminde, iç içe geçen yassı halkalardan bir bant (baklava görünümü). */
/**
 * Düzlemsel jiletli tel: çit boyunca dizilmiş düz halkalar. Eğik kaşta halkalar kaş koluyla
 * aynı açıda dışa yatar ve kola teğet oturur; aksi halde çitin tepesinde dik durur.
 */
function Duzlemsel({ kosular, y, egik, poli, cap, direkK, parca = "hepsi", tumKosular = kosular }: { kosular: Kosu[]; y: number; egik: { dx: number; dy: number } | null; poli: [number, number][] | null; cap: number; direkK: number; parca?: "hepsi" | "kosu" | "kose"; tumKosular?: Kosu[] }) {
  const R = cap / 200; // cm çap → m yarıçap
  const halkalar = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
    const m = new THREE.Matrix4();
    for (const k of parca === "kose" ? [] : kosular) {
      const a = V(k.a);
      const b = V(k.b);
      const L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      const yon = new THREE.Vector3((b.x - a.x) / L, 0, (b.z - a.z) / L);
      // Halka düzlemi: çit doğrultusu + yukarı (dik) ya da kaş kolu yönü (eğik, dışa)
      const n = disNormal([(k.a[0] + k.b[0]) / 2, 0, (k.a[2] + k.b[2]) / 2], [yon.x, yon.z], poli);
      const kol = egik ? new THREE.Vector3(n[0] * egik.dx, egik.dy, n[1] * egik.dx).normalize() : new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(yon, kol).normalize();
      // Halka direğin (ve kaş kolunun) iç yüzüne yaslanır: direk ekseninden içe yarım direk kalınlığı kadar
      const ice = normal.x * n[0] + normal.z * n[1] > 0 ? normal.clone().negate() : normal.clone();
      const kaydir = direkK / 2 + 0.012;
      const q = new THREE.Quaternion().setFromRotationMatrix(m.makeBasis(yon, kol, normal));
      const adet = Math.max(1, Math.round(L / R));
      for (let i = 0; i <= adet; i++) {
        const p = a.clone().lerp(b, i / adet);
        p.y += y;
        p.addScaledVector(kol, R); // halka kola teğet: alt ucu direk tepesinde, kol boyunca uzanır
        p.addScaledVector(ice, kaydir);
        out.push({ p, q });
      }
    }
    // Köşelerde iki kenarın halka bantları arası açık kalmasın: dış normal n1→n2 arasında
    // dönen ara halkalar (köşe direğinin kaş kolları arasındaki kama doldurulur)
    for (const c of parca === "kosu" ? [] : kosuKoseleri(tumKosular, poli)) {
      const adim = 4;
      for (let s = 1; s < adim; s++) {
        const f = s / adim;
        const nx = c.n1[0] * (1 - f) + c.n2[0] * f, nz = c.n1[1] * (1 - f) + c.n2[1] * f;
        const nl = Math.hypot(nx, nz) || 1;
        const n: [number, number] = [nx / nl, nz / nl];
        // halka doğrultusu: normale dik, köşede dönme yönünde
        const yx = c.y1[0] * (1 - f) + c.y2[0] * f, yz = c.y1[1] * (1 - f) + c.y2[1] * f;
        const yl = Math.hypot(yx, yz) || 1;
        const yon = new THREE.Vector3(yx / yl, 0, yz / yl);
        const kol = egik ? new THREE.Vector3(n[0] * egik.dx, egik.dy, n[1] * egik.dx).normalize() : new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(yon, kol).normalize();
        const ice = normal.x * n[0] + normal.z * n[1] > 0 ? normal.clone().negate() : normal.clone();
        const q = new THREE.Quaternion().setFromRotationMatrix(m.makeBasis(yon, kol, normal));
        const p = c.p.clone();
        p.y += y;
        p.addScaledVector(kol, R);
        p.addScaledVector(ice, direkK / 2 + 0.012);
        out.push({ p, q });
      }
    }
    return out;
  }, [kosular, y, egik, poli, R, direkK, parca, tumKosular]);
  return (
    <Tekrarli
      key={R} // çap değişince halka geometrisi yeniden kurulsun
      yerler={halkalar}
      geometri={() => new THREE.TorusGeometry(R, 0.007, 4, 36)}
      malzeme={() => new THREE.MeshStandardMaterial({ color: "#d4dbe4", metalness: 0.9, roughness: 0.25 })}
    />
  );
}

/** Jiletli spiral: çit boyunca dizilmiş eğik halkalar. */
function Jiletli({ kosular, y, cap, poli, parca = "hepsi", tumKosular = kosular }: { kosular: Kosu[]; y: number; cap: number; poli: [number, number][] | null; parca?: "hepsi" | "kosu" | "kose"; tumKosular?: Kosu[] }) {
  const R = cap / 200; // cm çap → m yarıçap
  const halkalar = useMemo(() => {
    const out: { p: THREE.Vector3; q: THREE.Euler }[] = [];
    for (const k of parca === "kose" ? [] : kosular) {
      const a = V(k.a);
      const b = V(k.b);
      const aci = Math.atan2(b.x - a.x, b.z - a.z);
      const n = Math.max(2, Math.floor(a.distanceTo(b) / 0.12));
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        p.y += y + R;
        out.push({ p, q: new THREE.Euler(i % 2 ? 0.35 : -0.35, aci, 0, "YXZ") });
      }
    }
    // köşede spiral dönerek devam eder: iki kenar açısı arasında ara halkalar
    for (const c of parca === "kosu" ? [] : kosuKoseleri(tumKosular, poli)) {
      const a1 = Math.atan2(c.y1[0], c.y1[1]);
      let a2 = Math.atan2(c.y2[0], c.y2[1]);
      if (a2 - a1 > Math.PI) a2 -= 2 * Math.PI;
      if (a1 - a2 > Math.PI) a2 += 2 * Math.PI;
      for (let s = 1; s < 4; s++) {
        const p = c.p.clone();
        p.y += y + R;
        out.push({ p, q: new THREE.Euler(s % 2 ? 0.35 : -0.35, a1 + ((a2 - a1) * s) / 4, 0, "YXZ") });
      }
    }
    return out;
  }, [kosular, y, R, poli, parca, tumKosular]);
  return (
    <Tekrarli
      key={R}
      yerler={halkalar}
      geometri={() => new THREE.TorusGeometry(R, 0.006, 4, 28)}
      malzeme={() => new THREE.MeshStandardMaterial({ color: "#c9d2dc", metalness: 0.9, roughness: 0.25 })}
    />
  );
}

// ---------- kapılar ----------

/**
 * Kapı babaları: kapının iki yanında, çit direklerinden kalın demir kolonlar (ör. 60x60 yaya,
 * 80x80 araç). Kapı üstünü aşar; üstte kapak, flanşlı zeminde ayak plakası.
 */
function Babalar({ babalar, h, kesitler, renk, flansli }: { babalar: Sonuc["babalar"]; h: number; kesitler: { yaya: number; arac: number }; renk: string; flansli: boolean }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: renk, metalness: 0.45, roughness: 0.45 }), [renk]);
  const kapak = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1b2027", roughness: 0.7 }), []);
  useAt(mat, kapak);
  const boy = h + 0.25;
  return (
    <>
      {babalar.map((b, i) => {
        const k = kesitler[b.tur];
        return (
          <group key={i} position={[b.p[0], b.p[1], b.p[2]]}>
            <mesh material={mat} position={[0, boy / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[k, boy, k]} />
            </mesh>
            <mesh material={kapak} position={[0, boy + 0.01, 0]}>
              <boxGeometry args={[k + 0.012, 0.02, k + 0.012]} />
            </mesh>
            {flansli && (
              <mesh material={mat} position={[0, 0.008, 0]} castShadow receiveShadow>
                <boxGeometry args={[k * 2.6, 0.016, k * 2.6]} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function Kapilar({ kapilar, h, telMalzeme, babaYari }: { kapilar: Sonuc["kapilar"]; h: number; telMalzeme: THREE.Material; babaYari?: { yaya: number; arac: number } }) {
  const cerceve = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b3038", metalness: 0.7, roughness: 0.35 }), []);
  return (
    <>
      {kapilar.map((k, i) => {
        let a = V(k.a);
        let b = V(k.b);
        // Kanat babaların arasına oturur: iki uçtan baba yarı kalınlığı + boşluk kadar içeri
        if (babaYari) {
          const d = b.clone().sub(a);
          const L = d.length();
          const pay = Math.min(babaYari[k.kapi.tur] + 0.015, L * 0.2);
          d.normalize();
          a = a.clone().addScaledVector(d, pay);
          b = b.clone().addScaledVector(d, -pay);
        }
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

const NORMAL_FOV = 42;
const DAR_FOV = 14; // üstten plan bakışı

function KameraRig({
  boyut,
  anahtar,
  gorunum,
  kose,
  intro = 0,
}: {
  boyut: number;
  anahtar: string;
  gorunum: GorunumIstegi;
  kose: { pos: Nokta3; bak: Nokta3 } | null;
  /** değişince açılış çekimi yeniden: uzak izometrikten köşe görünümüne yavaşça yaklaşır */
  intro?: number;
}) {
  const { camera, controls, size } = useThree() as unknown as {
    size: { width: number; height: number };
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null;
  };
  const hedef = useRef<{ pos: THREE.Vector3; bak: THREE.Vector3; fov: number; hiz?: number } | null>(null);
  const ilk = useRef(true);
  const uzakKonum = () => {
    const S = Math.max(boyut, 6) * Math.max(1, 1.15 / (size.width / size.height));
    return new THREE.Vector3(S * 1.6, S * 1.8 + 30, S * 2.4);
  };

  useEffect(() => {
    // Dar (telefon) ekranda araziyi sığdırmak için geri çekil
    const S = Math.max(boyut, 6) * Math.max(1, 1.15 / (size.width / size.height));
    if (gorunum.tur === "yon" && gorunum.yon) {
      // Küp: alanın merkezine bak, tüm alan ekrana sığacak uzaklıktan o yönden
      const yon = new THREE.Vector3(...gorunum.yon).normalize();
      yon.y = Math.max(yon.y, 0.02); // zeminin altına inme
      // Tam üstten: kenarlar eksenlere hizalı (kuzey yukarıda) ve dar açılı, uzaktan çekim;
      // böylece çit duvarları yamuk görünmez, plan gibi düz durur
      const ust = yon.y > 0.98;
      if (ust) yon.set(0, 1, 0.0005);
      const fov = ust ? DAR_FOV : NORMAL_FOV;
      const uzaklik = (S * 0.62) / Math.tan(THREE.MathUtils.degToRad(fov / 2)) + 3;
      hedef.current = { pos: yon.normalize().multiplyScalar(uzaklik), bak: new THREE.Vector3(0, 0, 0), fov };
    } else
      hedef.current =
        gorunum.tur === "kose" && kose
          ? { pos: new THREE.Vector3(...kose.pos), bak: new THREE.Vector3(...kose.bak), fov: NORMAL_FOV }
          : { pos: new THREE.Vector3(S * 0.45, S * 0.3 + 2.5, S * 0.7 + 3), bak: new THREE.Vector3(0, 0, 0), fov: NORMAL_FOV };
    if (ilk.current) {
      camera.position.copy(uzakKonum());
      if (hedef.current) hedef.current.hiz = 1.3; // açılış: yavaş, sinematik yaklaşma
      ilk.current = false;
    }
  }, [anahtar, boyut, camera, size.width, size.height, gorunum.tur, gorunum.n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Soru-cevaptan dönüşte açılış çekimi yeniden oynar
  useEffect(() => {
    if (!intro) return;
    camera.position.copy(uzakKonum());
    hedef.current = kose
      ? { pos: new THREE.Vector3(...kose.pos), bak: new THREE.Vector3(...kose.bak), fov: NORMAL_FOV, hiz: 1.3 }
      : { pos: new THREE.Vector3(boyut * 0.45, boyut * 0.3 + 2.5, boyut * 0.7 + 3), bak: new THREE.Vector3(0, 0, 0), fov: NORMAL_FOV, hiz: 1.3 };
  }, [intro]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!controls) return;
    const dur = () => (hedef.current = null); // kullanıcı tutunca animasyon bırakır
    controls.addEventListener("start", dur);
    return () => controls.removeEventListener("start", dur);
  }, [controls]);

  useFrame((_, dt) => {
    const h = hedef.current;
    if (!h) return;
    camera.position.lerp(h.pos, 1 - Math.exp(-dt * (h.hiz ?? 2.4)));
    if (Math.abs(camera.fov - h.fov) > 0.01) {
      camera.fov += (h.fov - camera.fov) * (1 - Math.exp(-dt * 3));
      camera.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.lerp(h.bak, 1 - Math.exp(-dt * (h.hiz ? h.hiz * 1.4 : 3)));
      controls.update();
    } else camera.lookAt(h.bak);
    if (camera.position.distanceTo(h.pos) < 0.03 && (!controls || controls.target.distanceTo(h.bak) < 0.03)) {
      // Son karede tam yerine otur (üstten bakış kayık kalmasın)
      camera.position.copy(h.pos);
      camera.fov = h.fov;
      camera.updateProjectionMatrix();
      if (controls) {
        controls.target.copy(h.bak);
        controls.update();
      }
      hedef.current = null;
    }
  });
  return null;
}

/** Köşe direğine dışarıdan, göz hizasının biraz üstünden yakın çekim; birkaç kare sonra PNG verir. */
function DetayKamera({
  noktalar,
  merkez,
  h,
  taban,
  onHazir,
}: {
  noktalar: [number, number][];
  merkez: readonly [number, number];
  h: number;
  /** duvar üstü montajda duvar yüksekliği; çit bunun üstünde başlar */
  taban: number;
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
    // Yakın çekim, köşe direği tam ortada: zeminden (duvar varsa duvar dibinden) kaş ucuna kadar
    // tüm yükseklik PDF kutusuna (DETAY_ORAN, ortadan kırpılır) %10 payla sığar
    const ust = taban + h + 0.45; // kaş / jiletli payı
    const hedef = new THREE.Vector3(kose.x, ust / 2, kose.y);
    camera.fov = 45;
    const tuvalOran = gl.domElement.width / Math.max(1, gl.domElement.height);
    // kırpma sonrası kalan dikey görüş: tuval kutudan darsa üst-alt kırpılır
    const yariDikey = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, tuvalOran / DETAY_ORAN));
    const D = ((ust / 2) * 1.1) / Math.tan(yariDikey) + 0.3;
    // dışarıdan, hafif yukarıdan bakış (yükselti ~12°)
    const yatay = D * Math.cos(0.21);
    camera.position.set(kose.x - ic.x * yatay, ust / 2 + D * Math.sin(0.21), kose.y - ic.y * yatay);
    camera.updateProjectionMatrix();
    camera.lookAt(hedef);
    if (controls) {
      controls.target.copy(hedef);
      controls.update();
    }
  }, [noktalar, merkez, h, taban, camera, controls, gl]);

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

// ---------- beton duvar (duvar üstü montaj) ----------

/** Çit hatları boyunca mevcut beton duvar; çit bunun üstüne oturur. */
function BetonDuvar({ kosular, h }: { kosular: Kosu[]; h: number }) {
  const malzeme = useMemo(() => {
    const doku = betonDokusu().clone();
    doku.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: doku, color: "#d9dde2", roughness: 0.95 });
  }, []);
  const kapak = useMemo(() => new THREE.MeshStandardMaterial({ color: "#aeb4bb", roughness: 0.9 }), []);
  useAt(malzeme, kapak);
  const K = 0.22; // duvar kalınlığı, m
  return (
    <>
      {kosular.map((k, i) => {
        const dx = k.b[0] - k.a[0];
        const dz = k.b[2] - k.a[2];
        const L = Math.hypot(dx, dz);
        if (L < 0.01) return null;
        const y0 = Math.min(k.a[1], k.b[1]);
        const aci = -Math.atan2(dz, dx);
        return (
          <group key={i} position={[(k.a[0] + k.b[0]) / 2, y0, (k.a[2] + k.b[2]) / 2]} rotation={[0, aci, 0]}>
            <mesh material={malzeme} position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[L + K, h, K]} />
            </mesh>
            {/* Duvar başlığı: biraz taşkın üst kapak */}
            <mesh material={kapak} position={[0, h + 0.02, 0]} castShadow receiveShadow>
              <boxGeometry args={[L + K + 0.04, 0.04, K + 0.06]} />
            </mesh>
          </group>
        );
      })}
    </>
  );
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
  /** Elle çizilmiş arazide köşe sürüklenince yeni konumu (m, çizim koordinatı) */
  onNoktaTasi?: (i: number, p: [number, number]) => void;
  /** Beton zeminde dübel adetleri (Ayarlar); yakın çekimde başları çizilir */
  dubel?: { direk: number; payanda: number };
  /** Değişince açılış animasyonu (çitlerin tepeden düşmesi) yeniden oynar */
  animasyonAnahtari?: number;
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

/**
 * Üstten bakışta elle çizilmiş arazinin köşe tutamaçları: sürükleyince köşe zeminde taşınır.
 * Sürüklerken kamera döndürme kapanır; konum 10 cm'ye yuvarlanır.
 */
function KoseTutamaclari({
  noktalar,
  merkez,
  r,
  y,
  basla,
  bitir,
  tasi,
}: {
  noktalar: [number, number][];
  merkez: readonly [number, number];
  r: number;
  y: number;
  basla: () => void;
  bitir: () => void;
  tasi: (i: number, p: [number, number]) => void;
}) {
  const { controls } = useThree() as unknown as { controls: { enabled: boolean } | null };
  const [tutulan, setTutulan] = useState<number | null>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);
  const zemin = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), [y]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    document.body.style.cursor = tutulan !== null ? "grabbing" : ustunde !== null ? "grab" : "";
    return () => void (document.body.style.cursor = "");
  }, [tutulan, ustunde]);

  return (
    <>
      {noktalar.map((p, i) => (
        <mesh
          key={i}
          position={[p[0], y, p[1]]}
          renderOrder={10}
          onPointerOver={(e) => (e.stopPropagation(), setUstunde(i))}
          onPointerOut={() => setUstunde((u) => (u === i ? null : u))}
          onPointerDown={(e) => {
            e.stopPropagation();
            (e.target as unknown as Element).setPointerCapture(e.pointerId);
            if (controls) controls.enabled = false;
            setTutulan(i);
            basla();
          }}
          onPointerMove={(e) => {
            if (tutulan !== i) return;
            e.stopPropagation();
            if (!e.ray.intersectPlane(zemin, v)) return;
            const yuv = (n: number) => Math.round(n * 10) / 10;
            tasi(i, [yuv(v.x + merkez[0]), yuv(v.z + merkez[1])]);
          }}
          onPointerUp={(e) => {
            if (tutulan !== i) return;
            (e.target as unknown as Element).releasePointerCapture(e.pointerId);
            if (controls) controls.enabled = true;
            setTutulan(null);
            bitir();
          }}
        >
          <cylinderGeometry args={[r, r, r * 0.4, 24]} />
          <meshBasicMaterial color={tutulan === i ? "#ffffff" : ustunde === i ? "#ff6b6d" : "#ff2a2d"} toneMapped={false} fog={false} depthTest={false} transparent opacity={0.95} />
        </mesh>
      ))}
    </>
  );
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
  onNoktaTasi,
  animasyonAnahtari: animAnahtar = 0,
}: SahneProps & {
  etiketBildir?: (e: EtiketVeri[]) => void;
  etiketDom?: React.RefObject<Map<number, HTMLElement>>;
  gorunum?: GorunumIstegi;
}) {
  const detay = mod === "detay";
  const baslangic = useRef(performance.now());
  useMemo(() => void (baslangic.current = performance.now()), [animAnahtar]);
  const { noktalar, kapali } = useMemo(() => sekilNoktalari(t), [t]);
  const poli = kapali ? noktalar : detay && noktalar.length >= 3 ? noktalar : null;

  // Sahneyi merkeze al (köşe sürüklenirken merkez ve kamera sabit kalır, yoksa sahne kayar)
  const [sabit, setSabit] = useState<{ merkez: readonly [number, number]; boyut: number } | null>(null);
  const hesaplanan = useMemo(() => {
    if (!noktalar.length) return { merkez: [0, 0] as const, boyut: 20 };
    const xs = noktalar.map((p) => p[0]);
    const zs = noktalar.map((p) => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    return { merkez: [(x0 + x1) / 2, (z0 + z1) / 2] as const, boyut: Math.max(x1 - x0, z1 - z0) };
  }, [noktalar]);
  const { merkez, boyut } = sabit ?? hesaplanan;
  const ustIstendi = gorunum.tur === "yon" && (gorunum.yon?.[1] ?? 0) / Math.hypot(...(gorunum.yon ?? [0, 1, 0])) > 0.98;
  // Kullanıcı kamerayı döndürüp üst görünüşü bozunca köşe noktaları gizlenir (yeniden "Üst" seçilene dek)
  const [ustBozuldu, setUstBozuldu] = useState(false);
  useEffect(() => setUstBozuldu(false), [gorunum.n]);
  const { controls: kontrol } = useThree() as unknown as { controls: { addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null };
  useEffect(() => {
    if (!kontrol || !ustIstendi) return;
    const boz = () => setUstBozuldu(true);
    kontrol.addEventListener("start", boz);
    return () => kontrol.removeEventListener("start", boz);
  }, [kontrol, ustIstendi]);
  const ustten = ustIstendi && !ustBozuldu;

  const yukseklik = useMemo(() => {
    const ys = new Map(sonuc.kenarlar.map((k) => [`${k.bas[0].toFixed(3)},${k.bas[2].toFixed(3)}`, k.bas[1]]));
    return (x: number, z: number) => ys.get(`${x.toFixed(3)},${z.toFixed(3)}`) ?? 0;
  }, [sonuc.kenarlar]);
  const minY = Math.min(0, ...sonuc.kenarlar.map((k) => Math.min(k.bas[1], k.son[1])));

  const tip = t.tel.tip;
  const h = t.tel.yukseklik;
  const duvarH = t.zemin === "duvar" ? t.duvarYukseklik : 0;
  const pvc = t.tel.kaplama === "pvc";
  const hucre = useMemo(() => hucreBoyu(tip, t.tel.goz), [tip, t.tel.goz]);
  const telMalzeme = useMemo(() => {
    if (tip === "dikenli") return null;
    return new THREE.MeshStandardMaterial({
      map: telDokusu(tip, t.tel.goz, t.tel.kalinlik),
      color: pvc ? "#2f9a58" : "#e8eef5",
      emissive: pvc ? "#0d3a1f" : "#3a4656",
      transparent: true,
      alphaTest: 0.15, // gözlerin arası boş kalsın (perde gibi dolmasın)
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
  const kas = kasUzunlugu(t) * kvU.dy; // dikey yükselme
  const kasYatay = kasUzunlugu(t) * kvU.dx;
  const ustHatlar = useMemo(() => {
    const bos = { kosu: sonuc.kosular.map(() => [] as [THREE.Vector3, THREE.Vector3][]), kose: [] as [THREE.Vector3, THREE.Vector3][] };
    if (t.ekstra.ustTel !== "dikenli") return bos;
    const kosuHat = bos.kosu;
    const koseHat = bos.kose;
    sonuc.kosular.forEach((k, ki) => {
      const out = kosuHat[ki];
      const L = Math.hypot(k.b[0] - k.a[0], k.b[2] - k.a[2]) || 1;
      const yon: [number, number] = [(k.b[0] - k.a[0]) / L, (k.b[2] - k.a[2]) / L];
      const orta: Nokta = [(k.a[0] + k.b[0]) / 2, 0, (k.a[2] + k.b[2]) / 2];
      const n = disNormal(orta, yon, poli);
      for (let r = 0; r < t.ekstra.ustSira; r++) {
        // kaşlıda teller kol üstündeki deliklerden geçer (3 delik); kaşsızda direk üstünde
        const f = kas || kasYatay ? KAS_DELIKLERI[Math.min(r, KAS_DELIKLERI.length - 1)] : t.ekstra.ustSira === 1 ? 1 : (r + 1) / t.ekstra.ustSira;
        const d = kasYatay * f;
        const y = h + (kas ? kas * f : 0.08 + 0.12 * (r + 1));
        // V kaşta aynı sıra iki kola da çekilir (yön: dış ve iç)
        for (const yan of t.direk.kasli && t.direk.kasTipi === "v" ? [1, -1] : [1])
          out.push([
            new THREE.Vector3(k.a[0] + n[0] * d * yan, k.a[1] + y, k.a[2] + n[1] * d * yan),
            new THREE.Vector3(k.b[0] + n[0] * d * yan, k.b[1] + y, k.b[2] + n[1] * d * yan),
          ]);
      }
    });
    // Köşede tel bir kenarın kaş kolundan diğerininkine çekilir: köşe açık kalmaz
    for (const c of kosuKoseleri(sonuc.kosular, poli))
      for (let r = 0; r < t.ekstra.ustSira; r++) {
        const f = kas || kasYatay ? KAS_DELIKLERI[Math.min(r, KAS_DELIKLERI.length - 1)] : t.ekstra.ustSira === 1 ? 1 : (r + 1) / t.ekstra.ustSira;
        const d = kasYatay * f;
        const y = h + (kas ? kas * f : 0.08 + 0.12 * (r + 1));
        if (d < 1e-3) continue; // kaşsız / düz kaşta teller zaten köşede buluşur
        for (const yan of t.direk.kasli && t.direk.kasTipi === "v" ? [1, -1] : [1])
          koseHat.push([
            new THREE.Vector3(c.p.x + c.n1[0] * d * yan, c.p.y + y, c.p.z + c.n1[1] * d * yan),
            new THREE.Vector3(c.p.x + c.n2[0] * d * yan, c.p.y + y, c.p.z + c.n2[1] * d * yan),
          ]);
      }
    return bos;
  }, [sonuc.kosular, t.ekstra.ustTel, t.ekstra.ustSira, t.direk.kasli, t.direk.kasTipi, kas, kasYatay, h, poli]);

  const anaDikenli = useMemo(() => {
    // koşu başına hatlar (açılışta her koşu köşeden serilir)
    return sonuc.kosular.map((k) => {
      if (tip !== "dikenli") return [] as [THREE.Vector3, THREE.Vector3][];
      const out: [THREE.Vector3, THREE.Vector3][] = [];
      for (let r = 0; r < t.tel.sira; r++) {
        const y = 0.2 + ((h - 0.2) * r) / Math.max(1, t.tel.sira - 1);
        out.push([new THREE.Vector3(k.a[0], k.a[1] + y, k.a[2]), new THREE.Vector3(k.b[0], k.b[1] + y, k.b[2])]);
      }
      return out;
    });
  }, [tip, sonuc.kosular, t.tel.sira, h]);

  // Açılış animasyonu: görünüm köşesinden (ön-sağ köşe; düz hatta ilk uç) çevre boyunca mesafe
  const acilis = useMemo(() => {
    let bas = 0;
    if (kapali) noktalar.forEach((p, i) => p[0] + p[1] > noktalar[bas][0] + noktalar[bas][1] && (bas = i));
    const { olc, enUzak } = noktalar.length >= 2 ? cevreMesafesi(noktalar as [number, number][], kapali, bas) : { olc: () => 0, enUzak: 1 };
    const dalgaHiz = Math.max(enUzak / DUSUS.dalgaSuresi, 4);
    return {
      olc,
      telHiz: Math.max(enUzak / DUSUS.telSuresi, 4),
      telGecikme: detay ? null : DUSUS.direkGecikme + DUSUS.telGecikme,
      direkGecikmeleri: detay ? undefined : sonuc.direkler.map((d) => DUSUS.direkGecikme + olc(d.p[0], d.p[2]) / dalgaHiz),
    };
  }, [noktalar, kapali, detay, sonuc.direkler]);
  // köşede birleşen koşu çiftleri (köşe parçaları için)
  const koseCiftleri = useMemo(() => {
    const out: [number, number][] = [];
    const K = sonuc.kosular;
    for (let a = 0; a < K.length; a++)
      for (let b = 0; b < K.length; b++)
        if (a !== b && Math.hypot(K[a].b[0] - K[b].a[0], K[a].b[2] - K[b].a[2]) < 1e-3) out.push([a, b]);
    return out;
  }, [sonuc.kosular]);

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
      {!detay && !ustIstendi && <fog attach="fog" args={[renk.gok, S * 2.2, S * 6]} />}
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
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
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
        {!detay && ustten && t.sekil === "serbest" && onNoktaTasi && (
          <KoseTutamaclari
            noktalar={t.serbest.noktalar}
            merkez={merkez}
            r={Math.max(0.4, boyut * 0.025)}
            y={minY + 0.05}
            basla={() => setSabit({ merkez, boyut })}
            bitir={() => setSabit(null)}
            tasi={onNoktaTasi}
          />
        )}
        {kapali && poli && <Arsa poli={poli} yukseklik={yukseklik} beton={t.zemin === "beton"} />}

        {duvarH > 0 && <BetonDuvar kosular={sonuc.kosular} h={duvarH} />}
        {/* Duvar üstü montajda çit duvarın tepesine oturur */}
        <group position={[0, duvarH > 0 ? duvarH + 0.04 : 0, 0]}>
        {sonuc.kosular.map((k, i) => (
          <Seril key={`s${animAnahtar}-${i}`} kosu={k} olc={acilis.olc} hiz={acilis.telHiz} baslangic={baslangic} gecikme={acilis.telGecikme}>
            {tip === "panel" ? (
              <PanelCit
                kosular={[k]}
                aralik={t.direk.aralik}
                h={h}
                gozMm={t.tel.goz}
                kalinlikMm={t.tel.kalinlik}
                renk={pvc ? "#1d6b45" : "#c9d1db"}
                poli={poli}
                direkK={kesit(t.direk.olcu)}
              />
            ) : (
              telMalzeme && <TelYuzeyi kosu={k} alt={0.06} h={h - 0.02} malzeme={telMalzeme} hucre={hucre} />
            )}
            {gergiSira.length > 0 && <YatayTeller kosular={[k]} yukseklikler={gergiSira} renk={pvc ? "#2f9a58" : "#aeb8c4"} />}
            {anaDikenli[i]?.length > 0 && <DikenliTeller hatlar={anaDikenli[i]} />}
            {ustHatlar.kosu[i]?.length > 0 && <DikenliTeller hatlar={ustHatlar.kosu[i]} />}
            {t.ekstra.ustTel === "jiletli" && tip !== "dikenli" && <Jiletli kosular={[k]} parca="kosu" y={h + 0.08 + kas * 0.5} cap={t.ekstra.jiletliCap} poli={poli} />}
            {t.ekstra.ustTel === "duzlemsel" && tip !== "dikenli" && (
              <Duzlemsel
                kosular={[k]}
                parca="kosu"
                y={h + 0.08}
                egik={t.direk.kasli && t.direk.kasTipi === "egik" ? kasVektoru(t) : null}
                cap={t.ekstra.duzlemselCap}
                direkK={kesit(t.direk.olcu)}
                poli={poli}
              />
            )}
          </Seril>
        ))}
        {/* Köşe parçaları (köşede dönen jiletli halkalar, kaş kolları arası tel): serilme cephesi köşeye varınca belirir */}
        {koseCiftleri.map(([a, b], n) => (
          <Belir key={`k${animAnahtar}-${n}`} baslangic={baslangic} an={acilis.telGecikme === null ? null : acilis.telGecikme + acilis.olc(sonuc.kosular[a].b[0], sonuc.kosular[a].b[2]) / acilis.telHiz}>
            {t.ekstra.ustTel === "jiletli" && tip !== "dikenli" && <Jiletli kosular={[]} tumKosular={[sonuc.kosular[a], sonuc.kosular[b]]} parca="kose" y={h + 0.08 + kas * 0.5} cap={t.ekstra.jiletliCap} poli={poli} />}
            {t.ekstra.ustTel === "duzlemsel" && tip !== "dikenli" && (
              <Duzlemsel
                kosular={[]}
                tumKosular={[sonuc.kosular[a], sonuc.kosular[b]]}
                parca="kose"
                y={h + 0.08}
                egik={t.direk.kasli && t.direk.kasTipi === "egik" ? kasVektoru(t) : null}
                cap={t.ekstra.duzlemselCap}
                direkK={kesit(t.direk.olcu)}
                poli={poli}
              />
            )}
          </Belir>
        ))}
        {ustHatlar.kose.map((hat, n) => (
          <Belir key={`h${animAnahtar}-${n}`} baslangic={baslangic} an={acilis.telGecikme === null ? null : acilis.telGecikme + acilis.olc(hat[0].x, hat[0].z) / acilis.telHiz}>
            <DikenliTeller hatlar={[hat]} />
          </Belir>
        ))}
        <Direkler key={`d${animAnahtar}`} direkler={sonuc.direkler} t={t} poli={poli} baslangic={baslangic} animasyon={!detay} dubel={dubel} gecikmeler={acilis.direkGecikmeleri} />
        </group>
        <Babalar
          babalar={sonuc.babalar ?? []}
          h={Math.max(1, h)}
          kesitler={{ yaya: kesit(VARSAYILAN_AYARLAR.kapiBabasi.yayaOlcu), arac: kesit(VARSAYILAN_AYARLAR.kapiBabasi.aracOlcu) }}
          renk={t.direk.tip === "beton" ? "#9aa5b4" : direkRengi(t.direk.renk).renk}
          flansli={t.zemin !== "toprak"}
        />
        <Kapilar
          kapilar={sonuc.kapilar}
          h={Math.max(1, h)}
          telMalzeme={kapiMalzeme}
          babaYari={sonuc.babalar?.length ? { yaya: kesit(VARSAYILAN_AYARLAR.kapiBabasi.yayaOlcu) / 2, arac: kesit(VARSAYILAN_AYARLAR.kapiBabasi.aracOlcu) / 2 } : undefined}
        />

      </group>

      {!detay && etiketDom && <EtiketYansit etiketler={etiketler} domlar={etiketDom} />}
      {detay ? (
        <DetayKamera noktalar={noktalar} merkez={merkez} h={h} taban={duvarH} onHazir={onHazir} />
      ) : (
        <KameraRig boyut={boyut} anahtar={`${t.sekil}-${Math.round(boyut / 5)}`} gorunum={gorunum} kose={koseGorunum} intro={animAnahtar} />
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
        gl={{ preserveDrawingBuffer: true, antialias: true, logarithmicDepthBuffer: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <Icerik {...props} etiketBildir={detay ? undefined : setEtiketler} etiketDom={domlar} gorunum={gorunum} />
        <OrbitControls makeDefault enableDamping enabled={!detay} maxPolarAngle={Math.PI / 2.05} minDistance={1} maxDistance={3000} />
        {/* Görünüm küpü: yüzüne tıklayınca kamera o yöne döner */}
        {!detay && (
          <GizmoHelper alignment="bottom-left" margin={[132, 62]}>
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
        <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5">
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
          <button
            type="button"
            title={props.tasarim.sekil === "serbest" ? "Üstten plan görünüşü · köşeleri sürükleyerek araziyi şekillendirin" : "Üstten plan görünüşü"}
            aria-label="Üstten görünüş"
            onClick={() => gorunumSec("yon", [0, 1, 0])}
            className={`cam rounded-lg px-2.5 py-1.5 text-xs font-bold transition hover:bg-[var(--yuzey-2)] ${gorunum.tur === "yon" && gorunum.yon?.[1] === 1 ? "ring-1 ring-ac-kirmizi" : ""}`}
          >
            Üst
          </button>
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
