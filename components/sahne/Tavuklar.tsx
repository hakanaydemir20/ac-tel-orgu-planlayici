"use client";
// Eğlence için: çit alanının içinde dolaşan bloklu (voksel) tavuklar. Her tavuk ~12 kutudan oluşur,
// geometri ve malzemeler tüm tavuklarda ortaktır; hareketler tek tek kemik döndürmeyle yapılır.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { icinde } from "@/lib/geometri";

type Nokta2 = [number, number];
type Durum = "yuru" | "gagala" | "bekle" | "kanat" | "zipla" | "otur" | "kovala" | "kac";

const K = 1.4; // tavuk ölçeği (1 ≈ 0,45 m boy)
const kutu = (w: number, h: number, d: number) => new THREE.BoxGeometry(w * K, h * K, d * K);
const GEO = {
  govde: kutu(0.24, 0.2, 0.32),
  kafa: kutu(0.16, 0.22, 0.12),
  gaga: kutu(0.12, 0.05, 0.08),
  sakal: kutu(0.06, 0.07, 0.04),
  ibik: kutu(0.04, 0.06, 0.1),
  goz: kutu(0.02, 0.035, 0.035),
  kanat: kutu(0.04, 0.15, 0.22),
  kuyruk: kutu(0.16, 0.12, 0.06),
  bacak: kutu(0.03, 0.14, 0.03),
  ayak: kutu(0.07, 0.02, 0.08),
};
const MAT = {
  beyaz: new THREE.MeshLambertMaterial({ color: "#f4f1ea" }),
  kirli: new THREE.MeshLambertMaterial({ color: "#ddd6c8" }),
  turuncu: new THREE.MeshLambertMaterial({ color: "#f2a531" }),
  kirmizi: new THREE.MeshLambertMaterial({ color: "#d82628" }),
  siyah: new THREE.MeshLambertMaterial({ color: "#1b1b1b" }),
};

const AGIRLIK: [Durum, number][] = [
  ["yuru", 30],
  ["gagala", 20],
  ["bekle", 12],
  ["kanat", 9],
  ["zipla", 9],
  ["otur", 8],
  ["kovala", 8],
];
function rastgeleDurum(): Durum {
  let r = Math.random() * AGIRLIK.reduce((t, [, a]) => t + a, 0);
  for (const [d, a] of AGIRLIK) if ((r -= a) < 0) return d;
  return "yuru";
}
const ara = (a: number, b: number) => a + Math.random() * (b - a);
const aciFarki = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

interface Kemikler {
  kok: THREE.Group;
  govde: THREE.Group;
  kafa: THREE.Group;
  kanatL: THREE.Group;
  kanatR: THREE.Group;
  bacakL: THREE.Group;
  bacakR: THREE.Group;
}
interface TavukDurum {
  x: number;
  z: number;
  y: number;
  vy: number;
  yon: number;
  durum: Durum;
  sure: number;
  hedef: Nokta2;
  av: number; // kovalanan / kaçılan tavuğun sırası
  faz: number;
  otur: number; // 0 ayakta, 1 oturuyor
}

/** Bloklu tavuk; ileri yönü +Z. */
function TavukModel({ kemik }: { kemik: React.MutableRefObject<Kemikler | null> }) {
  const r = useRef<Partial<Kemikler>>({});
  const bagla = (ad: keyof Kemikler) => (g: THREE.Group | null) => {
    if (!g) return;
    r.current[ad] = g;
    if (Object.keys(r.current).length === 7) kemik.current = r.current as Kemikler;
  };
  const m = (geo: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number]) => (
    <mesh geometry={geo} material={mat} position={p.map((v) => v * K) as [number, number, number]} castShadow />
  );
  return (
    <group ref={bagla("kok")}>
      <group ref={bagla("govde")} position={[0, 0.15 * K, 0]}>
        {m(GEO.govde, MAT.beyaz, [0, 0.1, 0])}
        {m(GEO.kuyruk, MAT.kirli, [0, 0.16, -0.18])}
        {/* kafa boynun dibinden döner (gagalama, sağa sola bakma) */}
        <group ref={bagla("kafa")} position={[0, 0.16 * K, 0.13 * K]}>
          {m(GEO.kafa, MAT.beyaz, [0, 0.1, 0.03])}
          {m(GEO.gaga, MAT.turuncu, [0, 0.12, 0.13])}
          {m(GEO.sakal, MAT.kirmizi, [0, 0.065, 0.11])}
          {m(GEO.ibik, MAT.kirmizi, [0, 0.24, 0.04])}
          {m(GEO.goz, MAT.siyah, [0.08, 0.16, 0.06])}
          {m(GEO.goz, MAT.siyah, [-0.08, 0.16, 0.06])}
        </group>
        {/* kanatlar omuzdan menteşeli */}
        <group ref={bagla("kanatL")} position={[0.14 * K, 0.18 * K, 0]}>
          {m(GEO.kanat, MAT.kirli, [0, -0.075, -0.01])}
        </group>
        <group ref={bagla("kanatR")} position={[-0.14 * K, 0.18 * K, 0]}>
          {m(GEO.kanat, MAT.kirli, [0, -0.075, -0.01])}
        </group>
      </group>
      <group ref={bagla("bacakL")} position={[0.06 * K, 0.15 * K, 0.02 * K]}>
        {m(GEO.bacak, MAT.turuncu, [0, -0.07, 0])}
        {m(GEO.ayak, MAT.turuncu, [0, -0.14, 0.02])}
      </group>
      <group ref={bagla("bacakR")} position={[-0.06 * K, 0.15 * K, 0.02 * K]}>
        {m(GEO.bacak, MAT.turuncu, [0, -0.07, 0])}
        {m(GEO.ayak, MAT.turuncu, [0, -0.14, 0.02])}
      </group>
    </group>
  );
}

