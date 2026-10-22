"use client";
import Image from "next/image";
import { ReactNode, createContext, useContext, useEffect, useRef, useState } from "react";
import { useAyarlar } from "@/lib/ayarlar";
import { yukseklikAnahtari } from "@/lib/hesap";
import { type Ayarlar, DIREK_TIPLERI, KAS_UZUNLUK, TEL_TIPLERI, olcuAnahtari, telTipi } from "@/lib/katalog";
import { DirekIkon, KapiIkon, TelIkon, ZeminIkon } from "./ikonlar";
import { sayi, tl } from "./ui";
import { varlik } from "@/lib/yol";
import { DUZLEMSEL_CAPLAR } from "@/lib/tasarim";
import { KAPI_DOLGULARI, KAPI_TIPLERI, YAYA_KAPI_TIPLERI } from "@/lib/aracKapi";

// ---------- küçük çizimler (bağlantı ve hizmet kalemleri) ----------

const Svg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 64 48" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const CIZIM: Record<string, ReactNode> = {
  gergiTeli: (
    <Svg>
      <path d="M6 10v30M58 10v30" strokeWidth="4" />
      <path d="M6 16h52M6 26h52M6 36h52" strokeWidth="1.8" />
    </Svg>
  ),
  gergiDemiri: (
    <Svg>
      <path d="M8 24h12M44 24h12" />
      <rect x="20" y="17" width="24" height="14" rx="3" />
      <circle cx="8" cy="24" r="4" />
      <circle cx="56" cy="24" r="4" />
    </Svg>
  ),
  kelepce: (
    <Svg>
      <rect x="22" y="6" width="14" height="36" rx="2" />
      <path d="M36 16h12v16H36" />
      <circle cx="44" cy="24" r="2" fill="currentColor" />
    </Svg>
  ),
  bagTeli: (
    <Svg>
      <ellipse cx="32" cy="24" rx="20" ry="14" />
      <ellipse cx="32" cy="24" rx="12" ry="8" />
      <ellipse cx="32" cy="24" rx="4" ry="3" />
    </Svg>
  ),
  flans: (
    <Svg>
      <rect x="27" y="4" width="10" height="30" />
      <path d="M12 38h40v6H12z" />
      {[16, 48].map((x) => (
        <circle key={x} cx={x} cy={41} r="1.6" fill="var(--color-ac-kirmizi)" stroke="none" />
      ))}
    </Svg>
  ),
  dubel: (
    <Svg>
      <path d="M32 4v8M26 12h12v6H26zM28 18v24l4 4 4-4V18" />
      <path d="M28 26h8M28 33h8" strokeWidth="1.5" />
    </Svg>
  ),
  montaj: (
    <Svg>
      <path d="M40 8a9 9 0 0 0-9 12L10 41l5 5 21-21a9 9 0 0 0 12-9l-6 6-6-2-2-6z" />
    </Svg>
  ),
  temel: (
    <Svg>
      <rect x="28" y="4" width="8" height="26" />
      <path d="M14 30h36l-4 14H18z" />
      <path d="M20 36h4M30 38h4M40 36h3" strokeWidth="1.5" />
    </Svg>
  ),
  nakliye: (
    <Svg>
      <path d="M4 12h32v22H4zM36 20h12l8 8v6H36z" />
      <circle cx="14" cy="38" r="5" />
      <circle cx="46" cy="38" r="5" />
    </Svg>
  ),
  kdv: (
    <Svg>
      <path d="M14 38 50 10" />
      <circle cx="18" cy="14" r="6" />
      <circle cx="46" cy="34" r="6" />
    </Svg>
  ),
  gecerlilik: (
    <Svg>
      <rect x="10" y="10" width="44" height="34" rx="4" />
      <path d="M10 20h44M22 6v8M42 6v8M24 32l6 5 12-11" />
    </Svg>
  ),
  pvc: (
    <Svg>
      <path d="M12 40c0-18 14-30 40-32-2 26-14 40-32 40" />
      <path d="M12 40 34 18" />
    </Svg>
  ),
  jiletli: (
    <Svg>
      {[10, 22, 34, 46].map((x) => (
        <ellipse key={x} cx={x + 4} cy="24" rx="10" ry="14" strokeWidth="1.8" />
      ))}
    </Svg>
  ),
};

// ---------- giriş kutuları ----------

/** Büyük, okunaklı fiyat kutusu: sayı + birim. */
function Fiyat({ deger, birim = "₺/m", onChange, etiket }: { deger: number; birim?: string; onChange: (v: number) => void; etiket: string }) {
  return (
    <label className="flex items-center rounded-xl bg-white/5 pr-3 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-ac-kirmizi">
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        aria-label={etiket}
        value={Number.isFinite(deger) ? deger : ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value)))}
        onFocus={(e) => e.target.select()}
        className="w-full min-w-0 bg-transparent px-3 py-2.5 text-right text-lg font-extrabold tabular-nums outline-none"
      />
      <span className="shrink-0 text-sm font-semibold text-[var(--metin-2)]">{birim}</span>
    </label>
  );
}

