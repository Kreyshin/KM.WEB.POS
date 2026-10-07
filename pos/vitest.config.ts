import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const ruta = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@pos-core': ruta('./src/pos-core'),
      '@pos-core-ui': ruta('./src/pos-core-ui'),
      '@pos-adaptadores': ruta('./src/pos-adaptadores'),
      '@perfil-ropa': ruta('./src/perfil-ropa/index.ts'),
      '@perfil-farmacia': ruta('./src/perfil-farmacia/index.ts'),
      '@shell': ruta('./src/shell'),
    },
  },
  define: { KM_DEMO: 'true' },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
})
