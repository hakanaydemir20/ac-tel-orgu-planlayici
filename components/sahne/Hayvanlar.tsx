"use client";
// Eğlence için: çit alanında yaşayan bloklu (voksel) hayvanlar — tavuk (yumurtlar, yumurtadan civciv
// çıkar, civciv büyüyüp tavuk olur), kuş (uçar, konar) ve köpek (tavukları kovalar). Her hayvan birkaç
// kutudan oluşur; geometri ve malzemeler ortaktır, hareketler kemik döndürmeyle yapılır.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { icinde } from "@/lib/geometri";

type Nokta2 = [number, number];
type Tur = "tavuk" | "civciv" | "kus" | "kopek";
type Durum = "yuru" | "gagala" | "bekle" | "kanat" | "zipla" | "otur" | "kovala" | "kac" | "uc" | "in";
export interface HayvanSayilari {
  tavuk: number;
  kus: number;
  kopek: number;
}

const K = 1.4; // ölçek (tavuk ≈ 0,6 m)
const BUYUME = 45; // civcivin tavuk olma süresi (sn)
const TAVUK_SINIRI = 40; // bundan sonra yumurta çıkmaz
const ara = (a: number, b: number) => a + Math.random() * (b - a);
const aciFarki = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const P = (x: number, y: number, z: number): [number, number, number] => [x * K, y * K, z * K];

const geoOnbellek = new Map<string, THREE.BufferGeometry>();
const matOnbellek = new Map<string, THREE.Material>();
function Kutu({ o, r, p }: { o: [number, number, number]; r: string; p: [number, number, number] }) {
  const gk = o.join();
  let g = geoOnbellek.get(gk);
  if (!g) geoOnbellek.set(gk, (g = new THREE.BoxGeometry(o[0] * K, o[1] * K, o[2] * K)));
  let m = matOnbellek.get(r);
  if (!m) matOnbellek.set(r, (m = new THREE.MeshLambertMaterial({ color: r })));
  return <mesh geometry={g} material={m} position={P(...p)} castShadow />;
}
const YUMURTA_GEO = new THREE.SphereGeometry(0.05 * K, 10, 8).scale(1, 1.3, 1);
const YUMURTA_MAT = new THREE.MeshLambertMaterial({ color: "#f3ead8" });

type Kemik = Record<string, THREE.Object3D>;
const bag = (k: Kemik, ad: string) => (g: THREE.Object3D | null) => void (g && (k[ad] = g));

/** Tavuk / civciv; ileri yönü +Z. */
function TavukModel({ k, civciv }: { k: Kemik; civciv: boolean }) {
  const [beyaz, kirli] = civciv ? ["#f7d64a", "#e9bf33"] : ["#f4f1ea", "#ddd6c8"];
  return (
    <group ref={bag(k, "kok")}>
      <group ref={bag(k, "olcek")} scale={civciv ? 0.45 : 1}>
        <group ref={bag(k, "govde")} position={P(0, 0.15, 0)}>
          <Kutu o={[0.24, 0.2, 0.32]} r={beyaz} p={[0, 0.1, 0]} />
          {!civciv && <Kutu o={[0.16, 0.12, 0.06]} r={kirli} p={[0, 0.16, -0.18]} />}
          <group ref={bag(k, "kafa")} position={P(0, 0.16, 0.13)}>
            <Kutu o={[0.16, 0.22, 0.12]} r={beyaz} p={[0, 0.1, 0.03]} />
            <Kutu o={[0.12, 0.05, 0.08]} r="#f2a531" p={[0, 0.12, 0.13]} />
            {!civciv && <Kutu o={[0.06, 0.07, 0.04]} r="#d82628" p={[0, 0.065, 0.11]} />}
            {!civciv && <Kutu o={[0.04, 0.06, 0.1]} r="#d82628" p={[0, 0.24, 0.04]} />}
            <Kutu o={[0.02, 0.035, 0.035]} r="#1b1b1b" p={[0.08, 0.16, 0.06]} />
            <Kutu o={[0.02, 0.035, 0.035]} r="#1b1b1b" p={[-0.08, 0.16, 0.06]} />
          </group>
          <group ref={bag(k, "kanatL")} position={P(0.14, 0.18, 0)}>
            <Kutu o={[0.04, 0.15, 0.22]} r={kirli} p={[0, -0.075, -0.01]} />
          </group>
          <group ref={bag(k, "kanatR")} position={P(-0.14, 0.18, 0)}>
            <Kutu o={[0.04, 0.15, 0.22]} r={kirli} p={[0, -0.075, -0.01]} />
          </group>
        </group>
        {[1, -1].map((s) => (
          <group key={s} ref={bag(k, s > 0 ? "bacakL" : "bacakR")} position={P(0.06 * s, 0.15, 0.02)}>
            <Kutu o={[0.03, 0.14, 0.03]} r="#f2a531" p={[0, -0.07, 0]} />
            <Kutu o={[0.07, 0.02, 0.08]} r="#f2a531" p={[0, -0.14, 0.02]} />
          </group>
        ))}
      </group>
    </group>
  );
}

