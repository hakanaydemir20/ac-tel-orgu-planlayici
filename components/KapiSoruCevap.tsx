"use client";
import { ReactNode, useEffect, useState } from "react";
import { type AracKapi, KAPI_DOLGULARI, azamiGenislik, surgulu } from "@/lib/aracKapi";
import { AILELER } from "@/lib/kapiAilesi";
import { BABA_BORULARI, BABA_PROFILLERI, babaAdi, babaOlcuAdi, babaOlcusu, babaTipi } from "@/lib/kapiYapi";
import { DIREK_RENKLERI } from "@/lib/katalog";
import { DolguCizimi, TipCizimi } from "./KapiPlanlayici";
import { Izgara, Secenek } from "./SoruCevap";
import { SayiGiris, sayi, tl } from "./ui";

interface Adim {
  id: string;
  baslik: string;
  soru: string;
  yardim: string;
  icerik: () => ReactNode;
  ozet: () => string;
  gizli?: boolean;
}

const evetHayir = (v: boolean) => (v ? "Var" : "Yok");

/** Kapı planlayıcı için "soru-cevap": her ekranda tek soru, seçimler canlı uygulanır, sonunda 3D'ye döner. */
export function KapiSoruCevap({
  aile: aileId,
  kapi: k,
  guncelle,
  toplam,
  kapat,
}: {
  aile: "arac" | "yaya";
  kapi: AracKapi;
  guncelle: (f: (x: AracKapi) => void) => void;
  toplam: number;
  kapat: () => void;
}) {
  const aile = AILELER[aileId];
  const arac = aileId === "arac";
  const [sira, setSira] = useState(0);
  const [yardim, setYardim] = useState(false);

  /** Evet / hayır sorusu için iki büyük kart. */
  const EvetHayir = ({ deger, ata, evet, hayir }: { deger: boolean; ata: (v: boolean) => void; evet: string; hayir: string }) => (
    <Izgara sutun={2}>
      <Secenek secili={deger} onClick={() => ata(true)} ad="Evet" alt={evet} />
      <Secenek secili={!deger} onClick={() => ata(false)} ad="Hayır" alt={hayir} />
    </Izgara>
  );

  const adimlar: Adim[] = [
    {
      id: "tip",
      baslik: "Kapı tipi",
      soru: "Kapı nasıl açılsın?",
      yardim: arac
        ? "Sürgülü kapı ray üstünde yana kayar, uçan kapı rayı olmadan konsol taşıyıcılar üstünde havada kayar. Kanatlı kapılar menteşeyle içeri ya da dışarı açılır; açılma alanı için kapı önünde boşluk gerekir."
        : "Tek kanat personel kapısı insan geçişi içindir (genelde 1 m). Çift kanat yaya kapısı daha geniş geçiş ister (bahçe, el arabası, küçük ekipman) ve ortadan açılır.",
      icerik: () => (
        <Izgara sutun={aile.tipler.length > 2 ? 4 : 2}>
          {aile.tipler.map((t) => (
            <Secenek
              key={t.id}
              secili={k.tip === t.id}
              onClick={() =>
                guncelle((x) => {
                  x.tip = t.id;
                  const liste = aile.genislikler(x);
                  if (x.genislik > liste.at(-1)! || x.genislik < liste[0])
                    x.genislik = liste.reduce((a, b) => (Math.abs(b - x.genislik) < Math.abs(a - x.genislik) ? b : a));
                })
              }
              resim={<TipCizimi tip={t.id} />}
              ad={t.ad}
              alt={t.aciklama}
            />
          ))}
        </Izgara>
      ),
      ozet: () => aile.tipler.find((t) => t.id === k.tip)?.ad ?? k.tip,
    },
    {
      id: "dolgu",
      baslik: "Dolgu",
      soru: "Kanadın içi neyle doldurulsun?",
      yardim:
        "Panel: çit panelleriyle aynı görünüm, en çok tercih edilen. Kafes: tel örgü dolgu, ekonomik. Dikey profil: kutu profil çubuklar, sağlam ve şık. Dolu sac: içerisi görünmez, mahremiyet sağlar.",
      icerik: () => (
        <Izgara sutun={4}>
          {KAPI_DOLGULARI.map((d) => (
            <Secenek key={d.id} secili={k.dolgu === d.id} onClick={() => guncelle((x) => void (x.dolgu = d.id))} resim={<DolguCizimi dolgu={d.id} />} ad={d.ad} alt={d.aciklama} />
          ))}
        </Izgara>
      ),
      ozet: () => KAPI_DOLGULARI.find((d) => d.id === k.dolgu)!.ad,
    },
    {
      id: "genislik",
      baslik: "Genişlik",
      soru: "Geçiş genişliği ne kadar olsun?",
      yardim:
        "Geçiş genişliği iki kolon arasındaki net açıklıktır. Hazır ölçülerden birini seçin ya da altta kendi ölçünüzü yazın." +
        (arac ? " Kamyon ve iş makinesi geçecekse en az 5–6 m önerilir." : " Tekerlekli sandalye ve el arabası için en az 1 m önerilir."),
      icerik: () => (
        <div className="space-y-6">
          <Izgara sutun={4}>
            {aile.genislikler(k).map((g) => (
              <Secenek key={g} secili={k.genislik === g} onClick={() => guncelle((x) => void (x.genislik = g))} ad={`${sayi(g)} m`} />
            ))}
          </Izgara>
          <div className="max-w-xs">
            <SayiGiris etiket="Ya da ölçü yazın" adim={0.1} min={aile.enAz} max={azamiGenislik(k, aileId)} deger={k.genislik} onChange={(v) => guncelle((x) => void (x.genislik = v))} />
          </div>
        </div>
      ),
      ozet: () => `${sayi(k.genislik, 2)} m`,
    },
    {
      id: "yukseklik",
      baslik: "Yükseklik",
      soru: "Kapı yüksekliği ne kadar olsun?",
      yardim: "Kapı yüksekliği genelde yanındaki çitle aynı seçilir. Mızrak uç seçilirse kanadın üstüne ayrıca eklenir.",
      icerik: () => (
        <div className="space-y-6">
          <Izgara sutun={4}>
            {aile.yukseklikler.map((h) => (
              <Secenek key={h} secili={k.yukseklik === h} onClick={() => guncelle((x) => void (x.yukseklik = h))} ad={`${sayi(h)} m`} />
            ))}
          </Izgara>
          <div className="max-w-xs">
            <SayiGiris etiket="Ya da ölçü yazın" adim={0.1} min={0.8} max={4} deger={k.yukseklik} onChange={(v) => guncelle((x) => void (x.yukseklik = v))} />
          </div>
        </div>
      ),
      ozet: () => `${sayi(k.yukseklik, 2)} m`,
    },
    {
      id: "renk",
      baslik: "Renk",
      soru: "Kapı hangi renkte olsun?",
      yardim: "Çerçeve, dolgu ve kolonlar aynı renkte elektrostatik toz boya ile boyanır. Galvaniz boyasızdır.",
      icerik: () => (
        <Izgara sutun={4}>
          {DIREK_RENKLERI.map((r) => (
            <Secenek
              key={r.id}
              secili={k.renk === r.id}
              onClick={() => guncelle((x) => void (x.renk = r.id))}
              resim={
                <span
                  className="mx-auto block h-16 w-16 rounded-full ring-2 ring-black/20 sm:h-20 sm:w-20"
                  style={{ background: r.id === "galvaniz" ? "linear-gradient(135deg,#e3e9f0,#8f9bab)" : r.renk }}
                />
              }
              ad={r.ad}
              alt={r.kod}
            />
          ))}
        </Izgara>
      ),
      ozet: () => DIREK_RENKLERI.find((r) => r.id === k.renk)?.ad ?? k.renk,
    },
    {
      id: "baba",
      baslik: "Kapı babası",
      soru: "Kapı babası hangi malzemeden ve ölçüde olsun?",
      yardim:
        "Kapı babası kanadın asıldığı (ya da sürgülüde kanadı taşıyan) kolondur. Kutu profil köşeli, boru yuvarlak görünümlüdür. Kapı genişledikçe ve ağırlaştıkça daha kalın baba seçilmelidir.",
      icerik: () => (
        <div className="space-y-6">
          <Izgara sutun={2}>
            {(["profil", "boru"] as const).map((v) => (
              <Secenek
                key={v}
                secili={babaTipi(k) === v}
                onClick={() => guncelle((x) => void ((x.babaOlcu = babaOlcusu({ ...x, babaTip: v }, aileId)), (x.babaTip = v)))}
                ad={v === "boru" ? "Boru" : "Kutu profil"}
                alt={v === "boru" ? "Yuvarlak kesit" : "Kare kesit"}
              />
            ))}
          </Izgara>
          <Izgara sutun={4}>
            {(babaTipi(k) === "boru" ? BABA_BORULARI : BABA_PROFILLERI).map((o) => (
              <Secenek key={o} secili={babaOlcusu(k, aileId) === o} onClick={() => guncelle((x) => void (x.babaOlcu = o))} ad={babaOlcuAdi(babaTipi(k), o).replace(" kutu profil", "").replace(" boru", "")} alt="mm" />
            ))}
          </Izgara>
        </div>
      ),
      ozet: () => babaAdi(k, aileId),
    },
    {
      id: "montajTipi",
      baslik: "Kolon montajı",
      soru: "Kapı kolonları nasıl sabitlensin?",
      yardim:
        "Toprak zeminde babalar betona gömülür; 50 cm toprak altında kalacak şekilde o kadar uzun kesilir. Mevcut beton zeminde (avlu, otopark) baba altındaki çelik flanş plaka dübelle betona sabitlenir.",
      icerik: () => (
        <Izgara sutun={2}>
          <Secenek secili={k.montajTipi === "gomme"} onClick={() => guncelle((x) => void (x.montajTipi = "gomme"))} ad="Betona gömme" alt="Toprak zemin, +50 cm gömme boy" />
          <Secenek secili={k.montajTipi === "flans"} onClick={() => guncelle((x) => void (x.montajTipi = "flans"))} ad="Flanşlı" alt="Beton zemine dübelle" />
        </Izgara>
      ),
      ozet: () => (k.montajTipi === "flans" ? "Flanşlı" : "Betona gömme"),
    },
    {
      id: "kilit",
      baslik: "Kilit",
      soru: "Silindir kilit ve kol takılsın mı?",
      yardim: "Kanat üstüne kilit kutusu, silindir kilit ve iki taraflı kol takılır. Çift kanatta tek kilit ortaya konur, diğer kanat yer sürgüsüyle sabitlenir.",
      gizli: arac,
      icerik: () => <EvetHayir deger={k.kilit} ata={(v) => guncelle((x) => void (x.kilit = v))} evet="Anahtarlı kilit + kol" hayir="Kilitsiz" />,
      ozet: () => evetHayir(k.kilit),
    },
    {
      id: "elektrikliKilit",
      baslik: "Elektrikli kilit",
      soru: "Elektrikli kilit ve kart okuyucu olsun mu?",
      yardim: "Kolona kart okuyucu, kanada elektrikli kilit takılır. Kartla ya da içeriden butonla açılır; elektrik bağlantısı gerekir.",
      gizli: arac,
      icerik: () => <EvetHayir deger={k.elektrikliKilit} ata={(v) => guncelle((x) => void (x.elektrikliKilit = v))} evet="Kartlı geçiş" hayir="Gerek yok" />,
      ozet: () => evetHayir(k.elektrikliKilit),
    },
    {
      id: "motor",
      baslik: "Motor",
      soru: "Kapı motorlu olsun mu?",
      yardim: "Sürgülü kapıda tek sürgü motoru, kanatlı kapıda kanat başına kol motoru kullanılır. İki uzaktan kumanda dahildir.",
      gizli: !arac,
      icerik: () => <EvetHayir deger={k.motor} ata={(v) => guncelle((x) => void (x.motor = v))} evet={surgulu(k) ? "Sürgü motoru + 2 kumanda" : "Kanat kol motoru"} hayir="Elle açılır" />,
      ozet: () => evetHayir(k.motor),
    },
    {
      id: "guvenlik",
      baslik: "Fotosel ve flaşör",
      soru: "Güvenlik aksesuarları eklensin mi?",
      yardim: "Fotosel, kapı kapanırken önünde araç ya da insan varsa kapıyı durdurur. Flaşör kapı hareket ederken yanıp söner. Motorlu kapılarda önerilir.",
      gizli: !arac || !k.motor,
      icerik: () => (
        <Izgara sutun={2}>
          <Secenek secili={k.fotosel} onClick={() => guncelle((x) => void (x.fotosel = !x.fotosel))} ad="Fotosel (çift)" alt={k.fotosel ? "Eklendi" : "Eklemek için dokunun"} />
          <Secenek secili={k.flasor} onClick={() => guncelle((x) => void (x.flasor = !x.flasor))} ad="Flaşör lamba" alt={k.flasor ? "Eklendi" : "Eklemek için dokunun"} />
        </Izgara>
      ),
      ozet: () => [k.fotosel && "Fotosel", k.flasor && "Flaşör"].filter(Boolean).join(" · ") || "Yok",
    },
    {
      id: "ray",
      baslik: k.tip === "surgulu" ? "Ray ve temel" : "Konsol temeli",
      soru: k.tip === "surgulu" ? "Ray ve beton temel bizden mi olsun?" : "Konsol taşıyıcı temeli bizden mi olsun?",
      yardim: "Sürgülü kapının rayı ve altındaki beton temel, uçan kapının ise taşıyıcı arabalarının beton temeli. Zemin hazırsa çıkarabilirsiniz.",
      gizli: !arac || !surgulu(k),
      icerik: () => <EvetHayir deger={k.ray} ata={(v) => guncelle((x) => void (x.ray = v))} evet="Temeli biz dökeriz" hayir="Zemin hazır" />,
      ozet: () => evetHayir(k.ray),
    },
    {
      id: "mizrak",
      baslik: "Mızrak uç",
      soru: "Kanat üstüne mızrak uç konsun mu?",
      yardim: "Kanadın üstüne sivri uçlu çubuklar eklenir; tırmanmayı zorlaştırır ve kapıyı yükseltir.",
      icerik: () => <EvetHayir deger={k.mizrak} ata={(v) => guncelle((x) => void (x.mizrak = v))} evet="Sivri uçlu üst" hayir="Düz üst" />,
      ozet: () => evetHayir(k.mizrak),
    },
    {
      id: "montaj",
      baslik: "Montaj",
      soru: "Montajı biz yapalım mı?",
      yardim: "Montaj seçilirse kolonların dikilmesi, kanadın takılması ve ayarı ekibimizce yapılır.",
      icerik: () => <EvetHayir deger={k.montaj} ata={(v) => guncelle((x) => void (x.montaj = v))} evet="Ekibimiz kurar" hayir="Yalnız malzeme" />,
      ozet: () => (k.montaj ? "Dahil" : "Yalnız malzeme"),
    },
  ];

  const gorunen = adimlar.filter((a) => !a.gizli);
  const OZET = gorunen.length;
  const i = Math.min(sira, OZET);
  const adim = gorunen[i] as Adim | undefined;
  const git = (n: number) => {
    setSira(Math.max(0, Math.min(OZET, n)));
    setYardim(false);
  };

  useEffect(() => {
    const tus = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [kapat]);

  const anaDugme =
    "ml-auto rounded-xl bg-ac-kirmizi px-6 py-3.5 text-base font-extrabold uppercase tracking-wider shadow-[0_8px_30px_-6px_var(--color-ac-kirmizi)] hover:bg-ac-kirmizi-acik sm:ml-0 sm:px-10";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 backdrop-blur-sm sm:p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Soru-cevap ile kapı oluştur"
        className="yukari flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-white/10">
          <div className="h-full bg-ac-kirmizi transition-all duration-300" style={{ width: `${(i / OZET) * 100}%` }} />
        </div>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-ac-mavi">Soru-cevap ile {aile.kisa.toLowerCase()}</div>
            <div className="truncate text-lg font-extrabold sm:text-xl">{adim ? `Adım ${i + 1} / ${OZET} · ${adim.baslik}` : "Özet"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-right sm:block">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--metin-2)]">KDV dahil</span>
              <span className="text-lg font-extrabold text-ac-kirmizi-acik tabular-nums">{tl(toplam)}</span>
            </span>
            <button type="button" onClick={kapat} className="rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold ring-1 ring-white/15 hover:bg-white/20">
              Kapat ✕
            </button>
          </div>
        </header>

        <div key={i} className="ince-kaydirma yukari min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {adim ? (
              <>
                <div className="flex items-start gap-3">
                  <h2 className="flex-1 text-2xl font-extrabold leading-tight sm:text-3xl">{adim.soru}</h2>
                  <button
                    type="button"
                    onClick={() => setYardim(!yardim)}
                    aria-expanded={yardim}
                    aria-label="Bu adımın açıklaması"
                    title="Açıklama"
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-black ring-2 transition ${
                      yardim ? "bg-ac-mavi text-white ring-ac-mavi" : "bg-white/5 text-ac-mavi ring-ac-mavi/60 hover:bg-ac-mavi/15"
                    }`}
                  >
                    ?
                  </button>
                </div>
                {yardim && (
                  <div className="yukari flex gap-3 rounded-2xl bg-ac-mavi/10 p-4 text-base leading-relaxed ring-1 ring-ac-mavi/40 sm:text-lg">
                    <span className="text-2xl">💡</span>
                    <p>{adim.yardim}</p>
                  </div>
                )}
                {adim.icerik()}
              </>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Kapınız hazır. Seçimleriniz:</h2>
                <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
                  <ul className="cam divide-y divide-white/10 rounded-2xl">
                    {gorunen.map((a, n) => (
                      <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="w-36 shrink-0 text-sm font-semibold text-[var(--metin-2)] sm:w-44">{a.baslik}</span>
                        <span className="min-w-0 flex-1 font-bold">{a.ozet()}</span>
                        <button type="button" onClick={() => git(n)} className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-ac-mavi hover:bg-white/10">
                          Değiştir
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="cam h-fit rounded-2xl p-4">
                    <div className="text-sm text-[var(--metin-2)]">
                      {aile.tipler.find((t) => t.id === k.tip)?.ad} · {sayi(k.genislik, 2)} × {sayi(k.yukseklik, 2)} m
                    </div>
                    <div className="mt-1 flex items-end justify-between gap-3">
                      <span className="font-bold uppercase tracking-wider">Toplam · KDV dahil</span>
                      <span className="text-3xl font-extrabold text-ac-kirmizi-acik tabular-nums">{tl(toplam)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() => git(i - 1)}
            disabled={i === 0}
            className="rounded-xl bg-white/10 px-5 py-3.5 text-base font-extrabold uppercase tracking-wider ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-40 sm:px-8"
          >
            ← Geri
          </button>
          <div className="hidden flex-1 justify-center gap-1.5 sm:flex" aria-hidden>
            {Array.from({ length: OZET + 1 }, (_, n) => (
              <span key={n} className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-ac-kirmizi" : n < i ? "w-2 bg-ac-mavi" : "w-2 bg-white/20"}`} />
            ))}
          </div>
          {adim ? (
            <button type="button" autoFocus onClick={() => git(i + 1)} className={anaDugme}>
              İleri →
            </button>
          ) : (
            <button type="button" autoFocus onClick={kapat} className={anaDugme}>
              3D kapıyı göster ✓
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
