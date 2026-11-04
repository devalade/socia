import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { voidPlugin } from 'void'

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  plugins: [
    // Void must come before the framework plugin. It supplies the Cloudflare runtime,
    // D1 bindings, Workers AI and the deploy pipeline.
    voidPlugin(),
    tailwindcss(),
    tanstackStart(),
    react(),
  ],
})