/** Küçük mavi kuş; kanatlar yatay, omuzdan çırpar. */
function KusModel({ k }: { k: Kemik }) {
  return (
    <group ref={bag(k, "kok")}>
      <group ref={bag(k, "govde")} position={P(0, 0.06, 0)}>
        <Kutu o={[0.12, 0.1, 0.2]} r="#2f63c9" p={[0, 0.05, 0]} />
        <Kutu o={[0.1, 0.05, 0.14]} r="#f0e2c0" p={[0, 0.015, 0.02]} />
        <Kutu o={[0.08, 0.02, 0.12]} r="#1f4797" p={[0, 0.08, -0.15]} />
        <group ref={bag(k, "kafa")} position={P(0, 0.09, 0.09)}>
          <Kutu o={[0.1, 0.1, 0.1]} r="#2f63c9" p={[0, 0.04, 0.02]} />
          <Kutu o={[0.04, 0.03, 0.05]} r="#f2a531" p={[0, 0.03, 0.09]} />
          <Kutu o={[0.015, 0.025, 0.025]} r="#111" p={[0.05, 0.06, 0.04]} />
          <Kutu o={[0.015, 0.025, 0.025]} r="#111" p={[-0.05, 0.06, 0.04]} />
        </group>
        <group ref={bag(k, "kanatL")} position={P(0.06, 0.08, 0)}>
          <Kutu o={[0.18, 0.02, 0.12]} r="#1f4797" p={[0.09, 0, 0]} />
        </group>
        <group ref={bag(k, "kanatR")} position={P(-0.06, 0.08, 0)}>
          <Kutu o={[0.18, 0.02, 0.12]} r="#1f4797" p={[-0.09, 0, 0]} />
        </group>
      </group>
      <group ref={bag(k, "bacakL")} position={P(0.03, 0.06, 0)}>
        <Kutu o={[0.015, 0.06, 0.015]} r="#f2a531" p={[0, -0.03, 0]} />
      </group>
      <group ref={bag(k, "bacakR")} position={P(-0.03, 0.06, 0)}>
        <Kutu o={[0.015, 0.06, 0.015]} r="#f2a531" p={[0, -0.03, 0]} />
      </group>
    </group>
  );
}

/** Kahverengi köpek; dört bacak, sallanan kuyruk, kırmızı tasma. */
function KopekModel({ k }: { k: Kemik }) {
  const ten = "#c9a27a";
  return (
    <group ref={bag(k, "kok")}>
      <group ref={bag(k, "govde")} position={P(0, 0.37, 0)}>
        <Kutu o={[0.3, 0.24, 0.6]} r={ten} p={[0, 0, 0]} />
        <Kutu o={[0.32, 0.06, 0.08]} r="#d82628" p={[0, 0.06, 0.27]} />
        <group ref={bag(k, "kafa")} position={P(0, 0.12, 0.32)}>
          <Kutu o={[0.28, 0.26, 0.24]} r={ten} p={[0, 0.06, 0.06]} />
          <Kutu o={[0.16, 0.12, 0.14]} r="#e3cfb2" p={[0, 0, 0.24]} />
          <Kutu o={[0.06, 0.05, 0.03]} r="#1b1b1b" p={[0, 0.04, 0.32]} />
          <Kutu o={[0.08, 0.12, 0.05]} r="#8a6142" p={[0.1, 0.22, 0.02]} />
          <Kutu o={[0.08, 0.12, 0.05]} r="#8a6142" p={[-0.1, 0.22, 0.02]} />
          <Kutu o={[0.03, 0.04, 0.02]} r="#1b1b1b" p={[0.08, 0.11, 0.18]} />
          <Kutu o={[0.03, 0.04, 0.02]} r="#1b1b1b" p={[-0.08, 0.11, 0.18]} />
        </group>
        <group ref={bag(k, "kuyruk")} position={P(0, 0.08, -0.3)} rotation={[0.7, 0, 0]}>
          <Kutu o={[0.06, 0.06, 0.26]} r="#8a6142" p={[0, 0, -0.13]} />
        </group>
      </group>
      {(
        [
          ["bacakOL", 0.1, 0.22],
          ["bacakOR", -0.1, 0.22],
          ["bacakAL", 0.1, -0.22],
          ["bacakAR", -0.1, -0.22],
        ] as const
      ).map(([ad, x, z]) => (
        <group key={ad} ref={bag(k, ad)} position={P(x, 0.27, z)}>
          <Kutu o={[0.09, 0.27, 0.09]} r={ten} p={[0, -0.135, 0]} />
        </group>
      ))}
    </group>
  );
}

