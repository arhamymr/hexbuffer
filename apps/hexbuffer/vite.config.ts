import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  worker: {
    format: "es",
  },
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "../../packages/components"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        splashscreen: path.resolve(__dirname, "splashscreen.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Heavy standalone packages
            if (id.includes("shiki")) return "vendor-shiki";
            if (id.includes("monaco-editor")) return "vendor-monaco";
            if (id.includes("jspdf")) return "vendor-jspdf";
            if (id.includes("@rive-app")) return "vendor-rive";
            if (id.includes("@mdxeditor")) return "vendor-mdxeditor";
            if (id.includes("xterm") || id.includes("@xterm")) return "vendor-xterm";
            if (id.includes("@xyflow") || id.includes("reactflow")) return "vendor-reactflow";
            if (id.includes("motion")) return "vendor-motion";
            if (id.includes("@tauri-apps")) return "vendor-tauri";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("lucide-react")) return "vendor-lucide";
            return "vendor";
          }
        },
      },
    },
  },
});
