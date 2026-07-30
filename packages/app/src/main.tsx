import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { captureInstallationPairingKeyFromFragment } from './auth/installation-pairing';
import {
  isHomeAssistantIngressPwaContext,
  schedulePwaRegistration,
} from './pwa/pwa-registration-scheduler';
import { installVitePreloadErrorRecovery } from './pwa/vite-preload-error-recovery';
import { useSettingsStore } from './stores/settings-store';
import { detectDeviceTierWithHighEntropy } from './utils/detect-device-tier';
import { initializeInputModality } from './utils/input-modality';
import './styles/index.css';

const DEVICE_TIER_BOOT_WAIT_MS = 100;
captureInstallationPairingKeyFromFragment();
const isDemoRoute = window.location.pathname.split('/').filter(Boolean).includes('demo');
const shouldRenderDemoApp = __NAVET_ENABLE_DEMO__ && isDemoRoute;

installVitePreloadErrorRecovery();

if (!shouldRenderDemoApp) {
  const loadPwaRegistration = () => {
    void import('./pwa/pwa-update-store').then(({ registerPwaServiceWorker }) => {
      registerPwaServiceWorker();
    });
  };

  if (isHomeAssistantIngressPwaContext()) {
    loadPwaRegistration();
  } else {
    schedulePwaRegistration(loadPwaRegistration);
  }
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

function applyDetectedDeviceTier(
  effectsQuality: Awaited<ReturnType<typeof detectDeviceTierWithHighEntropy>>
) {
  const settings = useSettingsStore.getState();
  if (settings.effectsQualityUserOverride || settings.effectsQuality === effectsQuality) {
    return;
  }
  settings.updateSettings({ effectsQuality });
}

async function prepareInitialDeviceTier() {
  if (shouldRenderDemoApp || useSettingsStore.getState().effectsQualityUserOverride) {
    return;
  }

  const detectedTierPromise = detectDeviceTierWithHighEntropy();
  let timeoutId: number | null = null;
  const detectedTier = await Promise.race([
    detectedTierPromise,
    new Promise<Awaited<ReturnType<typeof detectDeviceTierWithHighEntropy>>>((resolve) => {
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        resolve(useSettingsStore.getState().effectsQuality);
      }, DEVICE_TIER_BOOT_WAIT_MS);
    }),
  ]);
  if (timeoutId !== null) {
    window.clearTimeout(timeoutId);
  }
  applyDetectedDeviceTier(detectedTier);

  // A slow UA-CH implementation must not delay boot indefinitely. Apply its answer when ready.
  void detectedTierPromise.then(applyDetectedDeviceTier);
}

if (container) {
  void Promise.all([resolveRootComponent(), prepareInitialDeviceTier()]).then(([RootComponent]) => {
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
