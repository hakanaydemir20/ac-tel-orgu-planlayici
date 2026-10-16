// Statik dosya yolu: GitHub Pages'te uygulama /repo-adi altında yayınlanır
export const varlik = (p: string) => `${process.env.NEXT_PUBLIC_YOL ?? ""}${p}`;
