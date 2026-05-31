import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { registerPwaServiceWorker } from './pwa/pwa-update-store';
import { initializeInputModality } from './utils/input-modality';
import './styles/index.css';

const isDemoRoute = window.location.pathname.split('/').filter(Boolean).includes('demo');
const shouldRenderDemoApp = __NAVET_ENABLE_DEMO__ && isDemoRoute;

if (!shouldRenderDemoApp) {
  registerPwaServiceWorker();
}

initializeInputModality();

const container = document.getElementById('root');
const bootScreen = document.getElementById('app-boot');
async function resolveRootComponent() {
  if (shouldRenderDemoApp) {
    const { default: DemoApp } = await import('./demo/demo-app.tsx');
    return DemoApp;
  }

  return App;
}

if (container) {
  void resolveRootComponent().then((RootComponent) => {
    createRoot(container).render(<RootComponent />);

    window.requestAnimationFrame(() => {
      if (!bootScreen) {
        return;
      }

      bootScreen.setAttribute('data-state', 'hidden');
      window.setTimeout(() => {
        bootScreen.remove();
      }, 240);
    });
  });
}
