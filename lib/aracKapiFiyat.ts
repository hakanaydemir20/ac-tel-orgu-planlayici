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
  kilit: number; // silindir kilit + kol, ₺ / takım
  elektrikliKilit: number; // elektrikli kilit + kart okuyucu, ₺ / takım
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
  kilit: 1200,
  elektrikliKilit: 5500,
};

/** Yaya kapısı fiyatları: aynı tablo biçimi, yalnız tek/çift kanat ve kilitler kullanılır. */
export const VARSAYILAN_YAYA_KAPI_FIYAT: AracKapiFiyatlari = {
  m2: {
    surgulu: { profil: 0, panel: 0, kafes: 0, sac: 0 },
    konsol: { profil: 0, panel: 0, kafes: 0, sac: 0 },
    cift: { profil: 2800, panel: 2300, kafes: 2100, sac: 3000 },
    tek: { profil: 2700, panel: 2200, kafes: 2000, sac: 2900 },
  },
  motorSurgulu: 0,
  motorKanat: 0,
  fotosel: 0,
  flasor: 0,
  rayMetre: 0,
  montaj: 1500,
  mizrakMetre: 650,
  kilit: 1200,
  elektrikliKilit: 5500,
};

