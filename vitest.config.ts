import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    testTimeout: 1000, // 5秒でタイムアウト
    hookTimeout: 1000  // フックも5秒でタイムアウト
  }
})