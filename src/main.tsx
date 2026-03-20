import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const buildId =
      typeof __APP_BUILD_ID__ === 'string' ? __APP_BUILD_ID__ : 'dev';

    const swUrl = `/sw.js?v=${encodeURIComponent(buildId)}`;
    let hasReloadedForNewWorker = false;

    const requestSkipWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForNewWorker) {
        return;
      }
      hasReloadedForNewWorker = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        requestSkipWaiting(registration);

        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing;
          if (!nextWorker) {
            return;
          }

          nextWorker.addEventListener('statechange', () => {
            if (
              nextWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              requestSkipWaiting(registration);
            }
          });
        });

        void registration.update();
      })
      .catch((error) => {
        console.error('[PWA] Service worker registration failed', error);
      });
  });
}
