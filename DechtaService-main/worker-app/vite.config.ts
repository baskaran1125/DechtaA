import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const workerProxyTarget = env.VITE_WORKER_PROXY_TARGET || "http://127.0.0.1:5003";

  return {
    plugins: [
      react()
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@radix-ui/")) {
              return "radix-ui";
            }
            if (id.includes("framer-motion")) {
              return "framer";
            }
            if (id.includes("recharts") || id.includes("d3-")) {
              return "charts";
            }
            if (id.includes("@tanstack/")) {
              return "tanstack";
            }
            if (id.includes("date-fns") || id.includes("react-day-picker")) {
              return "dates";
            }
            if (id.includes("wouter")) {
              return "router";
            }
            return "vendor";
          },
        },
      },
    },
    server: {
      port: 5176,
      proxy: {
        "/api": workerProxyTarget
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  };
});
