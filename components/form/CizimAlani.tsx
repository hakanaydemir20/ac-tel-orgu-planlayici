"use client";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTasarim } from "@/lib/store";
import {
  alan,
  araNoktaEkle,
  geriAl,
  kapaliYap,
  kendiniKesiyor,
  kenarOlcusuYaz,
  noktaEkle,
  noktaSil,
  noktaTasi,
  temizle,
  yasla,
} from "@/lib/serbest";
import { Nokta2, kenarHarfi, kenarlariHesapla } from "@/lib/tasarim";
import { SayiGiris, sayi } from "../ui";

interface Gorunum {
  x: number;
  z: number;
  w: number;
  h: number;
}
const ORAN = 0.75; // yükseklik / genişlik
const BOS_GORUNUM: Gorunum = { x: -5, z: -5, w: 50, h: 37.5 };
const ADIMLAR = [0.5, 1, 2, 5, 10, 20, 50, 100, 200];

/** Noktaları rahatça içine alan görünüm. */
function sigdir(noktalar: Nokta2[]): Gorunum {
  if (noktalar.length < 2) {
    const [x, z] = noktalar[0] ?? [20, 15];
    return { ...BOS_GORUNUM, x: x - 25, z: z - 18.75 };
  }
  const xs = noktalar.map((p) => p[0]);
  const zs = noktalar.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  let w = Math.max(x1 - x0, (z1 - z0) / ORAN, 10) * 1.35;
  w = Math.max(w, 12);
  const h = w * ORAN;
  return { x: (x0 + x1) / 2 - w / 2, z: (z0 + z1) / 2 - h / 2, w, h };
}

/** Şekil görünümün dışına taştıysa ya da çok küçük kaldıysa yeniden sığdır. */
function sigdirmaliMi(g: Gorunum, noktalar: Nokta2[]) {
  if (noktalar.length < 2) return false;
  const pay = g.w * 0.04;
  const xs = noktalar.map((p) => p[0]);
  const zs = noktalar.map((p) => p[1]);
  const disarida =
    Math.min(...xs) < g.x + pay || Math.max(...xs) > g.x + g.w - pay || Math.min(...zs) < g.z + pay || Math.max(...zs) > g.z + g.h - pay;
  // Yalnızca yeni sığdırma görünümü belirgin biçimde daha dar olacaksa (küçük şekillerde
  // sığdır() alt sınıra takılır; aynı görünümü tekrar tekrar kurup döngüye girmesin)
  const kucuk = sigdir(noktalar).w < g.w * 0.6;
  return disarida || kucuk;
}

