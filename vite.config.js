import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
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
  }
})
