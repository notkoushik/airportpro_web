// ...existing code...
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tesseract-vendor': ['tesseract.js'],
          'react-vendor': ['react', 'react-dom'],
          'motion-vendor': ['framer-motion']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['tesseract.js'],
    exclude: [],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  assetsInclude: ['**/*.wasm', '**/*.traineddata', '**/*.gz', '**/*.js'],
  publicDir: 'public',
  worker: {
    format: 'es'
  }
})
// ...existing code...