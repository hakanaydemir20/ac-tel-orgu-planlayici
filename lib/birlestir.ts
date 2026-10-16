// Tarayıcıda saklanan veriyi güncel varsayılanlarla birleştirir.
// Yeni eklenen alanlar varsayılanla gelir; tipi tutmayan kayıtlı değerler yok sayılır.

type Kayit = Record<string, unknown>;
const nesneMi = (x: unknown): x is Kayit => typeof x === "object" && x !== null && !Array.isArray(x);

export function birlestir<T>(varsayilan: T, kayitli: unknown): T {
  // Diziler (kapılar, köşeler, kenar ayarları) olduğu gibi alınır: uzunlukları değişkendir
  if (Array.isArray(varsayilan)) return (Array.isArray(kayitli) ? kayitli : varsayilan) as T;
  if (nesneMi(varsayilan)) {
    const k = nesneMi(kayitli) ? kayitli : {};
    const sonuc: Kayit = {};
    // Varsayılandaki anahtarlar tip korunarak; varsayılanda olmayan kayıtlı anahtarlar
    // (ör. kullanıcının fiyat tablosuna eklediği ölçüler) da korunur
    for (const a of new Set([...Object.keys(varsayilan), ...Object.keys(k)]))
      sonuc[a] = a in varsayilan ? birlestir((varsayilan as Kayit)[a], k[a]) : k[a];
    return sonuc as T;
  }
  return (typeof kayitli === typeof varsayilan && (typeof kayitli !== "number" || Number.isFinite(kayitli)) ? kayitli : varsayilan) as T;
}
