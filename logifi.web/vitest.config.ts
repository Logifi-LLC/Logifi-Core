import { defineConfig } from 'vitest/config'
import { createRequire } from 'node:module'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'

const require = createRequire(resolve(__dirname, 'node_modules/nuxt/package.json'))
const h3Entry = require.resolve('h3')

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', '.nuxt', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '.nuxt/'
      ]
    }
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './app'),
      '@': resolve(__dirname, './app'),
      h3: h3Entry,
    }
  }
})
