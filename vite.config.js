import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Caches the built app on first visit so later loads are instant and work offline.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "CUECORE · Club operations",
        short_name: "CUECORE",
        description: "Local-first snooker club management.",
        theme_color: "#050a08",
        background_color: "#050a08",
        display: "standalone",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        globIgnores: ["404.html"],
        // Page URLs like /salary are app routes: serve the cached app shell for them (offline reloads too).
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/assets\//, /\/[^/?]+\.[a-z0-9]+$/i],
        // A new deploy takes over at once and old caches are dropped, so stale files never linger.
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  // "@/..." = src/... (UI code). Pure logic (src/lib, src/app/actions, seed) keeps relative imports so node --test runs it directly.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  base: "/",
  build: { target: "es2020", cssMinify: true }
});
