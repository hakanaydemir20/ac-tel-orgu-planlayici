"use client";
import { ReactNode, useId, useState } from "react";
import { sayiOku } from "@/lib/sayi";

/** Numaralı form adımı: kırmızı daire + büyük başlık. */
export function Adim({ no, baslik, ipucu, children }: { no: number; baslik: string; ipucu?: string; children: ReactNode }) {
  return (
    <section className="cam rounded-2xl p-4 sm:p-5 yukari">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ac-kirmizi text-lg font-extrabold shadow-[0_0_20px_-4px_var(--color-ac-kirmizi)]">
          {no}
        </span>
        <div>
          <h2 className="text-base font-extrabold uppercase tracking-wider">{baslik}</h2>
          {ipucu && <p className="text-xs text-[var(--metin-2)]">{ipucu}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Etiket({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--metin-2)]">{children}</div>;
}

/** Resimli seçim kartı. */
export function Kart({
  secili,
  onClick,
  resim,
  ad,
  alt,
  pasif,
  buyuk,
}: {
  secili: boolean;
  onClick: () => void;
  resim: ReactNode;
  ad: string;
  alt?: string;
  /** Seçilemez: sebebi alt yazıda / title'da söylenir */
  pasif?: string;
  buyuk?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!pasif}
      title={pasif}
      aria-pressed={secili}
      aria-label={ad}
      className={`cam group min-w-0 flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition enabled:hover:scale-[1.03] enabled:hover:bg-[var(--yuzey-2)] disabled:cursor-not-allowed disabled:opacity-40 ${
        secili ? "secili" : ""
      }`}
    >
      <div className={`${buyuk ? "h-16" : "h-12"} w-full transition ${secili ? "text-white" : "text-[var(--metin-2)] group-enabled:group-hover:text-white"}`}>
        {resim}
      </div>
      <div className="w-full text-[11px] [hyphens:auto] font-bold leading-tight sm:text-sm">{ad}</div>
      {(pasif ?? alt) && <div className="text-[11px] leading-tight text-[var(--metin-2)]">{pasif ?? alt}</div>}
    </button>
  );
}

/** Yan yana küçük seçenek düğmeleri (yükseklik, göz aralığı vb.). */
export function Secici<T extends string | number>({
  degerler,
  secili,
  onChange,
  bicim = (v) => String(v),
}: {
  degerler: readonly T[];
  secili: T;
  onChange: (v: T) => void;
  bicim?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {degerler.map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`cam min-w-14 rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-[var(--yuzey-2)] ${
            v === secili ? "secili" : ""
          }`}
        >
          {bicim(v)}
        </button>
      ))}
    </div>
  );
}

/**
 * Büyük, +/- düğmeli sayı girişi. Yazarken metin olduğu gibi kalır (silmek ya da "0," yazmak
 * değeri en küçüğe atlatmaz); geçerli her sayı hemen uygulanır, odak çıkınca kutu düzelir.
 */
export function SayiGiris({
  deger,
  onChange,
  birim = "m",
  adim = 1,
  min = 0,
  max = 10000,
  etiket,
  kucuk,
}: {
  deger: number;
  onChange: (v: number) => void;
  birim?: string;
  adim?: number;
  min?: number;
  max?: number;
  etiket?: string;
  kucuk?: boolean;
}) {
  const id = useId();
  const [metin, setMetin] = useState<string | null>(null); // null: kutu odakta değil
  const sinirla = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  const goster = Number.isFinite(deger) ? deger.toLocaleString("tr-TR", { maximumFractionDigits: 2, useGrouping: false }) : "";
  return (
    <div>
      {etiket && (
        <label htmlFor={id} className="block">
          <Etiket>{etiket}</Etiket>
        </label>
      )}
      <div className="cam flex items-center rounded-xl focus-within:ring-2 focus-within:ring-ac-kirmizi">
        <button
          type="button"
          aria-label={etiket ? `${etiket} azalt` : "Azalt"}
          onClick={() => onChange(sinirla(deger - adim))}
          className="px-3 py-2 text-xl font-bold text-[var(--metin-2)] hover:text-white"
        >
          −
        </button>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={metin ?? goster}
          onFocus={(e) => {
            setMetin(goster);
            e.target.select();
          }}
          onChange={(e) => {
            setMetin(e.target.value);
            const v = sayiOku(e.target.value);
            if (Number.isFinite(v)) onChange(sinirla(v));
          }}
          onBlur={() => setMetin(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const v = sinirla(deger + (e.key === "ArrowUp" ? adim : -adim));
              onChange(v);
              setMetin(v.toLocaleString("tr-TR", { maximumFractionDigits: 2, useGrouping: false }));
            }
          }}
          className={`w-full min-w-0 bg-transparent text-center font-extrabold outline-none ${kucuk ? "text-base" : "text-xl"}`}
        />
        <span className="pr-1 text-sm text-[var(--metin-2)]">{birim}</span>
        <button
          type="button"
          aria-label={etiket ? `${etiket} artır` : "Artır"}
          onClick={() => onChange(sinirla(deger + adim))}
          className="px-3 py-2 text-xl font-bold text-[var(--metin-2)] hover:text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Anahtar({ acik, onChange, children }: { acik: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      onClick={() => onChange(!acik)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-left text-sm font-semibold"
    >
      <span>{children}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${acik ? "bg-ac-kirmizi" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[#fff] shadow transition-all ${acik ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

/** ₺ biçimi; kuruş=true ise küçük birim fiyatlarda kuruşu gösterir (6,50 ₺). */
export const tl = (x: number, kurus = false) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: kurus && x % 1 ? 2 : 0 }).format(x);
export const sayi = (x: number, b = 1) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: b }).format(x);
