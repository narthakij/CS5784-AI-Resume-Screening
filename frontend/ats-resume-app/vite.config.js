import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/CS5784-AI-Resume-Screening/',
  plugins: [react()],
})
