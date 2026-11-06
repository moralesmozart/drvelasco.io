import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps asset paths relative, so the build works on GitHub Pages under /<repo>/
export default defineConfig({
  base: './',
  plugins: [react()],
})
