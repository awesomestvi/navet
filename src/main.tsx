import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import DemoApp from './app/demo/demo-app.tsx';
import { registerPwaServiceWorker } from './app/pwa/pwa-update-store';
import { initializeInputModality } from './app/utils/input-modality';
import './styles/index.css';

const isDemoRoute = window.location.pathname.split('/').filter(Boolean).includes('demo');

if (!isDemoRoute) {
  registerPwaServiceWorker();
}

initializeInputModality();

const container = document.getElementById('root');
const bootScreen = document.getElementById('app-boot');
if (container) {
  createRoot(container).render(isDemoRoute ? <DemoApp /> : <App />);

  window.requestAnimationFrame(() => {
    if (!bootScreen) {
      return;
    }

    bootScreen.setAttribute('data-state', 'hidden');
    window.setTimeout(() => {
      bootScreen.remove();
    }, 240);
  });
}
