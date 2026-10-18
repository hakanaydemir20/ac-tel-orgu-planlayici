"use client";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EnlemBoylam, enlemBoylamdanMetre, mesafe, uydudanUygula } from "@/lib/harita";
import { alan, kendiniKesiyor } from "@/lib/serbest";
import { useTasarim } from "@/lib/store";
import { sayi } from "./ui";

const TURKIYE: [number, number] = [39.0, 35.2];

/**
 * Uydu görüntüsünde araziyi bulup köşelerine tıklayarak işaretler; "Plana aktar" deyince
 * gerçek metre ölçüleriyle elle çizilmiş araziye dönüşür.
 */
export function UyduHarita({ kapat }: { kapat: () => void }) {
  const guncelle = useTasarim((s) => s.guncelle);
  const konum = useTasarim((s) => s.tasarim.konum);
  const kutu = useRef<HTMLDivElement>(null);
  const harita = useRef<Leaflet.Map | null>(null);
  const katman = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const [noktalar, setNoktalar] = useState<EnlemBoylam[]>([]);
  const [kapali, setKapali] = useState(false);
  const [ara, setAra] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [hazir, setHazir] = useState(false);
  const durum = useRef({ noktalar, kapali });
  durum.current = { noktalar, kapali };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && kapat();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [kapat]);

  // Haritayı kur (Leaflet yalnız tarayıcıda yüklenir)
  useEffect(() => {
    let iptal = false;
    import("leaflet").then((mod) => {
      if (iptal || !kutu.current) return;
      const l = (mod as unknown as { default?: typeof Leaflet }).default ?? mod;
      L.current = l;
      const m = l.map(kutu.current, { zoomControl: true, attributionControl: true, maxZoom: 21 });
      m.setView(konum ? [konum.lat, konum.lng] : TURKIYE, konum ? 18 : 6);
      l.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 21,
        maxNativeZoom: 19,
        attribution: "Uydu: Esri, Maxar, Earthstar Geographics",
      }).addTo(m);
      l.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 21,
        maxNativeZoom: 19,
      }).addTo(m);
      katman.current = l.layerGroup().addTo(m);
      m.on("click", (e: Leaflet.LeafletMouseEvent) => {
        if (durum.current.kapali) return;
        setNoktalar((n) => [...n, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      });
      harita.current = m;
      setHazir(true);
    });
    return () => {
      iptal = true;
      harita.current?.remove();
      harita.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Köşeleri, kenarları ve uzunluk yazılarını çiz
  useEffect(() => {
    const l = L.current;
    const g = katman.current;
    if (!l || !g) return;
    g.clearLayers();
    const yollar = noktalar.map((p) => [p.lat, p.lng] as [number, number]);
    if (yollar.length > 1) {
      (kapali ? l.polygon(yollar, { color: "#ff2a2d", weight: 3, fillColor: "#22c55e", fillOpacity: 0.25 }) : l.polyline(yollar, { color: "#ff2a2d", weight: 3, dashArray: "8 6" })).addTo(g);
      const n = kapali ? noktalar.length : noktalar.length - 1;
      for (let i = 0; i < n; i++) {
        const a = noktalar[i];
        const b = noktalar[(i + 1) % noktalar.length];
        l.tooltip({ permanent: true, direction: "center", className: "uydu-olcu" })
          .setLatLng([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2])
          .setContent(`${sayi(mesafe(a, b), 1)} m`)
          .addTo(g);
      }
    }
    noktalar.forEach((p, i) => {
      const ilk = i === 0 && !kapali && noktalar.length >= 3;
      const isaret = l
        .marker([p.lat, p.lng], {
          draggable: true,
          icon: l.divIcon({
            className: "",
            iconSize: [22, 22],
            html: `<div style="width:22px;height:22px;border-radius:50%;background:${ilk ? "#22c55e" : "#ff2a2d"};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.6)"></div>`,
          }),
        })
        .addTo(g);
      isaret.on("click", () => {
        if (ilk) setKapali(true);
      });
      isaret.on("dragend", () => {
        const q = isaret.getLatLng();
        setNoktalar((n) => n.map((x, j) => (j === i ? { lat: q.lat, lng: q.lng } : x)));
      });
    });
  }, [noktalar, kapali, hazir]);

  const yerBul = async () => {
    const q = ara.trim();
    if (!q) return;
    setMesaj("Aranıyor…");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q)}`);
      const [y] = (await r.json()) as { lat: string; lon: string; display_name: string; boundingbox?: string[] }[];
      if (!y) return setMesaj("Bulunamadı. İl, ilçe, mahalle ya da köy adı deneyin.");
      const b = y.boundingbox?.map(Number);
      if (b && b.length === 4) harita.current?.fitBounds([[b[0], b[2]], [b[1], b[3]]], { maxZoom: 17 });
      else harita.current?.setView([+y.lat, +y.lon], 16);
      setMesaj(y.display_name);
    } catch {
      setMesaj("Arama yapılamadı. İnternet bağlantısını kontrol edin.");
    }
  };

  const konumum = () => {
    if (!navigator.geolocation) return setMesaj("Bu cihaz konum vermiyor.");
    setMesaj("Konum alınıyor…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        harita.current?.setView([p.coords.latitude, p.coords.longitude], 19);
        setMesaj("Bulunduğunuz yer");
      },
      () => setMesaj("Konum izni verilmedi."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const metre = enlemBoylamdanMetre(noktalar);
  const kesisiyor = kapali && kendiniKesiyor(metre, true);
  const cevre = metre.reduce((s, p, i) => {
    const q = metre[(i + 1) % metre.length];
    return i === metre.length - 1 && !kapali ? s : s + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
  const aktar = () => {
    guncelle((x) => uydudanUygula(x, noktalar));
    kapat();
  };
  const ipucu = kapali
    ? kesisiyor
      ? "Kenarlar birbirini kesiyor. Köşeleri sürükleyerek düzeltin."
      : "Hazır. Köşeleri sürükleyerek düzeltebilir ya da plana aktarabilirsiniz."
    : noktalar.length < 3
      ? "Araziyi bulup yakınlaştırın, sonra köşelere sırayla tıklayın."
      : "Devam edin ya da kapatmak için ilk köşeye (yeşil) tıklayın.";
  const dugme = "rounded-xl px-4 py-2.5 text-sm font-extrabold uppercase tracking-wider ring-1 ring-white/15 transition disabled:opacity-40";

  // Gövdeye taşınır: cam efektli kartın içinde açılınca "fixed" kartın içine sıkışmasın
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-2 backdrop-blur-sm sm:p-4" onClick={kapat}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Uydudan arazi çiz"
        className="yukari flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-ac-gece shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 shrink-0 bg-[linear-gradient(90deg,var(--color-ac-kirmizi)_0_35%,var(--color-ac-lacivert)_35%)]" />
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
          <h2 className="mr-2 text-xl font-extrabold uppercase tracking-wider">🛰 Uydudan çiz</h2>
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void yerBul();
            }}
          >
            <input
              type="search"
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              placeholder="İl, ilçe, mahalle, köy ya da adres"
              aria-label="Yer ara"
              className="cam min-w-0 flex-1 rounded-xl px-4 py-2.5 text-base outline-none placeholder:text-[var(--metin-2)] focus:ring-2 focus:ring-ac-kirmizi"
            />
            <button type="submit" className={`${dugme} bg-ac-mavi`}>
              Bul
            </button>
          </form>
          <button type="button" onClick={konumum} className={`${dugme} bg-white/10 hover:bg-white/20`}>
            📍 Konumum
          </button>
          <button type="button" onClick={kapat} className={`${dugme} bg-white/10 hover:bg-white/20`}>
            Kapat ✕
          </button>
        </header>

        <div className="relative min-h-0 flex-1">
          <div ref={kutu} className="absolute inset-0 cursor-crosshair bg-[#0b1a2e]" />
          <div className="pointer-events-none absolute left-1/2 top-3 z-[500] w-[min(92%,560px)] -translate-x-1/2 rounded-xl bg-ac-gece/90 px-4 py-2 text-center text-sm font-semibold shadow-lg ring-1 ring-white/10">
            👆 {ipucu}
            {mesaj && <div className="truncate text-xs font-normal text-[var(--metin-2)]">{mesaj}</div>}
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 sm:px-6">
          <div className="mr-auto text-sm">
            <b>{noktalar.length}</b> köşe · çevre <b className="tabular-nums">{sayi(cevre, 1)} m</b>
            {kapali && (
              <>
                {" "}
                · alan <b className="tabular-nums">{sayi(alan(metre), 0)} m²</b>
              </>
            )}
            <div className="text-xs text-[var(--metin-2)]">Uydu ölçüsü yaklaşıktır (±1 m); sahada teyit edin.</div>
          </div>
          <button
            type="button"
            onClick={() => (kapali ? setKapali(false) : setNoktalar((n) => n.slice(0, -1)))}
            disabled={!noktalar.length}
            className={`${dugme} bg-white/10 hover:bg-white/20`}
          >
            ↶ Geri al
          </button>
          <button
            type="button"
            onClick={() => {
              setNoktalar([]);
              setKapali(false);
            }}
            disabled={!noktalar.length}
            className={`${dugme} bg-white/10 hover:bg-white/20`}
          >
            Temizle
          </button>
          <button type="button" onClick={aktar} disabled={!kapali || kesisiyor} className={`${dugme} bg-ac-kirmizi px-6 ring-0 hover:bg-ac-kirmizi-acik`}>
            Plana aktar ✓
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
