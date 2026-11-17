"use client";
import dynamic from "next/dynamic";
const BrowserApp = dynamic(() => import("../src/BrowserApp"), { ssr: false, loading: () => <p role="status">Nila…</p> });
export default function ClientApp() { return <BrowserApp />; }
