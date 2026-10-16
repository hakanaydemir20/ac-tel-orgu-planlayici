import Image from "next/image";
import Link from "next/link";
import { varlik } from "@/lib/yol";

export const metadata = { title: "AC Tel Örgü · Kapı Planlayıcı" };

export default function KapiPlanlayiciSayfasi() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="max-w-md space-y-5">
        <Link href="/" className="inline-block rounded-lg bg-[#fff] px-3 py-2 shadow-[0_0_24px_-6px_rgba(10,132,198,0.8)]">
          <Image src={varlik("/logo.png")} alt="AC Tel Örgü · ana sayfa" width={150} height={26} priority />
        </Link>
        <h1 className="text-2xl font-extrabold uppercase tracking-wider">Kapı Planlayıcı</h1>
        <p className="text-[var(--metin-2)]">Hazırlanıyor. Yakında araç ve yaya kapılarını ölçüsüyle planlayıp teklif verebileceksiniz.</p>
        <Link href="/" className="inline-block rounded-xl bg-ac-kirmizi px-6 py-3 font-extrabold uppercase tracking-wider hover:bg-ac-kirmizi-acik">
          ← Ana sayfa
        </Link>
      </div>
    </main>
  );
}
