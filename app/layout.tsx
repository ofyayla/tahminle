import type { Metadata } from "next";
import { Archivo_Black, Manrope } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

// Keeps serverless functions close to the Supabase project (ap-northeast-1 / Tokyo)
// to avoid the cross-region round-trip latency Prisma queries would otherwise pay.
export const preferredRegion = "hnd1";

export const metadata: Metadata = {
  title: "Tahminle — Maç Günü Kontrol Odası",
  description:
    "GS, FB ve BJK maçları için sanal bahis simülasyonu. Gerçek iddaa oranlarıyla sanal cüzdanını yönet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${archivoBlack.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
