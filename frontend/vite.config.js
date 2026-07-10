import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.endsWith('.js') || req.url.includes('.js?')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (req.url.endsWith('.jsx') || req.url.includes('.jsx?')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      });
    }
  }
})
