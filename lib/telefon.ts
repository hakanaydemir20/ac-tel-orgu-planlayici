// Türkiye telefon numarasını WhatsApp bağlantısı biçimine çevirir (905xxxxxxxxx).

export function waNumarasi(tel: string): string {
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("0090")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = "9" + d; // 05xx… → 905xx…
  if (d.length === 10 && d.startsWith("5")) d = "90" + d; // 5xx…  → 905xx…
  return /^90\d{10}$/.test(d) ? d : "";
}
