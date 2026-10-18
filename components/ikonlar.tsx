// Seçim kartlarındaki çizimler. currentColor ile renklenir.
import { DirekTipiId, TelTipiId } from "@/lib/katalog";
import { SekilId, Zemin, sekilNoktalari, varsayilanTasarim } from "@/lib/tasarim";

const ORNEK = { A: 30, B: 20, C: 12, D: 9 };
const SERBEST_ORNEK = {
  noktalar: [[2, 0], [26, 3], [32, 16], [18, 22], [4, 17]] as [number, number][],
  kapali: true,
};

export function SekilIkon({ sekil }: { sekil: SekilId }) {
  const { noktalar, kapali } = sekilNoktalari({
    ...varsayilanTasarim(),
    sekil,
    olculer: sekil === "kare" ? { ...ORNEK, A: 20 } : ORNEK,
    serbest: SERBEST_ORNEK,
  });
  const xs = noktalar.map((p) => p[0]);
  const zs = noktalar.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs) || 1;
  const h = Math.max(...zs) - Math.min(...zs) || 1;
  const k = Math.min(64 / w, 36 / h);
  const pts = noktalar.map(([x, z]) => `${40 + (x - w / 2) * k},${24 - (z - (sekil === "duz" ? 0 : h / 2)) * k}`).join(" ");
  const El = kapali ? "polygon" : "polyline";
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full">
      <El
        points={pts}
        fill={kapali ? "currentColor" : "none"}
        fillOpacity={0.12}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeDasharray={sekil === "serbest" ? "5 3" : undefined}
      />
      {sekil === "serbest" && <path d="M58 6l6 6-14 14h-6v-6z" fill="var(--color-ac-mavi)" />}
      {noktalar.map(([x, z], i) => (
        <circle key={i} cx={40 + (x - w / 2) * k} cy={24 - (z - (sekil === "duz" ? 0 : h / 2)) * k} r={2.6} fill="var(--color-ac-kirmizi)" />
      ))}
    </svg>
  );
}

export function TelIkon({ tip }: { tip: TelTipiId }) {
  const cerceve = (
    <>
      <rect x="6" y="6" width="3" height="38" rx="1" fill="currentColor" />
      <rect x="71" y="6" width="3" height="38" rx="1" fill="currentColor" />
    </>
  );
  let desen: React.ReactNode;
  if (tip === "kafes") {
    desen = (
      <g clipPath="url(#k)">
        <clipPath id="k">
          <rect x="9" y="10" width="62" height="30" />
        </clipPath>
        {Array.from({ length: 14 }, (_, i) => (
          <g key={i} stroke="currentColor" strokeWidth="1.3">
            <line x1={-20 + i * 8} y1={10} x2={10 + i * 8} y2={40} />
            <line x1={-20 + i * 8} y1={40} x2={10 + i * 8} y2={10} />
          </g>
        ))}
      </g>
    );
  } else if (tip === "panel") {
    desen = (
      <g stroke="currentColor" strokeWidth="1.6">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={12 + i * 5} y1={10} x2={12 + i * 5} y2={40} />
        ))}
        {[10, 22, 30, 40].map((y) => (
          <line key={y} x1={9} y1={y} x2={71} y2={y} />
        ))}
      </g>
    );
  } else if (tip === "dikenli") {
    desen = (
      <g stroke="currentColor" strokeWidth="1.6">
        {[12, 20, 28, 36].map((y) => (
          <g key={y}>
            <line x1={9} y1={y} x2={71} y2={y} />
            {Array.from({ length: 6 }, (_, i) => (
              <path key={i} d={`M${14 + i * 10} ${y - 3} l4 6 M${18 + i * 10} ${y - 3} l-4 6`} />
            ))}
          </g>
        ))}
      </g>
    );
  } else {
    desen = (
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 7 }, (_, c) => {
            const x = 13 + c * 9 + (r % 2) * 4.5;
            const y = 14 + r * 7.5;
            return (
              <polygon
                key={`${r}-${c}`}
                points={`${x},${y - 4} ${x + 3.8},${y - 2} ${x + 3.8},${y + 2} ${x},${y + 4} ${x - 3.8},${y + 2} ${x - 3.8},${y - 2}`}
              />
            );
          })
        )}
      </g>
    );
  }
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full">
      {desen}
      {cerceve}
    </svg>
  );
}

