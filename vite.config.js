import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The docs pipeline writes a temporary Edge profile under scripts/; keep the dev watcher off it.
  server: { watch: { ignored: ['**/scripts/**'] } },
  test: {
    passWithNoTests: true,
    environment: 'node',
  },
})
