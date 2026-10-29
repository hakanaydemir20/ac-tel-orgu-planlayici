// 3D sahneden teklif resmi almak için köprü: sahne yüklenince `al` atanır.
// Görünüm küpü olmadan, kapıyı ve babaları kutuyu dolduracak yakınlıkta çeker.
export const kapiCekim: { al: null | ((en: number, boy: number) => string | null) } = { al: null };