export function DirekIkon({ tip }: { tip: DirekTipiId }) {
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full">
      <line x1="10" y1="44" x2="70" y2="44" stroke="currentColor" strokeOpacity={0.4} strokeWidth="2" />
      {tip === "beton" && (
        <>
          <rect x="34" y="6" width="12" height="38" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth="1.5" />
          <path d="M37 14h6M37 24h6M37 34h6" stroke="currentColor" strokeWidth="1" />
        </>
      )}
      {tip === "profil" && (
        <>
          <rect x="35" y="6" width="10" height="38" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="33" y="4" width="14" height="3" fill="currentColor" />
        </>
      )}
      {tip === "boru" && (
        <>
          <rect x="35" y="7" width="10" height="37" rx="5" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth="2" />
          <ellipse cx="40" cy="7" rx="5" ry="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function KapiIkon({ arac }: { arac: boolean }) {
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2">
      {arac ? (
        <>
          <rect x="10" y="12" width="29" height="30" />
          <rect x="41" y="12" width="29" height="30" />
          <path d="M10 27h29M41 27h29" strokeOpacity={0.5} />
        </>
      ) : (
        <>
          <rect x="28" y="10" width="24" height="32" />
          <circle cx="47" cy="27" r="1.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** Kurulum alanı: toprakta direk gömülü, betonda ayak plakasına oturur. */
export function ZeminIkon({ zemin }: { zemin: Zemin }) {
  if (zemin === "toprak")
    return (
      <svg viewBox="0 0 80 48" className="h-full w-full">
        <rect x="6" y="30" width="68" height="16" rx="2" fill="#7a5230" fillOpacity={0.55} />
        <path d="M6 30h68" stroke="#3fa35b" strokeWidth="3" />
        {[12, 22, 54, 64].map((x) => (
          <path key={x} d={`M${x} 30l2-5 2 5`} stroke="#3fa35b" strokeWidth="1.5" fill="none" />
        ))}
        <rect x="36" y="4" width="8" height="36" fill="currentColor" fillOpacity={0.35} stroke="currentColor" strokeWidth="1.5" />
        <path d="M36 30h8" stroke="currentColor" strokeDasharray="2 2" />
        <rect x="33" y="34" width="14" height="8" rx="1" fill="#9aa5b4" fillOpacity={0.6} />
      </svg>
    );
  if (zemin === "duvar")
    return (
      <svg viewBox="0 0 80 48" className="h-full w-full">
        <rect x="4" y="44" width="72" height="3" rx="1" fill="#7a5230" fillOpacity={0.55} />
        <rect x="26" y="24" width="28" height="20" fill="#9aa5b4" fillOpacity={0.7} stroke="currentColor" strokeOpacity={0.4} />
        <path d="M26 31h28M26 37h28M40 24v7M33 31v6M47 31v6M40 37v7" stroke="currentColor" strokeOpacity={0.35} />
        <rect x="37" y="3" width="6" height="19" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="32" y="21.5" width="16" height="2.5" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 80 48" className="h-full w-full">
      <rect x="6" y="32" width="68" height="12" rx="2" fill="#9aa5b4" fillOpacity={0.6} />
      {[14, 28, 52, 66].map((x) => (
        <circle key={x} cx={x} cy={38} r={0.9} fill="currentColor" fillOpacity={0.5} />
      ))}
      <rect x="37" y="6" width="6" height="25" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="31" y="30" width="18" height="2.5" fill="currentColor" />
      <circle cx="33.5" cy="31.2" r="0.9" fill="var(--color-ac-kirmizi)" />
      <circle cx="46.5" cy="31.2" r="0.9" fill="var(--color-ac-kirmizi)" />
    </svg>
  );
}
