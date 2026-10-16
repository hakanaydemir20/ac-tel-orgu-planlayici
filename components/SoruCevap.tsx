"use client";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useEtkinAyarlar } from "@/lib/ayarlar";
import { hesapla, payandaVar } from "@/lib/hesap";
import { DIREK_RENKLERI, DIREK_TIPLERI, TEL_TIPLERI, direkRengi, direkTipi, telTipi } from "@/lib/katalog";
import { planSvg } from "@/lib/plan";
import { betondaOlur, useTasarim } from "@/lib/store";
import { KAPI_GENISLIK, KapiTuru, OLCU_ADLARI, SEKILLER, Tasarim, ZEMINLER, kenarlariHesapla } from "@/lib/tasarim";
import { DirekIkon, KapiIkon, SekilIkon, TelIkon, ZeminIkon } from "./ikonlar";
import { SayiGiris, sayi, tl } from "./ui";

// ---------- büyük seçim kartı ----------

function Secenek({
  secili,
  onClick,
  resim,
  ad,
  alt,
  pasif,
}: {
  secili: boolean;
  onClick: () => void;
  resim?: ReactNode;
  ad: string;
  alt?: string;
  pasif?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!pasif}
      aria-pressed={secili}
      className={`cam group relative flex min-w-0 flex-col items-center gap-2 rounded-2xl p-4 text-center transition enabled:hover:-translate-y-0.5 enabled:hover:bg-[var(--yuzey-2)] disabled:cursor-not-allowed disabled:opacity-40 sm:p-5 ${
        secili ? "secili" : ""
      }`}
    >
      {secili && (
        <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-ac-kirmizi text-sm font-black text-white">✓</span>
      )}
      {resim && (
        <div className={`h-20 w-full transition sm:h-24 ${secili ? "text-white" : "text-[var(--metin-2)] group-enabled:group-hover:text-white"}`}>{resim}</div>
      )}
      <div className="text-lg font-extrabold leading-tight sm:text-xl">{ad}</div>
      {(pasif ?? alt) && <div className="text-sm leading-snug text-[var(--metin-2)]">{pasif ?? alt}</div>}
    </button>
  );
}

