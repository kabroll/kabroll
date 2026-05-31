import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "unmillion.fr — Achetez un pixel de l'histoire d'Internet",
  description:
    "Achetez des pixels sur un canvas d'un million de pixels. Choisissez une couleur ou uploadez une image.",
  openGraph: {
    title: "unmillion.fr — 1 000 000 de pixels",
    description: "Achetez votre parcelle de pixels sur le canvas géant.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white text-[#111]">
        <AuthProvider>
          <Header />
          <main className="pb-[60px] md:pb-0">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
