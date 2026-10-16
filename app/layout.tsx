import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { TEMA_BETIGI } from "@/lib/temaBetigi";

const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "AC Tel Örgü · Planlayıcı",
  description: "Arazinizi girin, tel ve direk tipini seçin, çitinizi 3D görün.",
};

export const viewport: Viewport = { themeColor: "#06142e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