export function CizimAlani() {
  const { tasarim: t, guncelle } = useTasarim();
  const { noktalar, kapali } = t.serbest;
  const svg = useRef<SVGSVGElement>(null);
  const [gorunum, setGorunum] = useState<Gorunum>(() => (noktalar.length ? sigdir(noktalar) : BOS_GORUNUM));
  const [secili, setSecili] = useState<number | null>(null);
  const [imlec, setImlec] = useState<Nokta2 | null>(null);
  const surukle = useRef<{ i: number; oynadi: boolean; x: number; y: number } | null>(null);

  // Sürükleme bitince görünümü gerekirse yeniden sığdır (sürüklerken sahne kaymasın)
  useEffect(() => {
    if (!surukle.current && sigdirmaliMi(gorunum, noktalar)) setGorunum(sigdir(noktalar));
  }, [noktalar, gorunum]);

  const dunya = (e: { clientX: number; clientY: number }): Nokta2 => {
    const m = svg.current!.getScreenCTM()!.inverse();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return [yasla(p.x), yasla(p.y)];
  };

  const r = gorunum.w * 0.016; // köşe yarıçapı (dünya birimi)
  const yazi = gorunum.w * 0.03;
  const izgara = ADIMLAR.find((a) => gorunum.w / a <= 24) ?? 200;
  const kesisiyor = useMemo(() => kendiniKesiyor(noktalar, kapali), [noktalar, kapali]);
  const gercekler = useMemo(() => kenarlariHesapla(t).map((k) => k.gercek), [t]);
  const kenarlar = useMemo(() => {
    const n = noktalar.length;
    const m = n < 2 ? 0 : kapali ? n : n - 1;
    return Array.from({ length: m }, (_, i) => {
      const a = noktalar[i];
      const b = noktalar[(i + 1) % n];
      // L: gerçek (eğimli) uzunluk; 3D etiket ve PDF ile aynı değer
      return { i, a, b, L: gercekler[i] ?? Math.hypot(b[0] - a[0], b[1] - a[1]) };
    });
  }, [noktalar, kapali, gercekler]);

  // --- olaylar ---
  const koseBas = (e: PointerEvent, i: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    surukle.current = { i, oynadi: false, x: e.clientX, y: e.clientY };
  };
  const hareket = (e: PointerEvent) => {
    const p = dunya(e);
    setImlec(p);
    const s = surukle.current;
    if (!s) return;
    if (!s.oynadi && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 4) return;
    s.oynadi = true;
    const eski = noktalar[s.i];
    if (eski && (eski[0] !== p[0] || eski[1] !== p[1])) guncelle((x) => noktaTasi(x, s.i, p));
  };
  const birak = () => {
    const s = surukle.current;
    surukle.current = null;
    if (!s) return;
    if (s.oynadi) {
      if (sigdirmaliMi(gorunum, noktalar)) setGorunum(sigdir(noktalar));
      return;
    }
    // Dokunma: ilk köşeye dokunmak şekli kapatır, diğerleri seçer
    if (s.i === 0 && !kapali && noktalar.length >= 3) {
      guncelle((x) => kapaliYap(x, true));
      setSecili(null);
    } else setSecili(s.i === secili ? null : s.i);
  };
  const zeminTikla = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (kapali) return setSecili(null);
    const p = dunya(e);
    guncelle((x) => noktaEkle(x, p));
    setSecili(null);
  };

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (secili === null || (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        guncelle((x) => noktaSil(x, secili));
        setSecili(null);
      }
      if (e.key === "Escape") setSecili(null);
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [secili, guncelle]);

  const ipucu =
    noktalar.length === 0
      ? "Arazinin ilk köşesine dokunun"
      : !kapali && noktalar.length < 3
        ? "Sıradaki köşeye dokunun"
        : !kapali
          ? "Devam edin ya da kapatmak için ilk köşeye (yeşil) dokunun"
          : "Köşeyi sürükleyerek taşıyın · kenardaki + ile köşe ekleyin";

  const son = noktalar.at(-1);
  const onizleme = !kapali && son && imlec && !surukle.current ? imlec : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-sky-200">👆 {ipucu}</p>
      <div className="relative overflow-hidden rounded-xl bg-[#081a38] ring-1 ring-white/10">
        <svg
          ref={svg}
          viewBox={`${gorunum.x} ${gorunum.z} ${gorunum.w} ${gorunum.h}`}
          className="block aspect-[4/3] w-full cursor-crosshair touch-none select-none"
          onPointerMove={hareket}
          onPointerUp={birak}
          onPointerCancel={birak}
          onLostPointerCapture={birak}
          onPointerLeave={() => setImlec(null)}
          onClick={(e) => zeminTikla(e as unknown as PointerEvent)}
        >
          {/* ızgara */}
          {Array.from({ length: Math.ceil(gorunum.w / izgara) + 2 }, (_, k) => {
            const x = (Math.floor(gorunum.x / izgara) + k) * izgara;
            return (
              <line key={`x${k}`} x1={x} x2={x} y1={gorunum.z} y2={gorunum.z + gorunum.h} stroke={Math.round(x / izgara) % 5 ? "#16325f" : "#1e4a85"} strokeWidth={gorunum.w * 0.0018} />
            );
          })}
          {Array.from({ length: Math.ceil(gorunum.h / izgara) + 2 }, (_, k) => {
            const z = (Math.floor(gorunum.z / izgara) + k) * izgara;
            return (
              <line key={`z${k}`} y1={z} y2={z} x1={gorunum.x} x2={gorunum.x + gorunum.w} stroke={Math.round(z / izgara) % 5 ? "#16325f" : "#1e4a85"} strokeWidth={gorunum.w * 0.0018} />
            );
          })}

          {/* şekil */}
          {noktalar.length >= 2 &&
            (kapali ? (
              <polygon
                points={noktalar.join(" ")}
                fill="#1c4a35"
                fillOpacity={0.7}
                stroke={kesisiyor ? "#f04446" : "#e8eef5"}
                strokeWidth={gorunum.w * 0.006}
                strokeLinejoin="round"
              />
            ) : (
              <polyline points={noktalar.join(" ")} fill="none" stroke="#e8eef5" strokeWidth={gorunum.w * 0.006} strokeLinejoin="round" />
            ))}

          {/* imleçten sonraki köşeye önizleme */}
          {onizleme && son && (
            <g pointerEvents="none">
              <line x1={son[0]} y1={son[1]} x2={onizleme[0]} y2={onizleme[1]} stroke="#0a84c6" strokeWidth={gorunum.w * 0.004} strokeDasharray={`${r} ${r * 0.6}`} />
              <text x={onizleme[0] + r * 1.5} y={onizleme[1] - r * 1.5} fontSize={yazi} fill="#9fd4ff" fontWeight={700}>
                {sayi(Math.hypot(onizleme[0] - son[0], onizleme[1] - son[1]))} m
              </text>
            </g>
          )}

          {/* kenar etiketleri ve ara köşe ekleme (+) */}
          {kenarlar.map(({ i, a, b, L }) => {
            const mx = (a[0] + b[0]) / 2;
            const mz = (a[1] + b[1]) / 2;
            const nx = -(b[1] - a[1]) / (L || 1);
            const nz = (b[0] - a[0]) / (L || 1);
            // Etiket kenardan, yazının yarı genişliği kadar daha uzağa itilir ki + ile çakışmasın
            const etiket = `${kenarHarfi(i)} · ${sayi(L)} m`;
            const d = yazi * 1.5 + Math.abs(nx) * etiket.length * yazi * 0.3;
            return (
              <g key={i}>
                <text x={mx + nx * d} y={mz + nz * d} fontSize={yazi} fill="#ffffff" fontWeight={800} textAnchor="middle" dominantBaseline="middle" pointerEvents="none" paintOrder="stroke" stroke="#081a38" strokeWidth={yazi * 0.25}>
                  {etiket}
                </text>
                {L > 2 && (
                  <g
                    className="cursor-copy"
                    onClick={(e) => {
                      e.stopPropagation();
                      guncelle((x) => araNoktaEkle(x, i, [yasla(mx), yasla(mz)]));
                      setSecili(i + 1);
                    }}
                  >
                    {/* Parmakla rahat dokunulsun: görünmez geniş dokunma alanı */}
                    <circle cx={mx} cy={mz} r={r * 2.2} fill="transparent" />
                    <circle cx={mx} cy={mz} r={r * 0.9} fill="#0a84c6" fillOpacity={0.85} />
                    <path d={`M${mx - r * 0.5} ${mz}h${r}M${mx} ${mz - r * 0.5}v${r}`} stroke="#fff" strokeWidth={r * 0.25} />
                  </g>
                )}
              </g>
            );
          })}

          {/* köşeler */}
          {noktalar.map(([x, z], i) => {
            const kapatilabilir = i === 0 && !kapali && noktalar.length >= 3;
            return (
              <g key={i} className="cursor-grab" onPointerDown={(e) => koseBas(e, i)} onClick={(e) => e.stopPropagation()}>
                {/* Görünmez geniş dokunma alanı: telefonda köşeyi tutmak kolay olsun */}
                <circle cx={x} cy={z} r={r * 2.4} fill="transparent" />
                <circle
                  cx={x}
                  cy={z}
                  r={kapatilabilir ? r * 1.4 : r}
                  fill={i === secili ? "#ffffff" : kapatilabilir ? "#22c55e" : "#d82628"}
                  stroke="#fff"
                  strokeWidth={r * 0.3}
                />
              </g>
            );
          })}
        </svg>

        <span className="pointer-events-none absolute bottom-1.5 right-2 rounded-full bg-ac-gece/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--metin-2)]">
          kare {izgara} m
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { ad: "↶ Geri al", is: () => guncelle(geriAl), kapali: noktalar.length === 0 },
          kapali
            ? { ad: "Şekli aç", is: () => guncelle((x) => kapaliYap(x, false)), kapali: false }
            : { ad: "Şekli kapat", is: () => guncelle((x) => kapaliYap(x, true)), kapali: noktalar.length < 3 },
          {
            ad: "Köşeyi sil",
            is: () => {
              if (secili !== null) guncelle((x) => noktaSil(x, secili));
              setSecili(null);
            },
            kapali: secili === null,
          },
          {
            ad: "Temizle",
            is: () => {
              if (confirm("Çizim silinsin mi?")) {
                guncelle(temizle);
                setSecili(null);
                setGorunum(BOS_GORUNUM);
              }
            },
            kapali: noktalar.length === 0,
          },
        ].map((b) => (
          <button
            key={b.ad}
            type="button"
            disabled={b.kapali}
            onClick={b.is}
            className="cam rounded-lg px-3 py-2 text-xs font-bold transition hover:bg-[var(--yuzey-2)] disabled:opacity-35"
          >
            {b.ad}
          </button>
        ))}
        {kapali && noktalar.length >= 3 && (
          <span className="ml-auto self-center text-xs text-[var(--metin-2)]">
            Alan <b className="text-white">{sayi(alan(noktalar), 0)} m²</b>
          </span>
        )}
      </div>
      {kesisiyor && <p className="text-xs font-semibold text-red-300">Çizgiler birbirini kesiyor; köşeleri düzeltin.</p>}

      {kenarlar.length > 0 && (
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--metin-2)]">Kenar uzunlukları (ölçtüğünüz değeri yazın)</div>
          <div className="grid grid-cols-2 gap-2">
            {kenarlar.map(({ i, L }) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ac-kirmizi text-xs font-extrabold">{kenarHarfi(i)}</span>
                <SayiGiris kucuk adim={0.5} min={0.5} max={5000} deger={Math.round(L * 100) / 100} onChange={(v) => guncelle((x) => kenarOlcusuYaz(x, i, v))} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
