import { defineConfig } from 'vitest/config'

// Unit tests run on plain Node. The app config uses Void/Cloudflare plugins, which are not
// needed (and not valid) for pure domain tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    reporters: ['default'],
  },
})
