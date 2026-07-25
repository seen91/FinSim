import { defineConfig } from 'vitest/config'

// standalone so tests don't load vite.config.ts (react + PWA plugins)
export default defineConfig({
  test: { environment: 'node' },
})
