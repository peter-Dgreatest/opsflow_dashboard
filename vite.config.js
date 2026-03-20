import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        // Forward cookies through the proxy unchanged
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Rewrite cookie domain/path so browser treats them as same-origin
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              proxyRes.headers['set-cookie'] = setCookie.map(cookie =>
                cookie
                  .replace(/; Domain=[^;]+/gi, '')
                  .replace(/; Secure/gi, '')   // remove Secure in dev (HTTP)
              );
            }
          });
        },
      },
    },
  },
})
