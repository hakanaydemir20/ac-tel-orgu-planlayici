"use client";
// Hazırlanan teklifler bu cihazda saklanır; listeden tekrar açılabilir.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Kalem } from "./hesap";
import type { FirmaBilgisi } from "./katalog";
import type { Tasarim } from "./tasarim";

/** Arşivdeki teklif: tasarım (donmuş fiyatlarıyla), kalem kalem tutarlar ve toplamlar. */
export interface KayitliTeklif {
  no: string;
  tarih: string; // ISO, son kayıt
  musteri: string;
  satisci?: string;
  toplam: number; // KDV dahil
  telUzunluk: number;
  tasarim: Tasarim; // tasarim.fiyatlar: verildiği tarihteki fiyatlar
  kalemler?: Kalem[];
  araToplam?: number;
  kdv?: number;
  kdvYuzde?: number;
  firma?: FirmaBilgisi;
  /** Aynı teklifin önceki halleri (en yeni önde) */
  gecmis?: Omit<KayitliTeklif, "gecmis">[];
}

const EN_FAZLA_REVIZYON = 20;
const ozDegisti = (a: KayitliTeklif, b: KayitliTeklif) =>
  a.toplam !== b.toplam || JSON.stringify({ ...a.tasarim, teklifNo: "" }) !== JSON.stringify({ ...b.tasarim, teklifNo: "" });

const EN_FAZLA = 300;

interface Durum {
  liste: KayitliTeklif[];
  kaydet: (k: KayitliTeklif) => void;
  sil: (no: string) => void;
}

export const useTeklifler = create<Durum>()(
  persist(
    (set) => ({
      liste: [],
      // Aynı numara varsa güncellenir (önceki hali değiştiyse revizyon olarak saklanır); en yeni en üstte
      kaydet: (k) =>
        set((s) => {
          const eski = s.liste.find((x) => x.no === k.no);
          const yeni = structuredClone(k);
          if (eski) {
            const { gecmis = [], ...onceki } = eski;
            yeni.gecmis = ozDegisti(eski, yeni) ? [onceki, ...gecmis].slice(0, EN_FAZLA_REVIZYON) : gecmis;
          }
          return { liste: [yeni, ...s.liste.filter((x) => x.no !== k.no)].slice(0, EN_FAZLA) };
        }),
      sil: (no) => set((s) => ({ liste: s.liste.filter((x) => x.no !== no) })),
    }),
    {
      name: "ac-tel-teklifler",
      version: 1,
      skipHydration: true,
      partialize: (s) => ({ liste: s.liste }),
      merge: (kayitli, mevcut) => {
        const liste = (kayitli as { liste?: unknown } | undefined)?.liste;
        return { ...mevcut, liste: Array.isArray(liste) ? (liste as KayitliTeklif[]) : [] };
      },
    }
  )
);
