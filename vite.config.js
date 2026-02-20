import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // When deploying to GitHub Pages under a repo (username.github.io/repo),
  // set the base to the repository name so built asset URLs are correct.
  base: '/poker-probability-calculator/',
  plugins: [react()],
})
