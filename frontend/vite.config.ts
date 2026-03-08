import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Raise the warning threshold slightly — 943KB main chunk is expected with recharts + gsap
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, long-lived cache
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Animation libs
          "vendor-motion": ["framer-motion", "gsap"],
          // Chart lib is big; isolate it
          "vendor-recharts": ["recharts"],
          // Leaflet map
          "vendor-leaflet": ["leaflet", "react-leaflet"],
          // Socket.IO
          "vendor-socket": ["socket.io-client"],
        },
      },
    },
  },
})
