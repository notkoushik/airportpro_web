import { defineConfig } from 'vite';
// Switch from the 'swc' plugin to the standard react plugin for better stability
import react from '@vitejs/plugin-react'; 
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // Ensure the react plugin is listed here
  plugins: [react()], 
  resolve: {
    alias: {
      // This alias MUST match the one in tsconfig.json
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true, // Allows access from other devices on the same network
  },
});

