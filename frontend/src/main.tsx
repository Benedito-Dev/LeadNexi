import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'
import { bootstrapSession } from './lib/session.ts'

// Restaura a sessão (cookie do refresh token) antes de decidir entre login e app
void bootstrapSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
