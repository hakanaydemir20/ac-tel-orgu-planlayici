"use client";
// Satış fiyatları ve firma bilgileri: satışçı Ayarlar penceresinden değiştirir, bu cihazda saklanır.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { birlestir } from "./birlestir";
import { useMemo } from "react";
import { Ayarlar, VARSAYILAN_AYARLAR, kafesTablosu } from "./katalog";
import type { Tasarim } from "./tasarim";

interface Durum {
  ayarlar: Ayarlar;
  degistir: (f: (a: Ayarlar) => void) => void;
  varsayilanaDon: () => void;
}

export const useAyarlar = create<Durum>()(
  persist(
    (set) => ({
      ayarlar: structuredClone(VARSAYILAN_AYARLAR),
      degistir: (f) =>
        set((s) => {
          const a = structuredClone(s.ayarlar);
          f(a);
          return { ayarlar: a };
        }),
      varsayilanaDon: () => set({ ayarlar: structuredClone(VARSAYILAN_AYARLAR) }),
    }),
    {
      name: "ac-tel-ayarlar",
      version: 1,
      skipHydration: true, // sunucu ile ilk çizim aynı olsun; Tasarimci yüklenince okur
      partialize: (s) => ({ ayarlar: s.ayarlar }),
      merge: (kayitli, mevcut) => ({
        ...mevcut,
        ayarlar: kafesGecisi(birlestir(VARSAYILAN_AYARLAR, (kayitli as { ayarlar?: unknown } | undefined)?.ayarlar), (kayitli as { ayarlar?: unknown } | undefined)?.ayarlar, true),
      }),
    }
  )
);

/**
 * Göz/kalınlık tablosundan önceki kayıtlarda kafes tel tek fiyattı (yükseklik başına).
 * Ayarlar'da o fiyatlar tablonun temeli olur; dondurulmuş teklifte ise her göz/kalınlık
 * aynı eski fiyatı alır, teklif tutarı değişmez.
 */
function kafesGecisi(a: Ayarlar, ham: unknown, katsayili: boolean): Ayarlar {
  const eski = typeof ham === "object" && ham !== null && !("kafesMetre" in ham);
  return eski ? { ...a, kafesMetre: kafesTablosu(a.telMetre.kafes, katsayili) } : a;
}

/**
 * Teklifin hesaplanacağı fiyatlar: teklif dondurulmuşsa kendi kopyası, değilse güncel Ayarlar.
 * Firma bilgileri (telefon, adres…) her zaman günceldir.
 */
export function etkinAyarlar(t: Pick<Tasarim, "fiyatlar">, guncel: Ayarlar): Ayarlar {
  if (!t.fiyatlar) return guncel;
  const ham = t.fiyatlar.ayarlar as unknown as Record<string, unknown>;
  const a = kafesGecisi(birlestir(VARSAYILAN_AYARLAR, ham), ham, false);
  // Demir direk sabit maliyetinden önce verilmiş teklif: eski modelle hesaplansın, tutarı değişmesin
  if (!("demirDirek" in ham))
    a.demirDirek = { kaynak: 0, kapak: 0, boya: 0, nakliye: 0, diger: 0, asgariBoy: 0, payandaSabit: 0, eskiModel: true };
  // Kapı babasından önce verilmiş teklif: babasız (eski direklerle) hesaplansın
  if (!("kapiBabasi" in ham)) a.kapiBabasi = { ...a.kapiBabasi, etkin: false };
  return { ...a, firma: guncel.firma };
}

export function useEtkinAyarlar(t: Pick<Tasarim, "fiyatlar">) {
  const guncel = useAyarlar((a) => a.ayarlar);
  return useMemo(() => etkinAyarlar(t, guncel), [t.fiyatlar, guncel]); // eslint-disable-line react-hooks/exhaustive-deps
}
