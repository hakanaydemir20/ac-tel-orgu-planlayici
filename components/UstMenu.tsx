"use client";
import Image from "next/image";
import Link from "next/link";
import { varlik } from "@/lib/yol";
import { TemaDugmesi } from "./TemaDugmesi";

/**
 * Tüm planlayıcıların ortak üst menüsü: logo, başlık, (soru-cevap), kaydet, teklif yazdır,
 * teklifler, yeni teklif, ayarlar ve tema. Her planlayıcı aynı düzeni ve görünümü kullanır.
 */
export function UstMenu({
  baslik,
  soruCevap,
  kaydet,
  kayitli,
  kaydedildi,
  yazdir,
  hazirlanan,
  bos,
  teklifler,
  kayitSayisi,
  yeni,
  ayarlar,
}: {
  baslik: string;
  soruCevap?: () => void;
  kaydet: () => void;
  kayitli: boolean;
  kaydedildi: boolean;
  yazdir: () => void;
  hazirlanan: "yazdir" | "indir" | null;
  bos: boolean;
  teklifler: () => void;
  kayitSayisi: number;
  yeni: () => void;
  ayarlar: () => void;
}) {
  return (
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 sm:px-6">
        <Link href="/" title="Ana sayfa" className="rounded-lg bg-[#fff] px-2.5 py-1.5 shadow-[0_0_24px_-6px_rgba(10,132,198,0.8)] transition hover:scale-[1.03]">
          <Image src={varlik("/logo.png")} alt="AC Tel Örgü · ana sayfa" width={150} height={26} priority />
        </Link>
        <div className="hidden h-6 w-px bg-white/15 sm:block" />
        <h1 className="hidden text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--metin-2)] sm:block">
          {baslik}
        </h1>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {soruCevap && (
          <button
            type="button"
            onClick={soruCevap}
            aria-label="Soru-cevap ile planla"
            title="Adım adım sorularla planla"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ac-mavi/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-ac-mavi/60 transition hover:bg-ac-mavi/35 sm:px-4"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-ac-mavi text-[10px] font-black text-white">?</span>
            <span className="hidden sm:inline">Soru-cevap</span>
          </button>
          )}
          <button
            type="button"
            onClick={kaydet}
            disabled={bos}
            aria-label={kayitli ? "Kaydı güncelle" : "Teklifi kaydet"}
            className={`cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] disabled:opacity-60 sm:px-4 ${kaydedildi ? "text-emerald-300 ring-1 ring-emerald-400/60" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              {kaydedildi ? (
                <path d="m5 12 5 5L20 7" strokeLinecap="round" />
              ) : (
                <path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7" />
              )}
            </svg>
            <span className="hidden sm:inline">{kaydedildi ? "Kaydedildi" : kayitli ? "Kaydı güncelle" : "Kaydet"}</span>
          </button>
          <button
            type="button"
            onClick={yazdir}
            disabled={!!hazirlanan || bos}
            aria-label="Teklif yazdır"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-ac-kirmizi px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[0_6px_20px_-6px_var(--color-ac-kirmizi)] transition hover:bg-ac-kirmizi-acik disabled:opacity-60 sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
              <rect x="6" y="14" width="12" height="7" />
            </svg>
            <span className="hidden sm:inline">{hazirlanan === "yazdir" ? "Hazırlanıyor…" : "Teklif yazdır"}</span>
          </button>
          <button
            type="button"
            onClick={teklifler}
            aria-label="Kayıtlı teklifler"
            className="cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M4 4h11l5 5v11H4z" />
              <path d="M14 4v6h6M8 14h8M8 17h5" />
            </svg>
            <span className="hidden sm:inline">Teklifler</span>
            {kayitSayisi > 0 && <span className="rounded-full bg-ac-kirmizi px-1.5 text-[10px] leading-4">{kayitSayisi}</span>}
          </button>
          <button
            type="button"
            onClick={yeni}
            className="cam whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            + Yeni<span className="hidden sm:inline"> teklif</span>
          </button>
          <button
            type="button"
            onClick={ayarlar}
            aria-label="Ayarlar"
            className="cam flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[var(--yuzey-2)] sm:px-4"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
            <span className="hidden sm:inline">Ayarlar</span>
          </button>
          <TemaDugmesi />
        </div>
      </header>
  );
}