/**
 * Alan içinde rastgele davranan tavuklar. `sayi` arttıkça yeni tavuk gökten düşerek eklenir.
 * `poli` kapalı çit alanı; yoksa çizimin sınır kutusu kullanılır.
 */
export function Tavuklar({ sayi, poli, kutuNoktalari, zeminY }: { sayi: number; poli: Nokta2[] | null; kutuNoktalari: Nokta2[]; zeminY: number }) {
  const alan = useMemo(() => {
    const xs = kutuNoktalari.map((p) => p[0]);
    const zs = kutuNoktalari.map((p) => p[1]);
    const sinir = xs.length ? [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)] : [-5, 5, -5, 5];
    const PAY = 0.45; // telden uzak dursun
    const icerde = (x: number, z: number) =>
      x > sinir[0] + PAY &&
      x < sinir[1] - PAY &&
      z > sinir[2] + PAY &&
      z < sinir[3] - PAY &&
      (!poli || [[0, 0], [PAY, 0], [-PAY, 0], [0, PAY], [0, -PAY]].every(([a, b]) => icinde(x + a, z + b, poli)));
    const nokta = (): Nokta2 => {
      for (let i = 0; i < 200; i++) {
        const p: Nokta2 = [ara(sinir[0], sinir[1]), ara(sinir[2], sinir[3])];
        if (icerde(...p)) return p;
      }
      return [(sinir[0] + sinir[1]) / 2, (sinir[2] + sinir[3]) / 2];
    };
    return { icerde, nokta };
  }, [poli, kutuNoktalari]);

  const tavuklar = useRef<TavukDurum[]>([]);
  const kemikler = useRef<React.MutableRefObject<Kemikler | null>[]>([]);
  while (tavuklar.current.length < sayi) {
    const [x, z] = alan.nokta();
    tavuklar.current.push({ x, z, y: ara(2, 4), vy: 0, yon: ara(0, Math.PI * 2), durum: "bekle", sure: ara(0.5, 1.5), hedef: [x, z], av: -1, faz: ara(0, 10), otur: 0 });
    kemikler.current.push({ current: null });
  }
  tavuklar.current.length = kemikler.current.length = sayi;

  useFrame((_, dtHam) => {
    const dt = Math.min(dtHam, 0.05);
    const liste = tavuklar.current;
    liste.forEach((s, i) => {
      const k = kemikler.current[i].current;
      if (!k) return;
      s.faz += dt;
      s.sure -= dt;
      const havada = s.y > 0.001 || s.vy > 0;

      // durum bitti → yenisini seç
      if (s.sure <= 0 && !havada) {
        s.durum = rastgeleDurum();
        s.sure = { yuru: ara(2, 5), gagala: ara(1.5, 4), bekle: ara(1, 3), kanat: ara(0.8, 1.6), zipla: ara(1, 2.2), otur: ara(4, 9), kovala: ara(2, 4), kac: 2 }[s.durum];
        if (s.durum === "yuru") s.hedef = alan.nokta();
        if (s.durum === "kovala") {
          s.av = liste.length > 1 ? (i + 1 + Math.floor(Math.random() * (liste.length - 1))) % liste.length : -1;
          if (s.av < 0) s.durum = "yuru";
          else {
            const av = liste[s.av];
            av.durum = "kac";
            av.av = i;
            av.sure = s.sure + 0.5;
            av.otur = 0;
          }
        }
        if (s.durum === "zipla" || s.durum === "kanat") s.vy = s.durum === "zipla" ? 2.2 : 1.4;
      }

      // hareket
      let hiz = 0;
      let istenenYon = s.yon;
      if (s.durum === "yuru") {
        hiz = 0.6;
        istenenYon = Math.atan2(s.hedef[0] - s.x, s.hedef[1] - s.z);
        if (Math.hypot(s.hedef[0] - s.x, s.hedef[1] - s.z) < 0.2) (s.durum = "gagala"), (s.sure = ara(1, 3));
      } else if (s.durum === "kovala" && liste[s.av]) {
        const av = liste[s.av];
        hiz = 1.5;
        istenenYon = Math.atan2(av.x - s.x, av.z - s.z);
        if (Math.hypot(av.x - s.x, av.z - s.z) < 0.35) s.sure = 0;
      } else if (s.durum === "kac" && liste[s.av]) {
        const avci = liste[s.av];
        hiz = 1.35;
        istenenYon = Math.atan2(s.x - avci.x, s.z - avci.z) + Math.sin(s.faz * 3) * 0.6;
      } else if (s.durum === "zipla") hiz = 0.3;
      if (s.otur > 0.05) hiz = 0;

      s.yon += aciFarki(s.yon, istenenYon) * Math.min(1, dt * (s.durum === "kovala" || s.durum === "kac" ? 8 : 4));
      if (hiz) {
        const nx = s.x + Math.sin(s.yon) * hiz * dt;
        const nz = s.z + Math.cos(s.yon) * hiz * dt;
        if (alan.icerde(nx, nz)) (s.x = nx), (s.z = nz);
        else if (s.durum === "yuru") s.hedef = alan.nokta();
        else s.yon += Math.PI * 0.5 * dt * 6; // telde dön
      }
      // birbirinin içine girmesin
      for (let j = 0; j < liste.length; j++) {
        if (j === i) continue;
        const o = liste[j];
        const dx = s.x - o.x, dz = s.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < 0.32 && alan.icerde(s.x + (dx / d) * 0.02, s.z + (dz / d) * 0.02)) (s.x += (dx / d) * (0.32 - d) * 0.5), (s.z += (dz / d) * (0.32 - d) * 0.5);
      }

      // yerçekimi (gökten iniş, zıplama, kanat çırparken hafif havalanma)
      if (havada) {
        s.vy -= 9 * dt;
        s.y += s.vy * dt;
        if (s.y <= 0) {
          s.y = 0;
          s.vy = s.durum === "zipla" && s.sure > 0.3 ? 2.2 : 0;
        }
      }
      s.otur += ((s.durum === "otur" ? 1 : 0) - s.otur) * Math.min(1, dt * 3);

      // poz
      const t = s.faz;
      const adim = hiz ? Math.sin(t * (hiz > 1 ? 22 : 13)) : 0;
      k.kok.position.set(s.x, zeminY + s.y, s.z);
      k.kok.rotation.y = s.yon;
      k.govde.position.y = 0.15 * K * (1 - s.otur * 0.85) + Math.abs(adim) * 0.015 * K;
      k.bacakL.rotation.x = adim * 0.7;
      k.bacakR.rotation.x = -adim * 0.7;
      k.bacakL.visible = k.bacakR.visible = s.otur < 0.6;

      const cirp = s.durum === "kanat" || s.durum === "kac" || (havada && s.durum !== "yuru") ? Math.abs(Math.sin(t * 28)) * 1.2 : s.durum === "kovala" ? 0.4 : 0;
      k.kanatL.rotation.z = -cirp;
      k.kanatR.rotation.z = cirp;

      if (s.durum === "gagala") {
        const g = Math.max(0, Math.sin(t * 9));
        k.kafa.rotation.set(0.25 + g * 1.0, 0, 0);
      } else if (s.durum === "bekle" || s.otur > 0.5) {
        k.kafa.rotation.set(0, Math.sin(t * 1.7) * 0.6 * (Math.sin(t * 0.7) > 0 ? 1 : 0), 0);
      } else k.kafa.rotation.set(hiz ? Math.sin(t * 13) * 0.15 : 0, 0, 0);
    });
  });

  return (
    <>
      {kemikler.current.map((ref, i) => (
        <TavukModel key={i} kemik={ref} />
      ))}
    </>
  );
}
