import { createRoot } from 'react-dom/client';
import MarketingWebsiteApp from '@/app/marketing/MarketingWebsiteApp';
import { initializeInputModality } from '@/app/utils/input-modality';
import '@/styles/index.css';

initializeInputModality();

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(<MarketingWebsiteApp />);
}
