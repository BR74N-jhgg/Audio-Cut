import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';

export default defineConfig({
  base: './', // Crucial: This tells Electron to use relative paths for CSS/JS
  plugins: [
    tailwindcss(),
    react(),
    electron({
      entry: 'electron/main.ts',
    }),
  ],
});