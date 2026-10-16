// Sunucu düzeninden de okunabilsin diye ayrı dosyada (istemci modülü değil).
export const TEMA_ANAHTARI = "ac-tel-tema";

/** İlk boyamadan önce çalışır: sayfa önce koyu açılıp sonra açığa dönmesin. */
export const TEMA_BETIGI = `try{var t=JSON.parse(localStorage.getItem("${TEMA_ANAHTARI}")||"{}").state;if(t&&t.tema)document.documentElement.dataset.tema=t.tema}catch(e){}`;
