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
      // This helps Vite handle modules that contain both CJS and ESM syntax.
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'tesseract-vendor': ['tesseract.js'],
          // 'motion-vendor': ['framer-motion'] // framer-motion is no longer used
        }
      }
    }
  },
  optimizeDeps: {
    // Pre-bundle these CJS dependencies into ESM for consistency during dev and build.
    // This is the key to solving the "is not exported by" errors.
    include: [
      'tesseract.js', 
      'react', 
      'react-dom', 
      'react/jsx-runtime'
    ],
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