import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16181C',
            color: '#F0F0F0',
            border: '1px solid #2A2D35',
            fontSize: '13px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#a3e635', secondary: '#0E0F11' } },
          error:   { iconTheme: { primary: '#fb7185', secondary: '#0E0F11' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
