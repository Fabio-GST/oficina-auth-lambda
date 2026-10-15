import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/infra/clientes-repositorio-mysql.ts'],
      reporter: ['text', 'lcov'],
    },
  },
})
