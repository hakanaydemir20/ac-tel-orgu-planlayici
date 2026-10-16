"use client";
import { useMemo, useState } from "react";
import { DIREK_RENKLERI, DIREK_TIPLERI, TEL_TIPLERI, telTipi } from "@/lib/katalog";
import { ciftKose, payandaVar, telMetreFiyati } from "@/lib/hesap";
import { useEtkinAyarlar } from "@/lib/ayarlar";
import { betondaOlur, useTasarim } from "@/lib/store";
import { serbesteGec } from "@/lib/serbest";
import { KAPI_GENISLIK, KapiTuru, OLCU_ADLARI, SEKILLER, ZEMINLER, kenarAyari, kenarlariHesapla, kenarHarfi } from "@/lib/tasarim";
import { CizimAlani } from "./CizimAlani";
import { DirekIkon, KapiIkon, SekilIkon, TelIkon, ZeminIkon } from "../ikonlar";
import { Adim, Anahtar, Etiket, Kart, SayiGiris, Secici, sayi, tl } from "../ui";

/** En temel seçim: direkler nereye dikilecek? Direk boyu, sabitleme ve fiyatı belirler. */
export function ZeminAdimi() {
  const { tasarim: t, zeminSec } = useTasarim();
  return (
    <Adim no={1} baslik="Kurulum alanı" ipucu="Çit nereye kurulacak?">
      <div className="grid grid-cols-2 gap-2">
        {ZEMINLER.map((z) => (
          <Kart key={z.id} buyuk secili={t.zemin === z.id} onClick={() => zeminSec(z.id)} resim={<ZeminIkon zemin={z.id} />} ad={z.ad} alt={z.aciklama} />
        ))}
      </div>
    </Adim>
  );
}

