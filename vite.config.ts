// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure environment variables are available
    'import.meta.env.VITE_DYNAMSOFT_LICENSE_KEY': JSON.stringify(process.env.VITE_DYNAMSOFT_LICENSE_KEY),
  }
})