interface Hayvan {
  id: number;
  tur: Tur;
  x: number;
  z: number;
  y: number;
  vy: number;
  yon: number;
  durum: Durum;
  sure: number;
  hedef: Nokta2;
  hy: number; // kuşun uçuş yüksekliği
  av: number; // kovalanan / kaçılan hayvanın sırası
  faz: number;
  otur: number; // 0 ayakta, 1 oturuyor
  yas: number;
  yumurta: number; // bir sonraki yumurtaya kalan süre
  k: Kemik;
}
interface Yumurta {
  id: number;
  x: number;
  z: number;
  sure: number;
}

const AGIRLIK: Record<Tur, [Durum, number][]> = {
  tavuk: [["yuru", 30], ["gagala", 20], ["bekle", 12], ["kanat", 9], ["zipla", 9], ["otur", 8], ["kovala", 8]],
  civciv: [["yuru", 35], ["gagala", 25], ["bekle", 15], ["zipla", 15], ["otur", 6]],
  kopek: [["yuru", 30], ["kovala", 22], ["otur", 15], ["bekle", 15], ["zipla", 8]],
  kus: [["uc", 40], ["gagala", 25], ["zipla", 15], ["bekle", 15]],
};
const SURE: Record<Durum, [number, number]> = {
  yuru: [2, 5], gagala: [1.5, 4], bekle: [1, 3], kanat: [0.8, 1.6], zipla: [1, 2.2], otur: [4, 9], kovala: [2, 4], kac: [2, 2.5], uc: [4, 9], in: [99, 99],
};
const HIZ: Record<Tur, { yuru: number; kovala: number; kac: number }> = {
  tavuk: { yuru: 0.6, kovala: 1.5, kac: 1.4 },
  civciv: { yuru: 0.45, kovala: 0, kac: 1.1 },
  kopek: { yuru: 1.0, kovala: 2.6, kac: 0 },
  kus: { yuru: 0.3, kovala: 0, kac: 0 },
};
const YARICAP: Record<Tur, number> = { tavuk: 0.32, civciv: 0.16, kopek: 0.55, kus: 0.15 };
function rastgeleDurum(tur: Tur): Durum {
  const l = AGIRLIK[tur];
  let r = Math.random() * l.reduce((t, [, a]) => t + a, 0);
  for (const [d, a] of l) if ((r -= a) < 0) return d;
  return l[0][0];
}

/**
 * Alan içinde rastgele davranan hayvanlar. `sayilar` arttıkça yenisi gökten düşerek (kuş uçarak)
 * eklenir; hepsi 0 olunca yumurta ve civcivlerle birlikte temizlenir. `poli` kapalı çit alanı;
 * yoksa çizimin sınır kutusu kullanılır.
 */
