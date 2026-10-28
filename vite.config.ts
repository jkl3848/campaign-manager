import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Keep a stable port so copied invite links stay valid (5173 is often taken by other Vite apps).
    port: 5174,
    strictPort: true,
    host: true,
  },
})
