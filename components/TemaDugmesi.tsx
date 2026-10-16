"use client";
import { useEffect } from "react";
import { useTema } from "@/lib/tema";

/** Üst menüdeki güneş / ay düğmesi: koyu ve açık tema arasında geçer. */
export function TemaDugmesi({ className = "" }: { className?: string }) {
  const tema = useTema((s) => s.tema);
  const degistir = useTema((s) => s.degistir);
  useEffect(() => void useTema.persist.rehydrate(), []);
  const acik = tema === "acik";

  return (
    <button
      type="button"
      onClick={degistir}
      aria-label={acik ? "Koyu temaya geç" : "Açık temaya geç"}
      title={acik ? "Koyu tema" : "Açık tema"}
      className={`cam grid h-8 w-8 shrink-0 place-items-center rounded-full transition hover:bg-[var(--yuzey-2)] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        {acik ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
      </svg>
    </button>
  );
}
