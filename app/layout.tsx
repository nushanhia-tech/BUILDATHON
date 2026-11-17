import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "../src/index.css";
import { Inter, Anek_Malayalam } from "next/font/google";

// English: Inter. Malayalam: Anek Malayalam (clean, open spacing). Self-hosted by next/font.
const inter = Inter({ subsets: ["latin"], variable: "--font-en", display: "swap" });
const anek = Anek_Malayalam({ subsets: ["malayalam"], variable: "--font-ml", display: "swap" });

export const metadata: Metadata = { 
  title: "Sa Hai · സഹായ്", 
  description: "Malayalam-first accessible assistant", 
  manifest: "/manifest.webmanifest", 
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  verification: {
    google: "qN_dS_ylIYmVY7ZYzhUDqVgk5AIlEfi7numDvorNvt4",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4627F4" };

export default function RootLayout({ children }: { children: React.ReactNode }) { 
  return <html lang="ml" className={`${inter.variable} ${anek.variable}`}><body>{children}</body></html>; 
}
