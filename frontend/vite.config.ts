import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      include: ['buffer', 'process'],
    }),
  ],
  build: {
    chunkSizeWarningLimit: 15000,
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          // Separate Barretenberg into its own chunk for lazy loading
          if (id.includes('@noir-lang/backend_barretenberg')) {
            return 'barretenberg';
          }
          if (id.includes('@noir-lang/noir_js')) {
            return 'noir-js';
          }
          if (id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('@solana/web3.js')) {
            return 'vendor-solana';
          }
        },
      },
    },
  },
  optimizeDeps: {
    // Don't pre-bundle these - they're dynamically imported
    exclude: ['@noir-lang/backend_barretenberg', '@noir-lang/noir_js'],
  },
  esbuild: {
    target: 'esnext',
    legalComments: 'none',
  },
  worker: {
    format: 'es',
  },
})
