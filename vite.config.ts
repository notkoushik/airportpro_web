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
          'tesseract-vendor': ['tesseract.js'],
          'react-vendor': ['react', 'react-dom', 'react/jsx-runtime']
        }
      }
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react/jsx-runtime',
      'tesseract.js'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  assetsInclude: ['**/*.wasm', '**/*.traineddata', '**/*.gz'],
  publicDir: 'public',
  worker: {
    format: 'es'
  }
})
