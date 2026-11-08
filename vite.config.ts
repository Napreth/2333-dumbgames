import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  base: mode === 'web' ? '/' : './',
  build: {
    outDir: mode === 'web' ? 'dist/web' : 'dist/toy',
    license: { fileName: 'THIRD_PARTY_NOTICES.txt' },
  },
  plugins: [vue()],
  server: { host: '127.0.0.1' },
  test: { include: ['tests/unit/**/*.test.ts'] },
}))
