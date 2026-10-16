"use client";
// Koyu / açık tema: seçim bu cihazda saklanır, <html data-tema> ile uygulanır.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TEMA_ANAHTARI } from "./temaBetigi";

export type Tema = "koyu" | "acik";

export const useTema = create<{ tema: Tema; degistir: () => void }>()(
  persist((set) => ({ tema: "koyu", degistir: () => set((s) => ({ tema: s.tema === "koyu" ? "acik" : "koyu" })) }), {
    name: TEMA_ANAHTARI,
    skipHydration: true,
  }),
);

if (typeof window !== "undefined") {
  useTema.subscribe((s) => (document.documentElement.dataset.tema = s.tema));
  // Başka sekmede değişince burada da değişsin
  window.addEventListener("storage", (e) => e.key === TEMA_ANAHTARI && useTema.persist.rehydrate());
}
