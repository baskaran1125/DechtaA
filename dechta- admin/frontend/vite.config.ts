import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const apiProxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:5003";
const wsProxyTarget = process.env.VITE_WS_PROXY_TARGET || "ws://localhost:5003";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
      ? [
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../backend/shared"),
    },
  },
  root: __dirname,
  build: {
    outDir: path.resolve(__dirname, "../dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: false,
        secure: false,
      },
      "/ws": {
        target: wsProxyTarget,
        ws: true,
        changeOrigin: false,
        secure: false,
      }
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
