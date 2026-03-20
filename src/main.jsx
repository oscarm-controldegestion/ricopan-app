import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Registrar Service Worker para manejo de caché y actualizaciones
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/ricopan-app/sw.js')
      .then((reg) => {
        // Si hay una nueva versión esperando, activarla de inmediato
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible: recargar para aplicarla
              window.location.reload();
            }
          });
        });
      })
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
