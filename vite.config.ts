import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { liveApiPlugin } from './liveApiPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liveApiPlugin()],
  server: {
    host: true,
    allowedHosts: ['mariaburg.levelx.be'],
  },
  preview: {
    host: true,
    allowedHosts: ['mariaburg.levelx.be'],
  },
})
