// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // CRITICAL: Optimize for Capacitor/Android
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'tesseract-vendor': ['tesseract.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['tesseract.js'],
    exclude: []
  },
  // Handle WASM files properly
  assetsInclude: ['**/*.wasm', '**/*.traineddata'],
  worker: {
    format: 'es'
  }
})
