import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  preload: {
    build: {
      externalizeDeps: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src', 'renderer', 'src')
      }
    },
    plugins: [react(), tailwindcss() as any]
  }
})
