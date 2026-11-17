import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "signs/*.svg"],
      manifest: {
        name: "Nila — നിള",
        short_name: "Nila",
        description: "Malayalam-first accessible assistant",
        lang: "ml",
        theme_color: "#2f6fed",
        background_color: "#eef4ff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // App shell is precached; large ML bundles (TensorFlow, Tesseract) are cached on first use.
        maximumFileSizeToCacheInBytes: 380 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "nila-assets", expiration: { maxEntries: 80 } },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith("tile.openstreetmap.org"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "osm-tiles", expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 3600 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts" },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 2000 },
});
