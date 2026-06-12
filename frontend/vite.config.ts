import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    // Demo-mode auth hashes passwords client-side with node:crypto
    nodePolyfills({ include: ['crypto', 'buffer', 'stream', 'util', 'events'] }),
    react({
      babel: {
        plugins: ['styled-jsx/babel'],
      },
    }),
  ],
  define: {
    // Server-only modules reference process.env; keep the browser from crashing
    // on `process` while the import graph is being fully pruned of them.
    'process.env': '{}',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Next.js compat shims so ported code keeps working unchanged
      'next/dynamic': path.resolve(__dirname, 'src/next-compat/dynamic.tsx'),
      'next/image': path.resolve(__dirname, 'src/next-compat/image.tsx'),
      'next/navigation': path.resolve(__dirname, 'src/next-compat/navigation.ts'),
      'next/link': path.resolve(__dirname, 'src/next-compat/link.tsx'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