const Izgara = ({ children, sutun = 3 }: { children: ReactNode; sutun?: 2 | 3 | 4 }) => (
  <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${{ 2: "", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[sutun]}`}>{children}</div>
);

/** Arazinin üstten görünüşü, gerçek ölçüleriyle (PDF'teki plan). */
function Plan({ t }: { t: Tasarim }) {
  const svg = useMemo(() => planSvg(t, hesapla(t)), [t]);
  if (!svg) return null;
  return <div className="mx-auto aspect-[4/3] w-full max-w-md rounded-2xl bg-[#fff] p-3 ring-1 ring-black/10 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ---------- kapı seçimi ----------

type KapiSecimi = "yok" | "yaya" | "arac" | "ikisi";

function kapiSecimi(t: Tasarim): KapiSecimi {
  const yaya = t.ekstra.kapilar.some((k) => k.tur === "yaya");
  const arac = t.ekstra.kapilar.some((k) => k.tur === "arac");
  return yaya && arac ? "ikisi" : yaya ? "yaya" : arac ? "arac" : "yok";
}

/** Kapıları yeniden dizer: araç kapısı ilk kenarın ortasına, yaya kapısı varsa bir sonraki kenarın ortasına. */
function kapilariKur(x: Tasarim, secim: KapiSecimi) {
  const kenarlar = kenarlariHesapla(x).filter((k) => k.aktif);
  const turler: KapiTuru[] = { yok: [], yaya: ["yaya"], arac: ["arac"], ikisi: ["arac", "yaya"] }[secim] as KapiTuru[];
  x.ekstra.kapilar = turler.flatMap((tur, i) => {
    const k = kenarlar[Math.min(i * 2, kenarlar.length - 1)] ?? kenarlar[0];
    if (!k) return [];
    const g = KAPI_GENISLIK[tur];
    // Tek kenarda iki kapı: yaya kapısı başa yakın durur
    const ayni = i > 0 && k.i === kenarlar[0]?.i;
    const konum = ayni ? Math.min(1, Math.max(0, k.yatay - g)) : Math.max(0, (k.yatay - g) / 2);
    return [{ id: `${tur}${i}`, kenar: k.i, konum, tur, genislik: g }];
  });
}

// ---------- adımlar ----------

interface Adim {
  id: string;
  baslik: string;
  soru: string;
  yardim: string;
  icerik: () => ReactNode;
  ozet: () => string;
  gizli?: boolean;
}

/** "Soru-cevap": planı tek tek sorularla kurar. Her ekranda tek soru; seçimler canlı uygulanır, sonunda 3D'ye döner. */
export function SoruCevap({ kapat }: { kapat: () => void }) {
  const { tasarim: t, guncelle, zeminSec, telTipiSec, direkTipiSec } = useTasarim();
  const ayarlar = useEtkinAyarlar(t);
  const sonuc = useMemo(() => hesapla(t, ayarlar), [t, ayarlar]);
  const [sira, setSira] = useState(0);
  const [yardim, setYardim] = useState(false);

  const tip = telTipi(t.tel.tip);
  const dt = direkTipi(t.direk.tip);
  const demir = t.direk.tip !== "beton";
  const sekil = SEKILLER.find((s) => s.id === t.sekil)!;

  const adimlar: Adim[] = [
    {
      id: "zemin",
      baslik: "Kurulum alanı",
      soru: "Çit nereye kurulacak?",
      yardim:
        "Toprak arazide direkler toprağa gömülür, istenirse dibine beton temel dökülür. Beton zeminde (avlu, otopark, çatı) direk gömülmez: alttaki çelik flanş plaka dübelle betona sabitlenir. Bu yüzden beton zeminde yalnızca profil ya da boru demir direk kullanılabilir.",
      icerik: () => (
        <Izgara sutun={2}>
          {ZEMINLER.map((z) => (
            <Secenek key={z.id} secili={t.zemin === z.id} onClick={() => zeminSec(z.id)} resim={<ZeminIkon zemin={z.id} />} ad={z.ad} alt={z.aciklama} />
          ))}
        </Izgara>
      ),
      ozet: () => ZEMINLER.find((z) => z.id === t.zemin)!.ad,
    },
    {
      id: "sekil",
      baslik: "Arazi şekli",
      soru: "Çit hangi şekilde çekilecek?",
      yardim:
        "Düz hat: tek bir kenar boyunca çit (ör. bir sınır hattı). Kare ve dikdörtgen: dört tarafı kapalı alan. L ve U şekli: köşesi kesik ya da içeri girintili araziler. Arazi bunlara uymuyorsa ana ekrandaki “Elle Çiz” ile köşe köşe çizebilirsiniz.",
      icerik: () => (
        <Izgara sutun={3}>
          {SEKILLER.filter((s) => s.id !== "serbest").map((s) => (
            <Secenek
              key={s.id}
              secili={t.sekil === s.id}
              onClick={() =>
                guncelle((x) => {
                  if (x.sekil === s.id) return;
                  x.sekil = s.id;
                  x.ekstra.kapilar = x.ekstra.kapilar.map((k) => ({ ...k, kenar: 0 }));
                })
              }
              resim={<SekilIkon sekil={s.id} />}
              ad={s.ad}
            />
          ))}
        </Izgara>
      ),
      ozet: () => sekil.ad,
    },
    {
      id: "olcu",
      baslik: "Ölçüler",
      soru: "Arazinin ölçüleri kaç metre?",
      yardim:
        "Ölçüleri metre olarak yazın (ör. 30 ya da 12,5). Harfler çizimdeki kenarları gösterir. Plan yazdıkça güncellenir. Eğimli kenar ya da çit olmayan kenar (duvar vb.) varsa bunları sonra ana ekrandaki “Kenar ayarları”ndan girebilirsiniz.",
      icerik: () =>
        t.sekil === "serbest" ? (
          <p className="cam rounded-2xl p-5 text-lg">Arazi elle çizilmiş. Kenar ölçülerini ana ekranda çizimin üstünden değiştirebilirsiniz.</p>
        ) : (
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-4">
              {sekil.olculer.map((o) => (
                <SayiGiris
                  key={o}
                  etiket={`${o} · ${OLCU_ADLARI[t.sekil][o]}`}
                  deger={t.olculer[o]}
                  min={1}
                  max={2000}
                  onChange={(v) => guncelle((x) => void (x.olculer[o] = v))}
                />
              ))}
              <div className="col-span-2 rounded-xl bg-white/5 p-3 text-lg ring-1 ring-white/10">
                Toplam çit: <b className="tabular-nums">{sayi(sonuc.telUzunluk)} m</b>
              </div>
            </div>
            <Plan t={t} />
          </div>
        ),
      ozet: () => (t.sekil === "serbest" ? "Elle çizim" : sekil.olculer.map((o) => `${o} ${sayi(t.olculer[o])} m`).join(" · ")),
    },
    {
      id: "tel",
      baslik: "Tel tipi",
      soru: "Hangi tel çekilecek?",
      yardim:
        "Kafes tel: en yaygın örme bahçe teli, rulo ile satılır. Panel çit: kaynaklı hazır paneller, sağlam ve düzgün görünüm. Dikenli tel: tarla ve sınır için sıra sıra çekilir. Tavuk / hayvan teli: altıgen gözlü, kümes ve hayvan alanları için.",
      icerik: () => (
        <Izgara sutun={4}>
          {TEL_TIPLERI.map((x) => (
            <Secenek key={x.id} secili={t.tel.tip === x.id} onClick={() => telTipiSec(x.id)} resim={<TelIkon tip={x.id} />} ad={x.ad} alt={x.aciklama} />
          ))}
        </Izgara>
      ),
      ozet: () => tip.ad,
    },
    {
      id: "yukseklik",
      baslik: "Çit yüksekliği",
      soru: "Çit kaç metre yüksek olsun?",
      yardim:
        "Yerden telin üst kenarına kadar olan yükseklik. Bahçe için genelde 1,5 m, güvenlik için 1,75–2 m seçilir. Direk boyu buna göre otomatik hesaplanır (toprakta gömme payı, kaşlıysa kaş boyu eklenir).",
      icerik: () => (
        <Izgara sutun={tip.yukseklikler.length > 4 ? 3 : 4}>
          {tip.yukseklikler.map((h) => (
            <Secenek key={h} secili={t.tel.yukseklik === h} onClick={() => guncelle((x) => void (x.tel.yukseklik = h))} ad={`${sayi(h, 2)} m`} />
          ))}
        </Izgara>
      ),
      ozet: () => `${sayi(t.tel.yukseklik, 2)} m`,
    },
    {
      id: "ozellik",
      baslik: "Tel özellikleri",
      soru: t.tel.tip === "dikenli" ? "Kaç sıra dikenli tel çekilecek?" : "Göz aralığı, tel kalınlığı ve kaplama",
      yardim:
        t.tel.tip === "dikenli"
          ? "Dikenli tel yatay sıralar halinde çekilir. Sıra sayısı arttıkça çit sıklaşır. Sıra arası, iki tel arasındaki mesafedir."
          : "Göz aralığı: tel ilmekleri arasındaki boşluk; küçük göz daha sık ve sağlam olur. Tel kalınlığı: kalın tel daha dayanıklıdır. İkisi de fiyatı etkiler. Galvaniz gri metal renktir; PVC yeşil kaplama paslanmaya karşı ek koruma verir.",
      icerik: () => (
        <div className="space-y-6">
          {t.tel.tip === "dikenli" ? (
            <div className="max-w-xs">
              <SayiGiris etiket="Sıra sayısı" birim="sıra" min={2} max={12} deger={t.tel.sira} onChange={(v) => guncelle((x) => void (x.tel.sira = Math.round(v)))} />
            </div>
          ) : null}
          <Grup ad={t.tel.tip === "dikenli" ? "Sıra arası" : "Göz aralığı"}>
            {tip.gozler.map((g) => (
              <Secenek key={g} secili={t.tel.goz === g} onClick={() => guncelle((x) => void (x.tel.goz = g))} ad={`${g} mm`} />
            ))}
          </Grup>
          <Grup ad="Tel kalınlığı">
            {tip.kalinliklar.map((k) => (
              <Secenek key={k} secili={t.tel.kalinlik === k} onClick={() => guncelle((x) => void (x.tel.kalinlik = k))} ad={`${sayi(k)} mm`} />
            ))}
          </Grup>
          {tip.kaplamalar.length > 1 && (
            <Grup ad="Kaplama">
              {tip.kaplamalar.map((k) => (
                <Secenek
                  key={k}
                  secili={t.tel.kaplama === k}
                  onClick={() =>
                    guncelle((x) => {
                      x.tel.kaplama = k;
                      if (k === "pvc" && x.direk.renk === "galvaniz") x.direk.renk = "yesil";
                    })
                  }
                  ad={k === "pvc" ? "PVC yeşil" : "Galvaniz"}
                />
              ))}
            </Grup>
          )}
        </div>
      ),
      ozet: () =>
        t.tel.tip === "dikenli"
          ? `${t.tel.sira} sıra · ${sayi(t.tel.kalinlik)} mm`
          : `${t.tel.goz} mm göz · ${sayi(t.tel.kalinlik)} mm · ${t.tel.kaplama === "pvc" ? "PVC yeşil" : "galvaniz"}`,
    },
    {
      id: "direk",
      baslik: "Direk tipi",
      soru: "Hangi direk kullanılacak?",
      yardim:
        "Beton direk: ekonomik ve uzun ömürlü, toprak arazide kullanılır. Profil direk: kare kesitli galvaniz kutu profil. Boru direk: yuvarlak galvaniz boru. Profil ve boru boyanabilir; beton zeminde flanşlı olarak sabitlenir.",
      icerik: () => (
        <Izgara sutun={3}>
          {DIREK_TIPLERI.map((d) => (
            <Secenek
              key={d.id}
              secili={t.direk.tip === d.id}
              onClick={() => direkTipiSec(d.id)}
              resim={<DirekIkon tip={d.id} />}
              ad={d.ad}
              alt={d.aciklama}
              pasif={t.zemin === "beton" && !betondaOlur(d.id) ? "Beton zeminde kullanılmaz" : undefined}
            />
          ))}
        </Izgara>
      ),
      ozet: () => dt.ad,
    },
    {
      id: "direkOlcu",
      baslik: demir ? "Direk ölçüsü ve rengi" : "Direk ölçüsü",
      soru: demir ? "Direk kalınlığı ve rengi" : "Direk kalınlığı ne olsun?",
      yardim:
        "Ölçü, ara direklerin kesitidir. Köşe, gergi ve kapı direkleri otomatik olarak bir üst ölçüden seçilir, çünkü teli onlar gerer. " +
        (demir ? "Galvaniz boyasızdır; diğer renkler fırın boyalıdır ve fiyata boya farkı eklenir. RAL kodu PDF teklifte yazar." : ""),
      icerik: () => (
        <div className="space-y-6">
          <Grup ad="Ölçü (ara direk)">
            {dt.olculer.map((o) => (
              <Secenek key={o} secili={t.direk.olcu === o} onClick={() => guncelle((x) => void (x.direk.olcu = o))} ad={o} />
            ))}
          </Grup>
          {demir && (
            <Grup ad="Renk">
              {DIREK_RENKLERI.map((r) => (
                <Secenek
                  key={r.id}
                  secili={t.direk.renk === r.id}
                  onClick={() => guncelle((x) => void (x.direk.renk = r.id))}
                  resim={
                    <span
                      className="mx-auto block h-full w-10 rounded-md ring-1 ring-black/30"
                      style={{ background: r.id === "galvaniz" ? "linear-gradient(135deg,#e3e9f0,#8f9bab)" : r.renk }}
                    />
                  }
                  ad={r.ad}
                  alt={r.kod}
                />
              ))}
            </Grup>
          )}
        </div>
      ),
      ozet: () => `${t.direk.olcu}${demir ? ` · ${direkRengi(t.direk.renk).ad.toLocaleLowerCase("tr")}` : ""}`,
    },
    {
      id: "kas",
      baslik: "Direk üstü (kaş)",
      soru: "Direklerin üstünde kaş olsun mu?",
      yardim:
        "Kaş, direğin tepesindeki uzantıdır; üstüne dikenli ya da jiletli tel takılır. Eğik: dışa doğru 45° yatık. Düz: dik yukarı uzar. V: iki yana açılır, iki sıra tel taşır. Panel çitte eğik kaş seçilirse köşeler çift direk ve payandalı olur.",
      icerik: () => (
        <Izgara sutun={4}>
          {(
            [
              ["yok", "Yok", "Düz direk"],
              ["egik", "Eğik", "Dışa yatık"],
              ["duz", "Düz", "Dik uzantı"],
              ["v", "V", "İki yana"],
            ] as const
          ).map(([id, ad, alt]) => (
            <Secenek
              key={id}
              secili={(t.direk.kasli ? t.direk.kasTipi : "yok") === id}
              onClick={() =>
                guncelle((x) => {
                  x.direk.kasli = id !== "yok";
                  if (id !== "yok") x.direk.kasTipi = id;
                })
              }
              resim={<KasCizim tip={id} />}
              ad={ad}
              alt={alt}
            />
          ))}
        </Izgara>
      ),
      ozet: () => (t.direk.kasli ? { egik: "Eğik", duz: "Düz", v: "V" }[t.direk.kasTipi] : "Yok"),
    },
    {
      id: "payanda",
      baslik: "Payanda",
      soru: "Kaç direkte bir payanda olsun?",
      yardim:
        "Payanda, direği yandan destekleyen çapraz destektir. Köşe, uç ve kapı direklerine her zaman konur. Uzun kenarlarda teli germek için her N. direk de iki yana payandalı gergi direği olur. 0 yazarsanız yalnızca köşe, uç ve kapı direklerinde kalır.",
      gizli: !payandaVar(t),
      icerik: () => (
        <div className="grid items-center gap-6 md:grid-cols-2">
          <SayiGiris
            etiket="Kaç direkte bir"
            birim="direk"
            min={0}
            max={50}
            deger={t.direk.payandaHer}
            onChange={(v) => guncelle((x) => void (x.direk.payandaHer = Math.round(v)))}
          />
          <div className="cam rounded-2xl p-4 text-lg">
            Toplam <b>{sonuc.sayilar.toplamDirek}</b> direk, <b>{sonuc.sayilar.payanda}</b> payanda
            <div className="mt-1 text-sm text-[var(--metin-2)]">
              {t.direk.payandaHer > 0 ? `Her ${t.direk.payandaHer}. direk gergi direği olur.` : "Yalnız köşe, uç ve kapı direklerinde."}
            </div>
          </div>
        </div>
      ),
      ozet: () => (t.direk.payandaHer > 0 ? `Her ${t.direk.payandaHer} direkte bir` : "Yalnız köşe/uç/kapı"),
    },
    {
      id: "ustTel",
      baslik: "Çitin üstü",
      soru: "Çitin üstüne ek koruma eklensin mi?",
      yardim:
        "Dikenli tel: kaş kollarına sıra sıra çekilir. Jiletli spiral: halka halka açılan jiletli tel, yüksek güvenlik sağlar. Düzlemsel jiletli: spiral yerine düz bir jilet bant olarak çitin tepesine oturur. Dikenli ve spiral seçilince direkler otomatik kaşlı olur.",
      gizli: t.tel.tip === "dikenli",
      icerik: () => (
        <div className="space-y-6">
          <Izgara sutun={4}>
            {(
              [
                ["yok", "Yok"],
                ["dikenli", "Dikenli tel"],
                ["jiletli", "Jiletli spiral"],
                ["duzlemsel", "Düzlemsel jiletli"],
              ] as const
            ).map(([id, ad]) => (
              <Secenek
                key={id}
                secili={t.ekstra.ustTel === id}
                onClick={() =>
                  guncelle((x) => {
                    x.ekstra.ustTel = id;
                    if (id === "dikenli" || id === "jiletli") x.direk.kasli = true;
                  })
                }
                ad={ad}
              />
            ))}
          </Izgara>
          {t.ekstra.ustTel === "dikenli" && (
            <div className="max-w-xs">
              <SayiGiris etiket="Kaç sıra" birim="sıra" min={1} max={5} deger={t.ekstra.ustSira} onChange={(v) => guncelle((x) => void (x.ekstra.ustSira = Math.round(v)))} />
            </div>
          )}
        </div>
      ),
      ozet: () =>
        ({ yok: "Yok", dikenli: `Dikenli tel · ${t.ekstra.ustSira} sıra`, jiletli: "Jiletli spiral", duzlemsel: "Düzlemsel jiletli" })[t.ekstra.ustTel],
    },
    {
      id: "kapi",
      baslik: "Kapılar",
      soru: "Çitte kapı olacak mı?",
      yardim:
        "Yaya kapısı 1 m, araç kapısı 4 m genişliğinde gelir. Kapılar kenarların ortasına yerleştirilir. Yerini, genişliğini ya da sayısını sonra ana ekrandaki “Ekstralar” bölümünden değiştirebilirsiniz.",
      icerik: () => (
        <div className="grid items-center gap-6 md:grid-cols-[3fr_2fr]">
          <Izgara sutun={2}>
            {(
              [
                ["yok", "Kapı yok", null],
                ["yaya", "Yaya kapısı", false],
                ["arac", "Araç kapısı", true],
                ["ikisi", "Yaya + araç", true],
              ] as const
            ).map(([id, ad, arac]) => (
              <Secenek
                key={id}
                secili={kapiSecimi(t) === id}
                onClick={() => guncelle((x) => kapilariKur(x, id))}
                resim={arac === null ? undefined : <KapiIkon arac={arac} />}
                ad={ad}
              />
            ))}
          </Izgara>
          <Plan t={t} />
        </div>
      ),
      ozet: () => ({ yok: "Yok", yaya: "Yaya kapısı", arac: "Araç kapısı", ikisi: "Yaya + araç kapısı" })[kapiSecimi(t)],
    },
    {
      id: "hizmet",
      baslik: "Hizmetler",
      soru: "Hangi hizmetler teklife eklensin?",
      yardim:
        "Montaj: çitin kurulum işçiliği, metre başına. Beton temel: toprakta her direğin dibine beton dökülür (beton zeminde gerekmez). Nakliye: malzemenin sahaya taşınması, sabit ücret + km başı.",
      icerik: () => (
        <div className="space-y-4">
          <Izgara sutun={3}>
            <Secenek secili={t.ekstra.montaj} onClick={() => guncelle((x) => void (x.ekstra.montaj = !x.ekstra.montaj))} ad="Montaj" alt="Kurulum işçiliği" />
            <Secenek
              secili={t.zemin === "toprak" && t.ekstra.temel}
              onClick={() => guncelle((x) => void (x.ekstra.temel = !x.ekstra.temel))}
              ad="Beton temel"
              alt="Direk dibine beton"
              pasif={t.zemin === "beton" ? "Beton zeminde gerekmez" : undefined}
            />
            <Secenek secili={t.ekstra.nakliye} onClick={() => guncelle((x) => void (x.ekstra.nakliye = !x.ekstra.nakliye))} ad="Nakliye" alt="Sahaya taşıma" />
          </Izgara>
          <p className="text-sm text-[var(--metin-2)]">Birden fazla seçebilirsiniz; tekrar dokununca kaldırılır.</p>
          {t.ekstra.nakliye && (
            <div className="max-w-xs">
              <SayiGiris etiket="Nakliye mesafesi" birim="km" adim={5} max={2000} deger={t.ekstra.nakliyeKm} onChange={(v) => guncelle((x) => void (x.ekstra.nakliyeKm = v))} />
            </div>
          )}
        </div>
      ),
      ozet: () =>
        [t.ekstra.montaj && "Montaj", t.zemin === "toprak" && t.ekstra.temel && "Beton temel", t.ekstra.nakliye && `Nakliye ${sayi(t.ekstra.nakliyeKm)} km`]
          .filter(Boolean)
          .join(" · ") || "Yok",
    },
  ];
  const gorunen = adimlar.filter((a) => !a.gizli);
  const OZET = gorunen.length; // son ekran: özet
  const i = Math.min(sira, OZET);
  const adim = gorunen[i] as Adim | undefined;

  const git = (n: number) => {
    setSira(Math.max(0, Math.min(OZET, n)));
    setYardim(false);
  };

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if (e.key === "Escape") kapat();
    };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [kapat]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-2 backdrop-blur-sm sm:p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Soru-cevap ile planla"
        className="yukari flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* İlerleme çubuğu */}
        <div className="h-1.5 shrink-0 bg-white/10">
          <div className="h-full bg-ac-kirmizi transition-all duration-300" style={{ width: `${(i / OZET) * 100}%` }} />
        </div>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="text-xs font-bold uppercase tracking-widest text-ac-mavi">Soru-cevap ile planla</div>
            <div className="truncate text-lg font-extrabold sm:text-xl">{adim ? `Adım ${i + 1} / ${OZET} · ${adim.baslik}` : "Özet"}</div>
          </div>
          <button type="button" onClick={kapat} className="shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-base font-bold ring-1 ring-white/15 hover:bg-white/20">
            Kapat ✕
          </button>
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
                <h2 className="text-2xl font-extrabold sm:text-3xl">Her şey hazır. Seçimleriniz:</h2>
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
                  <div className="space-y-4">
                    <Plan t={t} />
                    <div className="cam rounded-2xl p-4">
                      <div className="text-sm text-[var(--metin-2)]">
                        {sayi(sonuc.telUzunluk)} m çit · {sonuc.sayilar.toplamDirek} direk · {sonuc.sayilar.payanda} payanda
                      </div>
                      <div className="mt-1 flex items-end justify-between">
                        <span className="font-bold uppercase tracking-wider">Toplam · KDV dahil</span>
                        <span className="text-3xl font-extrabold text-ac-kirmizi-acik tabular-nums">{tl(sonuc.toplam)}</span>
                      </div>
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
            <button
              type="button"
              autoFocus
              onClick={() => git(i + 1)}
              className="ml-auto rounded-xl bg-ac-kirmizi px-6 py-3.5 text-base font-extrabold uppercase tracking-wider shadow-[0_8px_30px_-6px_var(--color-ac-kirmizi)] hover:bg-ac-kirmizi-acik sm:ml-0 sm:px-10"
            >
              İleri →
            </button>
          ) : (
            <button
              type="button"
              autoFocus
              onClick={kapat}
              className="ml-auto rounded-xl bg-ac-kirmizi px-6 py-3.5 text-base font-extrabold uppercase tracking-wider shadow-[0_8px_30px_-6px_var(--color-ac-kirmizi)] hover:bg-ac-kirmizi-acik sm:ml-0 sm:px-10"
            >
              3D planı oluştur ✓
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Grup({ ad, children }: { ad: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold uppercase tracking-wider text-[var(--metin-2)]">{ad}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">{children}</div>
    </div>
  );
}

/** Kaş biçimlerinin basit çizimi. */
function KasCizim({ tip }: { tip: "yok" | "egik" | "duz" | "v" }) {
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden>
      <path d="M10 56h40" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="27" y="22" width="6" height="34" rx="1" fill="currentColor" />
      {tip === "egik" && <path d="M31 24 44 8" stroke="var(--color-ac-kirmizi)" strokeWidth="4" strokeLinecap="round" />}
      {tip === "duz" && <path d="M30 22V6" stroke="var(--color-ac-kirmizi)" strokeWidth="4" strokeLinecap="round" />}
      {tip === "v" && <path d="M18 8 30 22 42 8" fill="none" stroke="var(--color-ac-kirmizi)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
