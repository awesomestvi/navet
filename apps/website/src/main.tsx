import { createRoot } from 'react-dom/client';
import MarketingWebsiteApp from '@navet/app/marketing/MarketingWebsiteApp';
import { initializeInputModality } from '@navet/app/utils/input-modality';
import '@navet/app/styles/index.css';
import { cleanupLegacyServiceWorkers } from './cleanup-legacy-service-workers';

initializeInputModality();

const container = document.getElementById('root');

if (container) {
  void cleanupLegacyServiceWorkers().finally(() => {
    createRoot(container).render(<MarketingWebsiteApp />);
  });
}
