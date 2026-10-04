process.env.NODE_ENV = 'production';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  mode: 'production',
  publicDir: false,
  plugins: [react({ development: false })],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  build: {
    outDir: 'public/js/otp',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/otp-widget.jsx'),
      name: 'CodeSlotsOtp',
      fileName: () => 'otp-bundle.js',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'otp-bundle.css';
          return assetInfo.name;
        }
      }
    }
  }
});