export function Hayvanlar({ sayilar, poli, kutuNoktalari, zeminY }: { sayilar: HayvanSayilari; poli: Nokta2[] | null; kutuNoktalari: Nokta2[]; zeminY: number }) {
  const alan = useMemo(() => {
    const xs = kutuNoktalari.map((p) => p[0]);
    const zs = kutuNoktalari.map((p) => p[1]);
    const s = xs.length ? [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)] : [-5, 5, -5, 5];
    const PAY = 0.45; // telden uzak dursun
    const icerde = (x: number, z: number) =>
      x > s[0] + PAY && x < s[1] - PAY && z > s[2] + PAY && z < s[3] - PAY &&
      (!poli || [[0, 0], [PAY, 0], [-PAY, 0], [0, PAY], [0, -PAY]].every(([a, b]) => icinde(x + a, z + b, poli)));
    const nokta = (): Nokta2 => {
      for (let i = 0; i < 200; i++) {
        const p: Nokta2 = [ara(s[0], s[1]), ara(s[2], s[3])];
        if (icerde(...p)) return p;
      }
      return [(s[0] + s[1]) / 2, (s[2] + s[3]) / 2];
    };
    const hava = (): Nokta2 => [ara(s[0] - 2, s[1] + 2), ara(s[2] - 2, s[3] + 2)];
    return { icerde, nokta, hava };
  }, [poli, kutuNoktalari]);

  const [, yenile] = useState(0);
  const hayvanlar = useRef<Hayvan[]>([]);
  const yumurtalar = useRef<Yumurta[]>([]);
  const eklenen = useRef<HayvanSayilari>({ tavuk: 0, kus: 0, kopek: 0 });
  const sonId = useRef(0);

  const yeni = (tur: Tur, x: number, z: number, y: number): Hayvan => ({
    id: ++sonId.current, tur, x, z, y, vy: 0, yon: ara(0, Math.PI * 2), durum: tur === "kus" ? "uc" : "bekle", sure: ara(0.5, 1.5),
    hedef: [x, z], hy: ara(3, 6), av: -1, faz: ara(0, 10), otur: 0, yas: 0, yumurta: ara(15, 35), k: {},
  });
  if (!sayilar.tavuk && !sayilar.kus && !sayilar.kopek && hayvanlar.current.length) {
    hayvanlar.current = [];
    yumurtalar.current = [];
    eklenen.current = { tavuk: 0, kus: 0, kopek: 0 };
  }
  for (const tur of ["tavuk", "kus", "kopek"] as const)
    while (eklenen.current[tur] < sayilar[tur]) {
      eklenen.current[tur]++;
      const [x, z] = tur === "kus" ? alan.hava() : alan.nokta();
      hayvanlar.current.push(yeni(tur, x, z, tur === "kus" ? ara(4, 7) : ara(2, 4)));
    }

  useFrame((_, dtHam) => {
    const dt = Math.min(dtHam, 0.05);
    const liste = hayvanlar.current;
    let degisti = false;

    // yumurtalar çatlar → civciv
    for (let e = yumurtalar.current.length - 1; e >= 0; e--) {
      const y = yumurtalar.current[e];
      y.sure -= dt;
      if (y.sure <= 0) {
        liste.push(yeni("civciv", y.x, y.z, 0.3));
        yumurtalar.current.splice(e, 1);
        degisti = true;
      }
    }
    const tavukSayisi = liste.filter((h) => h.tur === "tavuk" || h.tur === "civciv").length + yumurtalar.current.length;

    liste.forEach((s, i) => {
      const k = s.k;
      if (!k.kok) return;
      s.faz += dt;
      s.sure -= dt;
      const kus = s.tur === "kus";
      const ucuyor = kus && (s.durum === "uc" || s.durum === "in");
      const havada = !ucuyor && (s.y > 0.001 || s.vy > 0);

      // civciv büyür
      if (s.tur === "civciv") {
        s.yas += dt;
        if (s.yas >= BUYUME) (s.tur = "tavuk"), (s.k = {}), (degisti = true);
      }
      // tavuk yumurtlar
      if (s.tur === "tavuk" && (s.yumurta -= dt) <= 0 && !havada && s.durum !== "kac" && s.durum !== "kovala") {
        s.yumurta = ara(20, 45);
        if (tavukSayisi < TAVUK_SINIRI) {
          yumurtalar.current.push({ id: ++sonId.current, x: s.x - Math.sin(s.yon) * 0.2 * K, z: s.z - Math.cos(s.yon) * 0.2 * K, sure: ara(8, 14) });
          (s.durum = "otur"), (s.sure = 1.5);
          degisti = true;
        }
      }
      // köpek yaklaşınca tavuk/civciv kaçar, kuş havalanır
      if (s.tur !== "kopek" && s.durum !== "kac" && !ucuyor)
        liste.forEach((o, j) => {
          if (o.tur !== "kopek" || Math.hypot(o.x - s.x, o.z - s.z) > 1.4 || (o.durum !== "yuru" && o.durum !== "kovala")) return;
          if (kus) (s.durum = "uc"), (s.hedef = alan.hava()), (s.hy = ara(3, 6)), (s.sure = ara(4, 8));
          else (s.durum = "kac"), (s.av = j), (s.sure = 1.5), (s.otur = 0);
        });

      // durum bitti → yenisini seç
      if (s.sure <= 0 && !havada && !ucuyor) {
        s.durum = rastgeleDurum(s.tur);
        s.sure = ara(...SURE[s.durum]);
        if (s.durum === "yuru") s.hedef = alan.nokta();
        if (s.durum === "uc") (s.hedef = alan.hava()), (s.hy = ara(3, 6));
        if (s.durum === "kovala") {
          const adaylar = liste.map((o, j) => j).filter((j) => j !== i && (s.tur === "kopek" ? liste[j].tur !== "kopek" && !(liste[j].tur === "kus" && liste[j].y > 0.1) : liste[j].tur === "tavuk"));
          s.av = adaylar.length ? adaylar[Math.floor(Math.random() * adaylar.length)] : -1;
          if (s.av < 0) (s.durum = "yuru"), (s.hedef = alan.nokta());
          else {
            const av = liste[s.av];
            if (av.tur === "kus") (av.durum = "uc"), (av.hedef = alan.hava()), (av.hy = ara(3, 6)), (av.sure = ara(4, 8));
            else (av.durum = "kac"), (av.av = i), (av.sure = s.sure + 0.5), (av.otur = 0);
          }
        }
        if (s.durum === "zipla" || s.durum === "kanat") s.vy = s.durum === "zipla" ? (kus ? 1.2 : 2.2) : 1.4;
      } else if (ucuyor && s.durum === "uc" && s.sure <= 0) (s.durum = "in"), (s.hedef = alan.nokta());

      // hareket
      let hiz = 0;
      let istenenYon = s.yon;
      const yonel = (x: number, z: number) => (istenenYon = Math.atan2(x - s.x, z - s.z));
      if (ucuyor) {
        hiz = 3;
        yonel(...s.hedef);
        const d = Math.hypot(s.hedef[0] - s.x, s.hedef[1] - s.z);
        const hedefY = s.durum === "in" ? Math.min(s.hy, d * 0.6) : s.hy;
        s.y += (hedefY - s.y) * Math.min(1, dt * 1.5);
        if (s.durum === "uc" && d < 0.5) s.hedef = alan.hava();
        if (s.durum === "in" && d < 0.15) (s.y = 0), (s.durum = "gagala"), (s.sure = ara(2, 4)), (hiz = 0);
        if (s.durum === "in") hiz = Math.min(3, d * 1.5 + 0.3);
      } else if (s.durum === "yuru") {
        hiz = HIZ[s.tur].yuru;
        yonel(...s.hedef);
        if (Math.hypot(s.hedef[0] - s.x, s.hedef[1] - s.z) < 0.2) (s.durum = s.tur === "kopek" ? "bekle" : "gagala"), (s.sure = ara(1, 3));
      } else if (s.durum === "kovala" && liste[s.av]) {
        const av = liste[s.av];
        hiz = HIZ[s.tur].kovala;
        yonel(av.x, av.z);
        if (Math.hypot(av.x - s.x, av.z - s.z) < (YARICAP[s.tur] + YARICAP[av.tur]) * 0.8 || (av.tur === "kus" && av.y > 0.5)) s.sure = 0;
      } else if (s.durum === "kac" && liste[s.av]) {
        const avci = liste[s.av];
        hiz = HIZ[s.tur].kac;
        istenenYon = Math.atan2(s.x - avci.x, s.z - avci.z) + Math.sin(s.faz * 3) * 0.6;
      } else if (s.durum === "zipla") hiz = HIZ[s.tur].yuru * 0.5;
      if (s.otur > 0.05) hiz = 0;

      s.yon += aciFarki(s.yon, istenenYon) * Math.min(1, dt * (s.durum === "kovala" || s.durum === "kac" || ucuyor ? 8 : 4));
      if (hiz) {
        const nx = s.x + Math.sin(s.yon) * hiz * dt;
        const nz = s.z + Math.cos(s.yon) * hiz * dt;
        if (ucuyor || alan.icerde(nx, nz)) (s.x = nx), (s.z = nz);
        else if (s.durum === "yuru") s.hedef = alan.nokta();
        else s.yon += Math.PI * 3 * dt; // telde dön
      }
      // birbirinin içine girmesin
      if (!ucuyor)
        for (let j = 0; j < liste.length; j++) {
          const o = liste[j];
          if (j === i || (o.tur === "kus" && o.y > 0.1)) continue;
          const r = YARICAP[s.tur] + YARICAP[o.tur];
          const dx = s.x - o.x, dz = s.z - o.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.001 && d < r && alan.icerde(s.x + (dx / d) * 0.02, s.z + (dz / d) * 0.02)) (s.x += (dx / d) * (r - d) * 0.5), (s.z += (dz / d) * (r - d) * 0.5);
        }

      // yerçekimi (gökten iniş, zıplama, kanat çırparken hafif havalanma)
      if (havada) {
        s.vy -= 9 * dt;
        s.y += s.vy * dt;
        if (s.y <= 0) (s.y = 0), (s.vy = s.durum === "zipla" && s.sure > 0.3 ? (kus ? 1.2 : 2.2) : 0);
      }
      s.otur += ((s.durum === "otur" ? 1 : 0) - s.otur) * Math.min(1, dt * 3);

      // poz
      const t = s.faz;
      const adim = hiz && !ucuyor ? Math.sin(t * (hiz > 1.2 ? 22 : 13)) : 0;
      k.kok.position.set(s.x, zeminY + s.y, s.z);
      k.kok.rotation.y = s.yon;
      if (s.tur === "kopek") {
        k.govde.position.y = (0.37 - 0.08 * s.otur) * K + Math.abs(adim) * 0.02 * K;
        k.govde.rotation.x = -0.45 * s.otur;
        k.bacakOL.rotation.x = k.bacakAR.rotation.x = adim * 0.6;
        k.bacakOR.rotation.x = -adim * 0.6;
        k.bacakAL.rotation.x = -adim * 0.6 + 1.2 * s.otur;
        k.bacakAR.rotation.x += 1.2 * s.otur;
        k.kuyruk.rotation.y = Math.sin(t * (s.durum === "kovala" ? 20 : 9)) * 0.6;
        k.kafa.rotation.x = s.durum === "bekle" ? Math.max(0, Math.sin(t * 14)) * 0.18 * (Math.sin(t * 1.3) > 0.3 ? 1 : 0) : s.durum === "kovala" ? 0.2 : 0;
        k.kafa.rotation.y = s.durum === "otur" ? Math.sin(t * 1.2) * 0.4 : 0;
        return;
      }
      if (s.tur === "civciv") k.olcek.scale.setScalar(0.45 + 0.55 * Math.min(1, s.yas / BUYUME));
      if (!kus) {
        k.govde.position.y = 0.15 * K * (1 - s.otur * 0.85) + Math.abs(adim) * 0.015 * K;
        k.bacakL.visible = k.bacakR.visible = s.otur < 0.6;
      }
      k.bacakL.rotation.x = adim * 0.7;
      k.bacakR.rotation.x = -adim * 0.7;

      const cirp = ucuyor
        ? Math.sin(t * 30) * 0.9
        : s.durum === "kanat" || s.durum === "kac" || (havada && s.durum !== "yuru")
          ? Math.abs(Math.sin(t * 28)) * 1.2
          : s.durum === "kovala" ? 0.4 : 0;
      k.kanatL.rotation.z = cirp;
      k.kanatR.rotation.z = -cirp;

      if (s.durum === "gagala") k.kafa.rotation.set(0.25 + Math.max(0, Math.sin(t * 9)) * 1.0, 0, 0);
      else if (s.durum === "bekle" || s.otur > 0.5) k.kafa.rotation.set(0, Math.sin(t * 1.7) * 0.6 * (Math.sin(t * 0.7) > 0 ? 1 : 0), 0);
      else k.kafa.rotation.set(hiz && !ucuyor ? Math.sin(t * 13) * 0.15 : 0, 0, 0);
    });

    if (degisti) yenile((n) => n + 1);
  });

  return (
    <>
      {hayvanlar.current.map((h) =>
        h.tur === "kopek" ? <KopekModel key={h.id} k={h.k} /> : h.tur === "kus" ? <KusModel key={h.id} k={h.k} /> : <TavukModel key={`${h.id}-${h.tur}`} k={h.k} civciv={h.tur === "civciv"} />,
      )}
      {yumurtalar.current.map((y) => (
        <YumurtaModel key={y.id} y={y} zeminY={zeminY} />
      ))}
    </>
  );
}

function YumurtaModel({ y, zeminY }: { y: Yumurta; zeminY: number }) {
  const r = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (r.current) r.current.rotation.z = y.sure < 2.5 ? Math.sin(clock.elapsedTime * 25) * 0.3 * (1 - y.sure / 2.5) : 0;
  });
  return <mesh ref={r} geometry={YUMURTA_GEO} material={YUMURTA_MAT} position={[y.x, zeminY + 0.065 * K, y.z]} castShadow />;
}