function Metin({ deger, onChange, tip = "text", etiket }: { deger: string; onChange: (v: string) => void; tip?: string; etiket: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--metin-2)]">{etiket}</span>
      <input
        type={tip}
        value={deger}
        placeholder={etiket}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-base font-semibold outline-none ring-1 ring-white/10 placeholder:font-normal placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi"
      />
    </label>
  );
}

/** Resimli tek kalem kartı: çizim + ad + açıklama + fiyat kutusu. */
function Kalem({ cizim, ad, alt, children }: { cizim: ReactNode; ad: string; alt?: string; children: ReactNode }) {
  return (
    <div className="cam flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-ac-mavi/10 p-2 text-sky-200 ring-1 ring-ac-mavi/30">{cizim}</div>
        <div className="min-w-0">
          <div className="font-bold">{ad}</div>
          {alt && <div className="text-xs leading-snug text-[var(--metin-2)]">{alt}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Bir ürün tipi (tel/direk) ve ölçüye göre fiyat ızgarası. */
function UrunKarti({ cizim, ad, alt, children }: { cizim: ReactNode; ad: string; alt: string; children: ReactNode }) {
  return (
    <div className="cam grid gap-4 rounded-2xl p-4 md:grid-cols-[200px_1fr] md:p-5">
      <div className="flex items-center gap-4 md:flex-col md:items-start">
        <div className="h-24 w-36 shrink-0 rounded-xl bg-ac-mavi/10 p-2 text-sky-200 ring-1 ring-ac-mavi/30 md:w-full">{cizim}</div>
        <div>
          <div className="text-lg font-extrabold">{ad}</div>
          <div className="text-xs text-[var(--metin-2)]">{alt}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

function OlcuFiyat({ ust, alt, children }: { ust: string; alt?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-sm font-bold">{ust}</div>
      {children}
      {alt && <div className="mt-1 text-[11px] text-[var(--metin-2)]">{alt}</div>}
    </div>
  );
}

/**
 * Kafes tel metretül fiyatları: üstte yükseklik seçilir, altında göz aralığı (sütun) ×
 * tel kalınlığı (satır) tablosu. Teklifte seçilen üç özelliğin kesiştiği fiyat kullanılır.
 */
function KafesFiyatlari({ a, d }: { a: Ayarlar; d: (f: (x: Ayarlar) => void) => void }) {
  const tip = telTipi("kafes");
  const [h, setH] = useState(olcuAnahtari(tip.yukseklikler[Math.floor(tip.yukseklikler.length / 2)]));
  const [yuzde, setYuzde] = useState(0);
  const toplu = () =>
    yuzde &&
    d((x) => {
      for (const g of Object.values(x.kafesMetre[h] ?? {}))
        for (const k of Object.keys(g)) g[k] = Math.round(g[k] * (1 + yuzde / 100));
    });

  return (
    <div className="cam space-y-4 rounded-2xl p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-28 shrink-0 rounded-xl bg-ac-mavi/10 p-2 text-sky-200 ring-1 ring-ac-mavi/30">
          <TelIkon tip="kafes" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold">{tip.ad}</div>
          <div className="text-sm text-[var(--metin-2)]">Metretül fiyatı · yüksekliğe, göz aralığına ve tel kalınlığına göre</div>
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[var(--metin-2)]">Yükseklik</div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kafes tel yüksekliği">
          {tip.yukseklikler.map((y) => {
            const k = olcuAnahtari(y);
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={h === k}
                onClick={() => setH(k)}
                className={`rounded-xl px-4 py-2 text-base font-extrabold tabular-nums transition ${
                  h === k ? "bg-ac-kirmizi text-white shadow-[0_6px_20px_-8px_var(--color-ac-kirmizi)]" : "bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                }`}
              >
                {sayi(y, 2)} m
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-2">
          <thead>
            <tr>
              <th className="w-32 text-left text-xs font-bold uppercase tracking-wider text-[var(--metin-2)]">Tel ↓ · Göz →</th>
              {tip.gozler.map((g) => (
                <th key={g} className="text-center text-sm font-extrabold">
                  {g} mm göz
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tip.kalinliklar.map((kal) => {
              const kk = olcuAnahtari(kal);
              return (
                <tr key={kk}>
                  <th className="text-left text-sm font-extrabold">{sayi(kal, 1)} mm tel</th>
                  {tip.gozler.map((g) => {
                    const gk = olcuAnahtari(g);
                    return (
                      <td key={gk}>
                        <Fiyat
                          etiket={`Kafes tel ${sayi(Number(h), 2)} m · ${g} mm göz · ${sayi(kal, 1)} mm`}
                          birim="₺/mt"
                          deger={a.kafesMetre[h]?.[gk]?.[kk] ?? 0}
                          onChange={(v) =>
                            d((x) => {
                              const gz = ((x.kafesMetre[h] ??= {})[gk] ??= {});
                              gz[kk] = v;
                            })
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-sm">
        <span className="text-[var(--metin-2)]">{sayi(Number(h), 2)} m tablosunun hepsine</span>
        <label className="flex items-center rounded-lg bg-white/5 pr-2 ring-1 ring-white/10">
          <input
            type="number"
            step="any"
            aria-label="Toplu fiyat değişimi yüzdesi"
            value={yuzde || ""}
            placeholder="0"
            onChange={(e) => setYuzde(parseFloat(e.target.value) || 0)}
            className="w-16 bg-transparent px-2 py-1.5 text-right font-bold tabular-nums outline-none"
          />
          <span className="text-[var(--metin-2)]">%</span>
        </label>
        <button type="button" onClick={toplu} disabled={!yuzde} className="rounded-lg bg-white/10 px-3 py-1.5 font-bold ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-50">
          {yuzde < 0 ? "indirim uygula" : "zam uygula"}
        </button>
      </div>
    </div>
  );
}

/**
 * Demir (profil / boru) direk maliyeti: boydan bağımsız sabit kalemler + boy × metre fiyatı.
 * Örnek hesap canlı gösterilir; kısa direk asgari boyun altında fiyatlanmaz.
 */
function DemirDirekMaliyeti({ a, d }: { a: Ayarlar; d: (f: (x: Ayarlar) => void) => void }) {
  const m = a.demirDirek;
  const kalemler = [
    ["kaynak", "Kaynak işçiliği", "Kapak, kaş, klips yuvası kaynakları"],
    ["kapak", "Tepe kapağı", "Direk başına"],
    ["boya", "Boya", "Galvaniz dışı renkte (payandada yarısı)"],
    ["nakliye", "Nakliye / elleçleme", "Direk başına pay"],
    ["diger", "Diğer", "Kesim, delik, ambalaj vb."],
    ["payandaSabit", "Payanda sabit", "Kesim + kaynak, payanda başına"],
  ] as const;
  const sabit = m.kaynak + m.kapak + m.nakliye + m.diger;
  const olcu = DIREK_TIPLERI.find((x) => x.id === "profil")!.olculer[1] ?? "50x50";
  const metre = a.direkMetre.profil[olcu] ?? 0;
  const ornekBoy = 2.25;
  return (
    <div className="cam space-y-4 rounded-2xl p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-24 shrink-0 rounded-xl bg-ac-mavi/10 p-2 text-sky-200 ring-1 ring-ac-mavi/30">
          <DirekIkon tip="profil" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-extrabold">Demir direk maliyeti (profil ve boru)</div>
          <div className="text-sm text-[var(--metin-2)]">
            Direk fiyatı = sabit kalemler + boy × metre fiyatı. Direk ne kadar kısa olursa olsun sabit kalemlerin ve asgari boyun altına inilmez.
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kalemler.map(([anahtar, ad, alt]) => (
          <OlcuFiyat key={anahtar} ust={ad} alt={alt}>
            <Fiyat etiket={ad} birim={anahtar === "payandaSabit" ? "₺/payanda" : "₺/direk"} deger={m[anahtar]} onChange={(v) => d((x) => void (x.demirDirek[anahtar] = v))} />
          </OlcuFiyat>
        ))}
        <OlcuFiyat ust="Asgari fiyat boyu" alt="Daha kısa direk bu boyun malzemesiyle fiyatlanır">
          <Fiyat etiket="Asgari fiyat boyu" birim="m" deger={m.asgariBoy} onChange={(v) => d((x) => void (x.demirDirek.asgariBoy = v))} />
        </OlcuFiyat>
      </div>
      <div className="rounded-xl bg-white/5 p-3 text-sm ring-1 ring-white/10">
        <div className="mb-1 font-bold">Örnek: Profil {olcu}, {sayi(ornekBoy, 2)} m direk</div>
        <div className="grid gap-x-6 gap-y-0.5 tabular-nums sm:grid-cols-2">
          <span className="text-[var(--metin-2)]">Sabit (galvaniz, toprakta)</span>
          <span>{tl(sabit)}</span>
          <span className="text-[var(--metin-2)]">Malzeme {sayi(Math.max(ornekBoy, m.asgariBoy), 2)} m × {tl(metre)}</span>
          <span>{tl(Math.max(ornekBoy, m.asgariBoy) * metre)}</span>
          <span className="text-[var(--metin-2)]">+ boyalı renk / + flanş (beton zemin)</span>
          <span>
            +{tl(m.boya)} / +{tl(a.flansAdet)}
          </span>
          <span className="font-bold">Galvaniz, toprakta direk</span>
          <span className="font-bold">{tl(sabit + Math.max(ornekBoy, m.asgariBoy) * metre)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- bölümler ----------

const BOLUMLER = [
  { id: "firma", ad: "Firma", aciklama: "Teklifin altında görünen bilgiler" },
  { id: "tel", ad: "Tel fiyatları", aciklama: "Metretül fiyatı · yükseklik, göz ve kalınlığa göre" },
  { id: "direk", ad: "Direk fiyatları", aciklama: "Metre fiyatı ve demir direk sabit maliyeti" },
  { id: "beton", ad: "Beton zemin", aciklama: "Flanşlı demir direk ve dübel" },
  { id: "baglanti", ad: "Bağlantı", aciklama: "Gergi, kelepçe, bağ teli" },
  { id: "kapi", ad: "Kapılar", aciklama: "Çitteki kapılar, adet fiyatı" },
  { id: "aracKapi", ad: "Araç kapısı", aciklama: "Araç kapısı planlayıcı: m² ve aksesuar fiyatları" },
  { id: "yayaKapi", ad: "Yaya kapısı", aciklama: "Yaya kapısı planlayıcı: m² ve kilit fiyatları" },
  { id: "hizmet", ad: "Hizmetler ve vergi", aciklama: "Montaj, temel, nakliye, KDV" },
] as const;
type BolumId = (typeof BOLUMLER)[number]["id"];

const MENU_IKON: Record<BolumId, ReactNode> = {
  firma: CIZIM.gecerlilik,
  tel: <TelIkon tip="kafes" />,
  direk: <DirekIkon tip="profil" />,
  beton: <ZeminIkon zemin="beton" />,
  baglanti: CIZIM.kelepce,
  kapi: <KapiIkon arac />,
  aracKapi: <KapiIkon arac />,
  yayaKapi: <KapiIkon arac={false} />,
  hizmet: CIZIM.nakliye,
};

/** Ekranda yalnız soldan seçilen bölüm görünür (kaydırarak bölümler arası geçiş yok). */
const AktifBolum = createContext<BolumId>("firma");

function Bolum({ id, ikon, children }: { id: BolumId; ikon: ReactNode; children: ReactNode }) {
  const b = BOLUMLER.find((x) => x.id === id)!;
  if (useContext(AktifBolum) !== id) return null;
  return (
    <section id={`ayar-${id}`} data-bolum={id} className="scroll-mt-4 space-y-4">
      <header className="flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="h-10 w-12 text-ac-kirmizi-acik">{ikon}</div>
        <div>
          <h3 className="text-xl font-extrabold uppercase tracking-wider">{b.ad}</h3>
          <p className="text-sm text-[var(--metin-2)]">{b.aciklama}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

/** Tam ekran ayarlar: solda bölüm menüsü, sağda resimli fiyat kartları. */
export function AyarPaneli({ kapat, ilkBolum = "firma" }: { kapat: () => void; ilkBolum?: BolumId }) {
  const { ayarlar: a, degistir, varsayilanaDon } = useAyarlar();
  const icerik = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState<BolumId>(ilkBolum);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  const git = (id: BolumId) => {
    setAktif(id);
    icerik.current?.scrollTo({ top: 0 });
  };

  const ornekBoy = (gomme: number) => Math.ceil((1.5 + gomme) * 4) / 4; // 1,5 m çit için direk boyu
  const d = (f: (x: typeof a) => void) => degistir(f);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayarlar"
      className="yukari fixed inset-0 z-50 flex flex-col bg-[linear-gradient(160deg,var(--color-ac-gece)_0%,var(--color-ac-gece-2)_100%)]"
    >
      <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="hidden rounded-lg bg-[#fff] px-2.5 py-1.5 sm:block">
          <Image src={varlik("/logo.png")} alt="AC Tel Örgü" width={120} height={21} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold uppercase tracking-wider">Ayarlar</h2>
          <p className="truncate text-xs text-[var(--metin-2)]">
            Fiyatlar KDV hariç · yeni teklifleri etkiler, verilmiş teklifler kendi fiyatlarıyla kalır · değişiklikler anında kaydedilir
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => confirm("Tüm fiyatlar ve firma bilgileri varsayılana dönsün mü?") && varsayilanaDon()}
            className="hidden rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold ring-1 ring-white/15 hover:bg-white/20 sm:block"
          >
            Varsayılana dön
          </button>
          <button type="button" autoFocus onClick={kapat} className="rounded-xl bg-ac-kirmizi px-5 py-2.5 font-extrabold uppercase tracking-wider hover:bg-ac-kirmizi-acik">
            Kapat ✕
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Bölüm menüsü: masaüstünde solda, telefonda üstte kaydırılabilir */}
        <nav aria-label="Ayar bölümleri" className="ince-kaydirma flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3 lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:p-4">
          {BOLUMLER.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => git(b.id)}
              aria-current={aktif === b.id}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition lg:w-full ${
                aktif === b.id ? "bg-ac-kirmizi text-white shadow-[0_8px_24px_-8px_var(--color-ac-kirmizi)]" : "text-[var(--metin-2)] hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="h-7 w-9 shrink-0">{MENU_IKON[b.id]}</span>
              <span className="whitespace-nowrap text-sm font-bold">{b.ad}</span>
            </button>
          ))}
        </nav>

        <div ref={icerik} className="ince-kaydirma min-h-0 flex-1 overflow-y-auto">
          <AktifBolum.Provider value={aktif}>
          <div key={aktif} className="yukari mx-auto max-w-5xl space-y-12 p-4 sm:p-6 lg:p-8">
            <Bolum id="firma" ikon={CIZIM.gecerlilik}>
              <div className="cam grid gap-4 rounded-2xl p-4 sm:grid-cols-2 md:p-5">
                <div className="sm:col-span-2">
                  <Metin etiket="Firma adı" deger={a.firma.ad} onChange={(v) => d((x) => void (x.firma.ad = v))} />
                </div>
                <Metin tip="tel" etiket="Telefon" deger={a.firma.telefon} onChange={(v) => d((x) => void (x.firma.telefon = v))} />
                <Metin tip="email" etiket="E-posta" deger={a.firma.eposta} onChange={(v) => d((x) => void (x.firma.eposta = v))} />
                <Metin etiket="Web sitesi" deger={a.firma.web} onChange={(v) => d((x) => void (x.firma.web = v))} />
                <Metin etiket="Adres" deger={a.firma.adres} onChange={(v) => d((x) => void (x.firma.adres = v))} />
              </div>
              <div className="cam space-y-2 rounded-2xl p-4 md:p-5">
                <div className="font-bold">Satışçılar</div>
                <div className="text-xs text-[var(--metin-2)]">Teklifte “Teklifi veren” menüsünde çıkar. Her satıra bir isim.</div>
                <textarea
                  aria-label="Satışçılar, her satıra bir isim"
                  rows={Math.max(3, a.satiscilar.length + 1)}
                  defaultValue={a.satiscilar.join("\n")}
                  onBlur={(e) => {
                    const liste = [...new Set(e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))];
                    d((x) => void (x.satiscilar = liste));
                  }}
                  className="w-full max-w-sm resize-y rounded-xl bg-white/5 px-3 py-2.5 text-base font-semibold leading-7 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-ac-kirmizi"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Kalem cizim={CIZIM.gecerlilik} ad="Teklif geçerlilik süresi" alt="PDF'te bitiş tarihiyle yazılır">
                  <Fiyat etiket="Teklif geçerlilik süresi" birim="gün" deger={a.gecerlilikGun} onChange={(v) => d((x) => void (x.gecerlilikGun = Math.max(1, Math.round(v))))} />
                </Kalem>
              </div>
            </Bolum>

            <Bolum id="tel" ikon={<TelIkon tip="kafes" />}>
              <KafesFiyatlari a={a} d={d} />
              {TEL_TIPLERI.filter((t) => t.id !== "dikenli" && t.id !== "kafes").map((tip) => {
                const id = tip.id as Exclude<typeof tip.id, "dikenli">;
                return (
                  <UrunKarti key={tip.id} cizim={<TelIkon tip={tip.id} />} ad={tip.ad} alt={`${tip.aciklama} · çit metresi başı`}>
                    {tip.yukseklikler.map((h) => {
                      const k = yukseklikAnahtari(h);
                      return (
                        <OlcuFiyat key={k} ust={`${sayi(h, 2)} m yükseklik`}>
                          <Fiyat etiket={`${tip.ad} ${sayi(h, 2)} m`} deger={a.telMetre[id][k] ?? 0} onChange={(v) => d((x) => void (x.telMetre[id][k] = v))} />
                        </OlcuFiyat>
                      );
                    })}
                  </UrunKarti>
                );
              })}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kalem cizim={<TelIkon tip="dikenli" />} ad="Dikenli tel" alt="Tek sıra, metre başı. Üst dikenli de bunu kullanır.">
                  <Fiyat etiket="Dikenli tel" deger={a.dikenliMetre} onChange={(v) => d((x) => void (x.dikenliMetre = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.jiletli} ad="Helezon jiletli" alt="Çit metresi başı, helezon çapına göre">
                  <div className="grid grid-cols-2 gap-2">
                    {DUZLEMSEL_CAPLAR.map((c) => (
                      <OlcuFiyat key={c} ust={`Ø${c} cm`}>
                        <Fiyat etiket={`Helezon jiletli Ø${c} cm`} deger={a.jiletliCapMetre[String(c)] ?? 0} onChange={(v) => d((x) => void (x.jiletliCapMetre[String(c)] = v))} />
                      </OlcuFiyat>
                    ))}
                  </div>
                </Kalem>
                <Kalem cizim={CIZIM.jiletli} ad="Düzlemsel jiletli" alt="Çit metresi başı, halka çapına göre">
                  <div className="grid grid-cols-2 gap-2">
                    {DUZLEMSEL_CAPLAR.map((c) => (
                      <OlcuFiyat key={c} ust={`Ø${c} cm`}>
                        <Fiyat etiket={`Düzlemsel jiletli Ø${c} cm`} deger={a.duzlemselCapMetre[String(c)] ?? 0} onChange={(v) => d((x) => void (x.duzlemselCapMetre[String(c)] = v))} />
                      </OlcuFiyat>
                    ))}
                  </div>
                </Kalem>
                <Kalem cizim={CIZIM.pvc} ad="PVC kaplama farkı" alt="Tel fiyatına eklenir">
                  <Fiyat etiket="PVC kaplama farkı" birim="%" deger={a.pvcFarkYuzde} onChange={(v) => d((x) => void (x.pvcFarkYuzde = v))} />
                </Kalem>
              </div>
            </Bolum>

            <Bolum id="direk" ikon={<DirekIkon tip="profil" />}>
              {DIREK_TIPLERI.map((dt) => (
                <UrunKarti key={dt.id} cizim={<DirekIkon tip={dt.id} />} ad={dt.ad} alt={`${dt.aciklama} · direk boyunun metresi`}>
                  {dt.olculer.map((o) => {
                    const f = a.direkMetre[dt.id][o] ?? 0;
                    const boy = ornekBoy(dt.gomme);
                    return (
                      <OlcuFiyat
                        key={o}
                        ust={o}
                        alt={`${sayi(boy, 2)} m direk ≈ ${tl(
                          dt.id === "beton"
                            ? f * boy
                            : a.demirDirek.kaynak + a.demirDirek.kapak + a.demirDirek.nakliye + a.demirDirek.diger + f * Math.max(boy, a.demirDirek.asgariBoy),
                        )}${dt.id === "beton" ? "" : " (sabit dahil)"}`}
                      >
                        <Fiyat etiket={`${dt.ad} ${o}`} deger={f} onChange={(v) => d((x) => void (x.direkMetre[dt.id][o] = v))} />
                      </OlcuFiyat>
                    );
                  })}
                </UrunKarti>
              ))}
              <DemirDirekMaliyeti a={a} d={d} />
              <p className="rounded-xl bg-ac-mavi/10 p-3 text-sm text-sky-100 ring-1 ring-ac-mavi/30">
                Direk boyu = çit yüksekliği + gömme payı (toprakta; betonda gömme yok) + kaşlıysa {sayi(KAS_UZUNLUK * 100, 0)} cm. Köşe ve gergi direkleri bir
                üst ölçüden hesaplanır.
              </p>
            </Bolum>

            <Bolum id="beton" ikon={<ZeminIkon zemin="beton" />}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kalem cizim={CIZIM.flans} ad="Flanş (ayak plakası)" alt="Beton zemin ve duvar üstünde demir direğe eklenir">
                  <Fiyat etiket="Flanş (ayak plakası)" birim="₺/direk" deger={a.flansAdet} onChange={(v) => d((x) => void (x.flansAdet = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.dubel} ad="Dübel" alt="Adet fiyatı">
                  <Fiyat etiket="Dübel" birim="₺/adet" deger={a.dubelAdet} onChange={(v) => d((x) => void (x.dubelAdet = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.flans} ad="Direk başına dübel" alt="Her flanşa atılan dübel">
                  <Fiyat etiket="Direk başına dübel" birim="adet" deger={a.dubelDirek} onChange={(v) => d((x) => void (x.dubelDirek = Math.round(v)))} />
                </Kalem>
                <Kalem cizim={CIZIM.dubel} ad="Payanda başına dübel" alt="Payanda ayağı sabitlenmiyorsa 0">
                  <Fiyat etiket="Payanda başına dübel" birim="adet" deger={a.dubelPayanda} onChange={(v) => d((x) => void (x.dubelPayanda = Math.round(v)))} />
                </Kalem>
              </div>
            </Bolum>

            <Bolum id="baglanti" ikon={CIZIM.kelepce}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kalem cizim={CIZIM.gergiTeli} ad="Gergi teli" alt="Kafes ve tavuk telinde">
                  <Fiyat etiket="Gergi teli" deger={a.gergiTeliMetre} onChange={(v) => d((x) => void (x.gergiTeliMetre = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.gergiDemiri} ad="Gergi demiri" alt="Payandalı direklerde">
                  <Fiyat etiket="Gergi demiri" birim="₺/adet" deger={a.gergiDemiri} onChange={(v) => d((x) => void (x.gergiDemiri = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.kelepce} ad="Panel kelepçesi" alt="Panel çitte direk başına 3–4">
                  <Fiyat etiket="Panel kelepçesi" birim="₺/adet" deger={a.kelepce} onChange={(v) => d((x) => void (x.kelepce = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.bagTeli} ad="Bağ teli" alt="Kilogram fiyatı">
                  <Fiyat etiket="Bağ teli" birim="₺/kg" deger={a.bagTeliKg} onChange={(v) => d((x) => void (x.bagTeliKg = v))} />
                </Kalem>
              </div>
            </Bolum>

            <Bolum id="kapi" ikon={<KapiIkon arac />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Kalem cizim={<KapiIkon arac={false} />} ad="Yaya kapısı" alt="Tek kanat">
                  <Fiyat etiket="Yaya kapısı" birim="₺/adet" deger={a.kapiYaya} onChange={(v) => d((x) => void (x.kapiYaya = v))} />
                </Kalem>
                <Kalem cizim={<KapiIkon arac />} ad="Araç kapısı" alt="Çift kanat">
                  <Fiyat etiket="Araç kapısı" birim="₺/adet" deger={a.kapiArac} onChange={(v) => d((x) => void (x.kapiArac = v))} />
                </Kalem>
              </div>
              <div className="cam space-y-4 rounded-2xl p-4 md:p-5">
                <div>
                  <div className="text-lg font-extrabold">Kapı babaları</div>
                  <div className="text-sm text-[var(--metin-2)]">
                    Kapının iki yanındaki kalın demir kolonlar; o noktadaki çit direğinin yerine geçer. Fiyat = demir direk sabit maliyeti (+ flanş) + boy × metre.
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["yayaOlcu", "Yaya kapısı babası"],
                      ["aracOlcu", "Araç kapısı babası"],
                    ] as const
                  ).map(([anahtar, ad]) => (
                    <div key={anahtar}>
                      <div className="mb-1.5 text-sm font-bold">{ad}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.keys(a.kapiBabasi.metre).map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => d((x) => void (x.kapiBabasi[anahtar] = o))}
                            className={`cam rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-[var(--yuzey-2)] ${a.kapiBabasi[anahtar] === o ? "secili" : ""}`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.keys(a.kapiBabasi.metre).map((o) => (
                    <OlcuFiyat key={o} ust={`Baba ${o}`}>
                      <Fiyat etiket={`Kapı babası ${o}`} deger={a.kapiBabasi.metre[o] ?? 0} onChange={(v) => d((x) => void (x.kapiBabasi.metre[o] = v))} />
                    </OlcuFiyat>
                  ))}
                </div>
              </div>
            </Bolum>

            <Bolum id="aracKapi" ikon={<KapiIkon arac />}>
              <div className="cam overflow-x-auto rounded-2xl p-4 md:p-5">
                <div className="mb-2 font-bold">Kanat fiyatı · ₺ / m²</div>
                <table className="w-full min-w-[560px] border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="w-36 text-left text-xs font-bold uppercase tracking-wider text-[var(--metin-2)]">Tip ↓ · Dolgu →</th>
                      {KAPI_DOLGULARI.map((g) => (
                        <th key={g.id} className="text-center text-sm font-extrabold">
                          {g.ad}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {KAPI_TIPLERI.map((tp) => (
                      <tr key={tp.id}>
                        <th className="text-left text-sm font-extrabold">{tp.ad}</th>
                        {KAPI_DOLGULARI.map((g) => (
                          <td key={g.id}>
                            <Fiyat
                              etiket={`${tp.ad} ${g.ad} m² fiyatı`}
                              birim="₺/m²"
                              deger={a.aracKapi.m2[tp.id]?.[g.id] ?? 0}
                              onChange={(v) => d((x) => void (x.aracKapi.m2[tp.id][g.id] = v))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-xs text-[var(--metin-2)]">Uçan kapıda kanat, kuyruğuyla açıklığın 1,5 katı uzunluktan hesaplanır.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["motorSurgulu", "Sürgü motoru + 2 kumanda", "Raylı sürgülü ve uçan kapı", "₺/takım"],
                    ["motorKanat", "Kanat kol motoru", "Kanat başına; çift kanatta 2 adet", "₺/adet"],
                    ["fotosel", "Fotosel (çift)", "Güvenlik fotoseli", "₺/takım"],
                    ["flasor", "Flaşör lamba", "Hareket uyarı ışığı", "₺/adet"],
                    ["rayMetre", "Ray / beton temel", "Raylıda 2× açıklık, konsolda kuyruk boyu", "₺/m"],
                    ["montaj", "Kapı montajı", "Kapı başına", "₺/adet"],
                    ["mizrakMetre", "Mızrak uç", "Kanat üstü, kanat metresi başı", "₺/m"],
                  ] as const
                ).map(([anahtar, ad, alt, birim]) => (
                  <Kalem key={anahtar} cizim={<KapiIkon arac />} ad={ad} alt={alt}>
                    <Fiyat etiket={ad} birim={birim} deger={a.aracKapi[anahtar]} onChange={(v) => d((x) => void (x.aracKapi[anahtar] = v))} />
                  </Kalem>
                ))}
              </div>
            </Bolum>

            <Bolum id="yayaKapi" ikon={<KapiIkon arac={false} />}>
              <div className="cam overflow-x-auto rounded-2xl p-4 md:p-5">
                <div className="mb-2 font-bold">Kanat fiyatı · ₺ / m²</div>
                <table className="w-full min-w-[560px] border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="w-40 text-left text-xs font-bold uppercase tracking-wider text-[var(--metin-2)]">Tip ↓ · Dolgu →</th>
                      {KAPI_DOLGULARI.map((g) => (
                        <th key={g.id} className="text-center text-sm font-extrabold">
                          {g.ad}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {YAYA_KAPI_TIPLERI.map((tp) => (
                      <tr key={tp.id}>
                        <th className="text-left text-sm font-extrabold">{tp.ad}</th>
                        {KAPI_DOLGULARI.map((g) => (
                          <td key={g.id}>
                            <Fiyat
                              etiket={`${tp.ad} ${g.ad} m² fiyatı`}
                              birim="₺/m²"
                              deger={a.yayaKapi.m2[tp.id]?.[g.id] ?? 0}
                              onChange={(v) => d((x) => void (x.yayaKapi.m2[tp.id][g.id] = v))}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["kilit", "Silindir kilit + kol", "Kapı başına", "₺/takım"],
                    ["elektrikliKilit", "Elektrikli kilit + kart okuyucu", "Geçiş kontrolü", "₺/takım"],
                    ["gommeKolon", "Kolon betona gömme", "Kolon başına, temel ve beton", "₺/kolon"],
                    ["flansKolon", "Flanşlı kolon ayağı", "Kolon başına, flanş + dübel", "₺/kolon"],
                    ["mizrakMetre", "Mızrak uç", "Kanat üstü, kanat metresi başı", "₺/m"],
                    ["montaj", "Kapı montajı", "Kapı başına", "₺/adet"],
                  ] as const
                ).map(([anahtar, ad, alt, birim]) => (
                  <Kalem key={anahtar} cizim={<KapiIkon arac={false} />} ad={ad} alt={alt}>
                    <Fiyat etiket={`Yaya ${ad}`} birim={birim} deger={a.yayaKapi[anahtar]} onChange={(v) => d((x) => void (x.yayaKapi[anahtar] = v))} />
                  </Kalem>
                ))}
              </div>
            </Bolum>

            <Bolum id="hizmet" ikon={CIZIM.nakliye}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Kalem cizim={CIZIM.montaj} ad="Montaj işçiliği" alt="Çit metresi başı">
                  <Fiyat etiket="Montaj işçiliği" deger={a.montajMetre} onChange={(v) => d((x) => void (x.montajMetre = v))} />
                </Kalem>
                <Kalem cizim={<ZeminIkon zemin="duvar" />} ad="Duvar üstü montaj" alt="Beton duvar üstüne kurulumda metre başı">
                  <Fiyat etiket="Duvar üstü montaj" deger={a.montajDuvarMetre} onChange={(v) => d((x) => void (x.montajDuvarMetre = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.temel} ad="Direk beton temeli" alt="Yalnızca toprak arazide">
                  <Fiyat etiket="Direk beton temeli" birim="₺/direk" deger={a.temelDirek} onChange={(v) => d((x) => void (x.temelDirek = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.nakliye} ad="Nakliye (sabit)" alt="Her teklife bir kez">
                  <Fiyat etiket="Nakliye (sabit)" birim="₺" deger={a.nakliyeSabit} onChange={(v) => d((x) => void (x.nakliyeSabit = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.nakliye} ad="Nakliye (mesafe)" alt="Kilometre başı">
                  <Fiyat etiket="Nakliye (mesafe)" birim="₺/km" deger={a.nakliyeKm} onChange={(v) => d((x) => void (x.nakliyeKm = v))} />
                </Kalem>
                <Kalem cizim={CIZIM.kdv} ad="KDV" alt="Ara toplama eklenir">
                  <Fiyat etiket="KDV" birim="%" deger={a.kdvYuzde} onChange={(v) => d((x) => void (x.kdvYuzde = v))} />
                </Kalem>
              </div>
            </Bolum>

            <button
              type="button"
              onClick={() => confirm("Tüm fiyatlar ve firma bilgileri varsayılana dönsün mü?") && varsayilanaDon()}
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/15 hover:bg-white/20 sm:hidden"
            >
              Varsayılana dön
            </button>
          </div>
          </AktifBolum.Provider>
        </div>
      </div>
    </div>
  );
}
