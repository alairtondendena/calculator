/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the Go API runs separately; the proxy keeps the browser on one origin (no CORS).
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/test/**'],
      reportsDirectory: '../coverage/frontend',
      reporter: ['text', ['text', { file: 'coverage.txt' }], 'html'],
    },
  },
})
