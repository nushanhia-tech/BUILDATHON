import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "../src/index.css";
export const metadata: Metadata = { title: "നിള · Nila", description: "Malayalam-first accessible assistant", manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg", apple: "/icon-192.png" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7746ce" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ml"><body>{children}</body></html>; }
