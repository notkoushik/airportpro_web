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
    // Include tesseract.js in pre-bundling
    include: ['tesseract.js']
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      // Configure external dependencies and dynamic imports
      external: [],
      output: {
        manualChunks: {
          // Separate tesseract.js into its own chunk for better loading
          tesseract: ['tesseract.js']
        }
      }
    },
    outDir: "dist",
    emptyOutDir: true,
    // Increase chunk size warning limit for tesseract.js
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
  },
  // Configure how dynamic imports are handled
  define: {
    global: 'globalThis',
  }
});