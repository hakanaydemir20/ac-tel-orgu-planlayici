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

/** Kapı kartındaki çizim: çift kanatlı araç kapısı. */
function KapiCizimi() {
  return (
    <svg viewBox="0 0 240 140" className="h-full w-full" aria-hidden>
      <path d="M10 124h220" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
      <rect x="20" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      <rect x="208" y="22" width="12" height="102" rx="2" fill="currentColor" opacity="0.9" />
      {[0, 1].map((k) => {
        const x = 36 + k * 86;
        return (
          <g key={k}>
            <rect x={x} y="34" width="82" height="84" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
            {Array.from({ length: 8 }, (_, i) => (
              <path key={i} d={`M${x + 10 + i * 9} 38v76`} stroke="currentColor" strokeWidth="2" opacity="0.6" />
            ))}
            <path d={`M${x} 76h82`} stroke="currentColor" strokeWidth="3" opacity="0.8" />
          </g>
        );
      })}
      <circle cx="114" cy="78" r="3.5" fill="var(--color-ac-kirmizi)" />
      <circle cx="126" cy="78" r="3.5" fill="var(--color-ac-kirmizi)" />
    </svg>
  );
}

const KARTLAR = [
  { href: "/cit", ad: "Çit Planlayıcı", aciklama: "Araziyi çizin, tel ve direği seçin; 3D görün, teklif verin.", Cizim: CitCizimi },
  { href: "/kapi", ad: "Kapı Planlayıcı", aciklama: "Araç ve yaya kapılarını ölçüsüyle planlayın.", Cizim: KapiCizimi },
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

      <div className="grid w-full max-w-4xl gap-5 sm:grid-cols-2">
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
