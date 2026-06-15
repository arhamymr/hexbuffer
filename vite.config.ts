import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
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
            if (id.includes("jspdf")) return "vendor-jspdf";
            if (id.includes("@tauri-apps")) return "vendor-tauri";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("monaco-editor")) return "vendor-monaco";
            if (id.includes("@xyflow") || id.includes("reactflow")) return "vendor-reactflow";
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("xterm") || id.includes("@xterm")) return "vendor-xterm";
            return "vendor";
          }
        },
      },
    },
  },
});
