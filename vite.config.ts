import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Make sure Vite only scans your web app's entry
  optimizeDeps: {
    entries: [path.resolve(__dirname, "index.html"), path.resolve(__dirname, "src/main.tsx")],
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    host: true,
  },
});
