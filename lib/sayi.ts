// Kullanıcının yazdığı Türkçe sayıyı okur.

/** "1.500", "1500", "1.500,5", "1500.5" → sayı (Türkçe binlik nokta ve ondalık virgül). */
export function sayiOku(x: string) {
  let m = x.trim().replace(/\s/g, "");
  if (m.includes(",")) m = m.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(m)) m = m.replace(/\./g, "");
  return parseFloat(m);
}
