import Image from "next/image";
import Link from "next/link";
import { TemaDugmesi } from "./TemaDugmesi";
import { varlik } from "@/lib/yol";

/** Çit kartındaki çizim: kafes tel, direkler, payanda. */
function CitCizimi() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden>
      <defs>
        <pattern id="kafes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v12M0 0h12" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        </pattern>
      </defs>
      <path d="M10 124h220" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="22" y="40" width="196" height="84" fill="url(#kafes)" />
      {[28, 22 + 196 / 2, 212].map((x, i) => (
        <g key={i}>
          <rect x={x - 5} y="30" width="10" height="94" rx="2" fill="currentColor" opacity="0.9" />
          <path d={`M${x + 4} 34 l14 -14`} stroke="var(--color-ac-kirmizi)" strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}
      <path d="M28 40H212M28 82H212M28 120H212" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
      <path d="M33 74 66 124" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
      <path d="M40 24 L210 24" stroke="var(--color-ac-kirmizi)" strokeWidth="1.5" strokeDasharray="3 4" />
    </svg>
  );
}

/** Yaya kapısı kartındaki çizim: tek kanatlı kapı. */
function YayaKapiCizimi() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden>
      <path d="M10 124h220" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="70" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="158" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="86" y="30" width="68" height="90" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
      {Array.from({ length: 7 }, (_, i) => (
        <path key={i} d={`M${95 + i * 9} 34v82`} stroke="currentColor" strokeWidth="2" opacity="0.6" />
      ))}
      <path d="M86 75h68" stroke="currentColor" strokeWidth="3" opacity="0.8" />
      <circle cx="146" cy="78" r="3.5" fill="var(--color-ac-kirmizi)" />
    </svg>
  );
}

/** Araç kapısı kartındaki çizim: ray üstünde sürgülü kapı. */
function SurguluKapiCizimi() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden>
      <path d="M10 124h220" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M14 121h212" stroke="currentColor" strokeWidth="3" opacity="0.7" />
      <rect x="18" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="210" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="60" y="34" width="140" height="80" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
      {Array.from({ length: 13 }, (_, i) => (
        <path key={i} d={`M${70 + i * 10} 38v72`} stroke="currentColor" strokeWidth="2" opacity="0.6" />
      ))}
      <circle cx="80" cy="119" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="180" cy="119" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="34" y="96" width="18" height="22" rx="2" fill="var(--color-ac-kirmizi)" opacity="0.85" />
      <path d="M36 70h14m-5-5 5 5-5 5" stroke="var(--color-ac-kirmizi)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const KARTLAR = [
  { href: "/cit", ad: "Çit Planlayıcı", aciklama: "Araziyi çizin, tel ve direği seçin; 3D görün, teklif verin.", Cizim: CitCizimi },
  { href: "/kapi", ad: "Yaya Kapısı Planlayıcı", aciklama: "Yaya kapısını ölçüsüyle planlayın.", Cizim: YayaKapiCizimi },
  { href: "/arac", ad: "Araç Kapısı Planlayıcı", aciklama: "Otomatik sürgülü ve diğer araç kapılarını hazır tasarımlardan ölçü seçerek planlayın.", Cizim: SurguluKapiCizimi },
];

/** Karşılama: planlanacak iş tipini seçtiren iki büyük kart. */
export function Karsilama() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-10">
      <TemaDugmesi className="absolute right-4 top-4" />
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-xl bg-[#fff] px-4 py-2.5 shadow-[0_0_40px_-8px_rgba(10,132,198,0.9)]">
          <Image src={varlik("/logo.png")} alt="AC Tel Örgü" width={240} height={42} priority />
        </div>
        <h1 className="text-2xl font-extrabold uppercase tracking-[0.2em] sm:text-3xl">Ne planlıyoruz?</h1>
        <p className="text-sm text-[var(--metin-2)]">Planlamak istediğiniz işi seçin</p>
      </div>

      <div className="grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {KARTLAR.map(({ href, ad, aciklama, Cizim }) => (
          <Link
            key={href}
            href={href}
            className="cam group flex flex-col items-center gap-4 rounded-3xl p-6 text-center transition hover:-translate-y-1 hover:bg-[var(--yuzey-2)] hover:ring-2 hover:ring-ac-kirmizi sm:p-8"
          >
            <div className="h-36 w-full text-[var(--metin-2)] transition group-hover:text-white sm:h-44">
              <Cizim />
            </div>
            <div className="text-2xl font-extrabold uppercase tracking-wider sm:text-3xl">{ad}</div>
            <p className="text-sm text-[var(--metin-2)]">{aciklama}</p>
            <span className="rounded-xl bg-ac-kirmizi px-6 py-3 text-sm font-extrabold uppercase tracking-wider shadow-[0_8px_30px_-6px_var(--color-ac-kirmizi)] transition group-hover:bg-ac-kirmizi-acik">
              Başla →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
