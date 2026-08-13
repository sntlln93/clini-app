import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    env: { TZ: 'America/Argentina/Buenos_Aires' },
    include: ['src/**/*.test.{ts,tsx}', 'eslint-rules/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    // No components exist yet to test — drop this once the first one lands.
    passWithNoTests: true,
  },
})
