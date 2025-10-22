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
  build: {
    target: 'esnext',
    minify: 'esbuild',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tesseract-vendor': ['tesseract.js']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['tesseract.js', 'react', 'react-dom', 'framer-motion'],
    exclude: [],
    // CRITICAL: Force pre-bundling of framer-motion
    esbuildOptions: {
      target: 'esnext'
    }
  },
  assetsInclude: ['**/*.wasm', '**/*.traineddata', '**/*.gz', '**/*.js'],
  publicDir: 'public',
  worker: {
    format: 'es'
  },
  // CRITICAL: Handle React exports properly
  ssr: {
    noExternal: ['framer-motion']
  }
})
