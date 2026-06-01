import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ToastProvider";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pixelmillions.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "PixelMillions — Achetez un pixel de l'histoire d'Internet",
  description:
    "Achetez des pixels sur un canvas d'un million de pixels. Choisissez une couleur ou uploadez une image, revendez-les, faites des offres.",
  openGraph: {
    title: "PixelMillions — 1 000 000 de pixels",
    description: "Achetez votre parcelle de pixels sur le canvas géant.",
    type: "website",
    url: SITE_URL,
    siteName: "PixelMillions",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PixelMillions — 1 000 000 de pixels",
    description: "Achetez votre parcelle de pixels sur le canvas géant.",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-[#111]">
        <ToastProvider>
          <AuthProvider>
            <Header />
            <main className="pb-[60px] md:pb-0">{children}</main>
            <Footer />
            <BottomNav />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
