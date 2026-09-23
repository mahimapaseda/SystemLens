import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'out', 'release', 'dist']
  },
  resolve: {
    alias: {
      '@main': resolve('electron/main'),
      '@': resolve('src')
    }
  }
})
