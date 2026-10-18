// Araç kapısı varsayılan fiyatları: katalogdan da okunur, bu yüzden başka modüle bağlı değil.

/** Araç kapısı fiyatları (KDV hariç). */
export interface AracKapiFiyatlari {
  /** Kapı tipi → dolgu → ₺ / m² kanat */
  m2: Record<"surgulu" | "konsol" | "cift" | "tek", Record<"profil" | "panel" | "kafes" | "sac", number>>;
  motorSurgulu: number; // sürgü motoru + 2 kumanda, ₺
  motorKanat: number; // kanat başı kol motoru (+ kumandalar tek pakette), ₺
  fotosel: number; // çift fotosel, ₺
  flasor: number; // ₺
  rayMetre: number; // ray + temel, ₺ / m
  montaj: number; // kapı başı, ₺
  mizrakMetre: number; // kanat üstü mızrak uç, ₺ / m
}

export const VARSAYILAN_ARAC_KAPI_FIYAT: AracKapiFiyatlari = {
  m2: {
    surgulu: { profil: 2400, panel: 1900, kafes: 1700, sac: 2600 },
    konsol: { profil: 2900, panel: 2400, kafes: 2200, sac: 3100 },
    cift: { profil: 2600, panel: 2100, kafes: 1900, sac: 2800 },
    tek: { profil: 2500, panel: 2000, kafes: 1800, sac: 2700 },
  },
  motorSurgulu: 16000,
  motorKanat: 11000,
  fotosel: 1800,
  flasor: 950,
  rayMetre: 1400,
  montaj: 4500,
  mizrakMetre: 650,
};

