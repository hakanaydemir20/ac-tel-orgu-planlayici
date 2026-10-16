import type { NextConfig } from "next";

// GitHub Pages için statik çıktı: YAYIN_YOLU=/repo-adi ile derlenir (yerelde boş)
const yol = process.env.YAYIN_YOLU ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: yol,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_YOL: yol },
};
export default nextConfig;
