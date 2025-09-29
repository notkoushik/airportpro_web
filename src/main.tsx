// COMPLETE MAIN.TSX FIX - Replace your src/main.tsx
import * as React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Import the Toaster component for toast notifications
import { Toaster } from '@/components/ui/toaster'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/* Add the Toaster component at the root level */}
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>
)