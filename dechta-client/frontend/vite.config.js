import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // The app calls the backend directly via VITE_API_URL in development.
    // Keep the server config minimal to avoid proxy misrouting.
  }
})
