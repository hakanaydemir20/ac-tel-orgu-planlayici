"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { birlestir } from "./birlestir";
import { direkTipi, telTipi, TelTipiId, DirekTipiId } from "./katalog";
import { Musteri, Tasarim, Zemin, varsayilanTasarim } from "./tasarim";

interface Durum {
  tasarim: Tasarim;
  guncelle: (f: (t: Tasarim) => void) => void;
  telTipiSec: (id: TelTipiId) => void;
  direkTipiSec: (id: DirekTipiId) => void;
  zeminSec: (z: Zemin) => void;
  /** Kayıtlı bir teklifin tasarımını açar */
  yukle: (t: Tasarim) => void;
  /** Yeni teklif: ekranı temizler, varsa müşteri bilgisiyle başlar */
  sifirla: (musteri?: Musteri) => void;
}

/** Eski/eksik kayıtları güncel tasarım biçimine tamamlar. */
export const tasarimiTamamla = (kayitli: unknown): Tasarim => birlestir(varsayilanTasarim(), kayitli);

/** Beton zeminde yalnızca flanşlı demir direkler (profil, boru) kullanılır. */
export const betondaOlur = (id: DirekTipiId) => id !== "beton";

/** Tel tipinin gergi aralığından önerilen "kaç direkte bir payanda" (panelde 0). */
export const varsayilanPayandaHer = (id: TelTipiId) => {
  const tip = telTipi(id);
  return tip.gergiAraligi > 0 ? Math.round(tip.gergiAraligi / tip.varsayilanAralik) : 0;
};

const enYakin = (liste: number[], x: number) =>
  liste.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), liste[0]);

// Çizim bu cihazda saklanır: sayfa yenilense ya da kapansa da kaldığı yerden sürer
export const useTasarim = create<Durum>()(
  persist(
    (set) => ({
      tasarim: varsayilanTasarim(),
      guncelle: (f) =>
        set((s) => {
          const t = structuredClone(s.tasarim);
          f(t);
          return { tasarim: t };
    }),
  // Tel tipi değişince seçenekleri yeni tipin geçerli değerlerine çek
  telTipiSec: (id) =>
    set((s) => {
      const t = structuredClone(s.tasarim);
      const tip = telTipi(id);
      t.tel.tip = id;
      t.tel.yukseklik = enYakin(tip.yukseklikler, t.tel.yukseklik);
      t.tel.goz = tip.gozler.includes(t.tel.goz) ? t.tel.goz : tip.gozler[Math.floor(tip.gozler.length / 2)];
      t.tel.kalinlik = enYakin(tip.kalinliklar, t.tel.kalinlik);
      if (!tip.kaplamalar.includes(t.tel.kaplama)) t.tel.kaplama = tip.kaplamalar[0];
      t.tel.sira = tip.dikenliSira ?? t.tel.sira;
      t.direk.aralik = tip.varsayilanAralik;
      t.direk.payandaHer = varsayilanPayandaHer(id);
      if (id === "dikenli") t.ekstra.ustTel = "yok";
      return { tasarim: t };
    }),
  direkTipiSec: (id) =>
    set((s) => {
      if (s.tasarim.zemin !== "toprak" && !betondaOlur(id)) return s;
      const t = structuredClone(s.tasarim);
      t.direk.tip = id;
      t.direk.olcu = direkTipi(id).olculer[0];
      return { tasarim: t };
    }),
  // Beton zemine geçince beton direk seçiliyse profile çevir (betona beton direk dikilmez)
  zeminSec: (z) =>
    set((s) => {
      const t = structuredClone(s.tasarim);
      t.zemin = z;
      if (z !== "toprak" && !betondaOlur(t.direk.tip)) {
        t.direk.tip = "profil";
        t.direk.olcu = direkTipi("profil").olculer[0];
      }
      return { tasarim: t };
    }),
  yukle: (t) => set({ tasarim: tasarimiTamamla(structuredClone(t)) }),
  sifirla: (musteri) =>
    set((s) => ({ tasarim: { ...varsayilanTasarim(), satisci: s.tasarim.satisci, ...(musteri && { musteri: structuredClone(musteri) }) } })),
    }),
    {
      name: "ac-tel-tasarim",
      version: 1,
      skipHydration: true, // sunucu çizimiyle aynı başlasın; Tasarimci yüklenince okur
      partialize: (s) => ({ tasarim: s.tasarim }),
      merge: (kayitli, mevcut) => ({ ...mevcut, tasarim: tasarimiTamamla((kayitli as { tasarim?: unknown } | undefined)?.tasarim) }),
    }
  )
);
