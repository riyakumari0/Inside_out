import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Django API runs on :8000. Proxying keeps the app and API on one origin,
// so the session cookie and CSRF protection work without CORS.
const backend = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/media': backend,
    },
  },
  preview: {
    proxy: {
      '/api': backend,
      '/media': backend,
    },
  },
})