export function AraziAdimi() {
  const { tasarim: t, guncelle } = useTasarim();
  const [detay, setDetay] = useState(false);
  const kenarlar = useMemo(() => kenarlariHesapla(t), [t]);
  const adlar = OLCU_ADLARI[t.sekil];
  const olculer = SEKILLER.find((s) => s.id === t.sekil)!.olculer;

  return (
    <Adim
      no={2}
      baslik="Arazi"
      ipucu={t.sekil === "serbest" ? "Araziyi köşe köşe çizin, kenar uzunluklarını yazın" : "Şekli seçin, ölçüleri metre olarak yazın"}
    >
      <div className="grid grid-cols-3 gap-2">
        {SEKILLER.map((s) => (
          <Kart
            key={s.id}
            secili={t.sekil === s.id}
            onClick={() =>
              guncelle((x) => {
                if (x.sekil === s.id) return;
                if (s.id === "serbest") return serbesteGec(x);
                x.sekil = s.id;
                x.ekstra.kapilar = x.ekstra.kapilar.map((k) => ({ ...k, kenar: 0 }));
              })
            }
            resim={<SekilIkon sekil={s.id} />}
            ad={s.ad}
          />
        ))}
      </div>

      {t.sekil === "serbest" && <CizimAlani />}

      <div className="grid grid-cols-2 gap-3">
        {olculer.map((o) => (
          <SayiGiris
            key={o}
            etiket={`${o} · ${adlar[o]}`}
            deger={t.olculer[o]}
            min={1}
            max={2000}
            onChange={(v) => guncelle((x) => void (x.olculer[o] = v))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setDetay(!detay)}
        className="flex w-full items-center justify-between rounded-lg px-1 text-sm font-semibold text-ac-mavi hover:text-white"
      >
        <span>Kenar ayarları · eğim, çit olmayan kenar</span>
        <span className={`transition ${detay ? "rotate-180" : ""}`}>▾</span>
      </button>

      {detay && (
        <div className="space-y-2 yukari">
          {kenarlar.map((k) => (
            <div key={k.i} className="cam flex items-center gap-2 rounded-xl p-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ac-lacivert text-xs font-extrabold ring-1 ring-ac-mavi">
                {kenarHarfi(k.i)}
              </span>
              <div className="w-14 text-sm font-bold">{sayi(k.yatay)} m</div>
              <button
                type="button"
                onClick={() => guncelle((x) => void (kenarAyari(x, k.i).aktif = !k.aktif))}
                className={`rounded-lg px-2 py-1 text-xs font-bold ${k.aktif ? "bg-ac-kirmizi/80" : "bg-white/10 text-[var(--metin-2)]"}`}
              >
                {k.aktif ? "Çit var" : "Çit yok"}
              </button>
              <div className="ml-auto w-36">
                {k.otomatikEgim ? (
                  <div className="text-right text-xs text-[var(--metin-2)]">eğim {sayi(k.egim)} % (otomatik)</div>
                ) : (
                  <SayiGiris
                    kucuk
                    birim="%"
                    min={-60}
                    max={60}
                    deger={k.egim}
                    onChange={(v) => guncelle((x) => void (kenarAyari(x, k.i).egim = v))}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Adim>
  );
}

export function TelAdimi() {
  const { tasarim: t, guncelle, telTipiSec } = useTasarim();
  const tip = telTipi(t.tel.tip);
  const ayarlar = useEtkinAyarlar(t);
  const pvc = t.tel.kaplama === "pvc";
  const metreFiyat = telMetreFiyati(t, t.tel.yukseklik, ayarlar) * (pvc ? 1 + ayarlar.pvcFarkYuzde / 100 : 1);
  return (
    <Adim no={3} baslik="Tel" ipucu="Tel tipini ve ölçülerini seçin">
      <div className="grid grid-cols-4 gap-2">
        {TEL_TIPLERI.map((x) => (
          <Kart key={x.id} secili={t.tel.tip === x.id} onClick={() => telTipiSec(x.id)} resim={<TelIkon tip={x.id} />} ad={x.ad} />
        ))}
      </div>
      <div>
        <Etiket>Yükseklik</Etiket>
        <Secici degerler={tip.yukseklikler} secili={t.tel.yukseklik} bicim={(v) => `${sayi(v, 2)} m`} onChange={(v) => guncelle((x) => void (x.tel.yukseklik = v))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Etiket>{tip.id === "dikenli" ? "Sıra arası" : "Göz aralığı"}</Etiket>
          <Secici degerler={tip.gozler} secili={t.tel.goz} bicim={(v) => `${v} mm`} onChange={(v) => guncelle((x) => void (x.tel.goz = v))} />
        </div>
        <div>
          <Etiket>Tel kalınlığı</Etiket>
          <Secici degerler={tip.kalinliklar} secili={t.tel.kalinlik} bicim={(v) => `${sayi(v)} mm`} onChange={(v) => guncelle((x) => void (x.tel.kalinlik = v))} />
        </div>
      </div>
      {tip.kaplamalar.length > 1 && (
        <div>
          <Etiket>Kaplama</Etiket>
          <Secici
            degerler={tip.kaplamalar}
            secili={t.tel.kaplama}
            bicim={(v) => (v === "pvc" ? "PVC yeşil" : "Galvaniz")}
            onChange={(v) =>
              guncelle((x) => {
                x.tel.kaplama = v;
                // PVC yeşil telde galvaniz demir direk yeşile döner (sonra değiştirilebilir)
                if (v === "pvc" && x.direk.renk === "galvaniz") x.direk.renk = "yesil";
              })
            }
          />
        </div>
      )}
      {tip.id !== "dikenli" && (
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
          <span className="text-[var(--metin-2)]">Seçilen tel fiyatı{pvc ? " · PVC dahil" : ""}</span>
          <b className="tabular-nums">{tl(metreFiyat, true)} / mt</b>
        </div>
      )}
      {tip.id === "dikenli" && (
        <SayiGiris etiket="Sıra sayısı" birim="sıra" min={2} max={12} deger={t.tel.sira} onChange={(v) => guncelle((x) => void (x.tel.sira = Math.round(v)))} />
      )}
    </Adim>
  );
}

export function DirekAdimi({ ozet }: { ozet: { kose: number; gergi: number; payanda: number; toplam: number } }) {
  const { tasarim: t, guncelle, direkTipiSec } = useTasarim();
  const dt = DIREK_TIPLERI.find((d) => d.id === t.direk.tip)!;
  return (
    <Adim no={4} baslik="Direk" ipucu="Direk tipi ve aralığı (önerilen değer hazır gelir)">
      <div className="grid grid-cols-3 gap-2">
        {DIREK_TIPLERI.map((d) => (
          <Kart
            key={d.id}
            secili={t.direk.tip === d.id}
            onClick={() => direkTipiSec(d.id)}
            resim={<DirekIkon tip={d.id} />}
            ad={d.ad}
            alt={d.aciklama}
            pasif={t.zemin === "beton" && !betondaOlur(d.id) ? "Beton zeminde demir direk kullanılır" : undefined}
          />
        ))}
      </div>
      <div>
        <Etiket>Ölçü</Etiket>
        <Secici degerler={dt.olculer} secili={t.direk.olcu} onChange={(v) => guncelle((x) => void (x.direk.olcu = v))} />
      </div>
      {dt.id !== "beton" && (
        <div>
          <Etiket>Direk rengi</Etiket>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Direk rengi">
            {DIREK_RENKLERI.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={t.direk.renk === r.id}
                title={r.kod}
                onClick={() => guncelle((x) => void (x.direk.renk = r.id))}
                className={`cam flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-bold transition hover:bg-[var(--yuzey-2)] ${t.direk.renk === r.id ? "secili" : ""}`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/30"
                  style={{ background: r.id === "galvaniz" ? "linear-gradient(135deg,#e3e9f0,#8f9bab)" : r.renk }}
                />
                {r.ad}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 items-end gap-3">
        <SayiGiris etiket="Direk aralığı" adim={0.25} min={1} max={6} deger={t.direk.aralik} onChange={(v) => guncelle((x) => void (x.direk.aralik = v))} />
        <div>
          <Etiket>Kaş (direk üstü)</Etiket>
          <Secici
            degerler={["yok", "egik", "duz", "v"] as const}
            secili={t.direk.kasli ? t.direk.kasTipi : "yok"}
            bicim={(v) => ({ yok: "Yok", egik: "Eğik", duz: "Düz", v: "V" })[v]}
            onChange={(v) =>
              guncelle((x) => {
                x.direk.kasli = v !== "yok";
                if (v !== "yok") x.direk.kasTipi = v;
              })
            }
          />
        </div>
      </div>
      <div className={`grid grid-cols-2 items-end gap-3 ${payandaVar(t) ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!payandaVar(t)}>
        <SayiGiris
          etiket="Kaç direkte bir payanda"
          birim="direk"
          adim={1}
          min={0}
          max={50}
          deger={t.direk.payandaHer}
          onChange={(v) => guncelle((x) => void (x.direk.payandaHer = Math.round(v)))}
        />
        <p className="pb-2 text-[11px] leading-snug text-[var(--metin-2)]">
          {!payandaVar(t)
            ? "Panel çitte payanda yok (eğik kaşlı direkte olur)."
            : t.direk.payandaHer > 0
              ? `Her ${t.direk.payandaHer}. direk iki yana payandalı gergi direği.`
              : "Payanda yalnız köşe, uç ve kapı direklerinde."}
          {t.tel.tip === "kafes" && " Örgü telde köşeler çift direk."}
          {t.tel.tip === "panel" && (ciftKose(t) ? " Eğik kaşlı panelde köşeler çift direk." : " Panelde köşeler tek direk (eğik kaşta çift).")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          ["Toplam", ozet.toplam],
          ["Köşe", ozet.kose],
          ["Gergi", ozet.gergi],
          ["Payanda", ozet.payanda],
        ].map(([ad, n]) => (
          <span key={ad} className="rounded-full bg-ac-mavi/15 px-2.5 py-1 font-semibold text-sky-200 ring-1 ring-ac-mavi/40">
            {ad}: <b className="text-white">{n}</b>
          </span>
        ))}
        <span className="px-1 py-1 text-[var(--metin-2)]">otomatik hesaplanır</span>
      </div>
    </Adim>
  );
}

export function EkstraAdimi() {
  const { tasarim: t, guncelle } = useTasarim();
  const kenarlar = useMemo(() => kenarlariHesapla(t), [t]);
  const kapiEkle = (tur: KapiTuru) =>
    guncelle((x) => {
      const k = kenarlar.find((e) => e.aktif) ?? kenarlar[0];
      if (!k) return; // çizimde henüz kenar yok
      const g = KAPI_GENISLIK[tur];
      x.ekstra.kapilar.push({ id: Math.random().toString(36).slice(2, 8), kenar: k.i, konum: Math.max(0, (k.yatay - g) / 2), tur, genislik: g });
    });

  return (
    <Adim no={5} baslik="Ekstralar" ipucu="Kapı, üst tel ve hizmetler">
      {t.tel.tip !== "dikenli" && (
        <div>
          <Etiket>Çitin üstüne</Etiket>
          <Secici
            degerler={["yok", "dikenli", "jiletli", "duzlemsel"] as const}
            secili={t.ekstra.ustTel}
            bicim={(v) => ({ yok: "Yok", dikenli: "Dikenli tel", jiletli: "Jiletli spiral", duzlemsel: "Düzlemsel jiletli" })[v]}
            onChange={(v) => guncelle((x) => {
              x.ekstra.ustTel = v;
              // Dikenli ve spiral kaş koluna takılır; düzlemsel jiletli çitin tepesine dik oturur
              if (v === "dikenli" || v === "jiletli") x.direk.kasli = true;
            })}
          />
          {t.ekstra.ustTel === "dikenli" && (
            <div className="mt-3 w-40">
              <SayiGiris kucuk etiket="Sıra" birim="sıra" min={1} max={5} deger={t.ekstra.ustSira} onChange={(v) => guncelle((x) => void (x.ekstra.ustSira = Math.round(v)))} />
            </div>
          )}
        </div>
      )}

      <div>
        <Etiket>Kapılar</Etiket>
        <div className="space-y-2">
          {t.ekstra.kapilar.map((k, i) => {
            const kenar = kenarlar[k.kenar];
            return (
              <div key={k.id} className="cam space-y-2 rounded-xl p-3 yukari">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-12 text-ac-mavi">
                    <KapiIkon arac={k.tur === "arac"} />
                  </div>
                  <b className="text-sm">{k.tur === "arac" ? "Araç kapısı" : "Yaya kapısı"}</b>
                  {(!kenar || !kenar.aktif) && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/40">
                      {kenar ? "Bu kenarda çit yok" : "Kenar yok"} · hesaba girmiyor
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => guncelle((x) => void x.ekstra.kapilar.splice(i, 1))}
                    className="ml-auto rounded-lg px-2 py-1 text-xs font-bold text-[var(--metin-2)] hover:bg-ac-kirmizi/30 hover:text-white"
                  >
                    Kaldır ✕
                  </button>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--metin-2)]">Hangi kenarda</div>
                  <Secici
                    degerler={kenarlar.filter((e) => e.aktif).map((e) => e.i)}
                    secili={k.kenar}
                    bicim={(v) => kenarHarfi(v)}
                    onChange={(v) => guncelle((x) => {
                      x.ekstra.kapilar[i].kenar = v;
                      x.ekstra.kapilar[i].konum = Math.max(0, (kenarlar[v].yatay - k.genislik) / 2);
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SayiGiris kucuk etiket="Köşeden uzaklık" adim={0.5} max={kenar ? Math.max(0, kenar.yatay - k.genislik) : 100} deger={k.konum} onChange={(v) => guncelle((x) => void (x.ekstra.kapilar[i].konum = v))} />
                  <SayiGiris kucuk etiket="Genişlik" adim={0.25} min={0.8} max={10} deger={k.genislik} onChange={(v) => guncelle((x) => void (x.ekstra.kapilar[i].genislik = v))} />
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!kenarlar.length} onClick={() => kapiEkle("yaya")} className="disabled:opacity-40 cam rounded-xl py-2.5 text-sm font-bold hover:bg-[var(--yuzey-2)]">
              + Yaya kapısı
            </button>
            <button type="button" disabled={!kenarlar.length} onClick={() => kapiEkle("arac")} className="disabled:opacity-40 cam rounded-xl py-2.5 text-sm font-bold hover:bg-[var(--yuzey-2)]">
              + Araç kapısı
            </button>
          </div>
        </div>
      </div>

      <div>
        <Etiket>Hizmetler</Etiket>
        <div className="cam divide-y divide-white/5 rounded-xl px-3 py-1">
          <Anahtar acik={t.ekstra.montaj} onChange={(v) => guncelle((x) => void (x.ekstra.montaj = v))}>
            Montaj işçiliği
          </Anahtar>
          {t.zemin === "toprak" ? (
            <Anahtar acik={t.ekstra.temel} onChange={(v) => guncelle((x) => void (x.ekstra.temel = v))}>
              Direk beton temeli
            </Anahtar>
          ) : (
            <p className="py-2 text-xs text-[var(--metin-2)]">
              Beton zemin: flanşlı demir direkler dübelle sabitlenir; beton temel gerekmez.
            </p>
          )}
          <Anahtar acik={t.ekstra.nakliye} onChange={(v) => guncelle((x) => void (x.ekstra.nakliye = v))}>
            Nakliye
          </Anahtar>
          {t.ekstra.nakliye && (
            <div className="py-2">
              <SayiGiris kucuk etiket="Mesafe" birim="km" adim={5} max={2000} deger={t.ekstra.nakliyeKm} onChange={(v) => guncelle((x) => void (x.ekstra.nakliyeKm = v))} />
            </div>
          )}
        </div>
      </div>
    </Adim>
  );
}
