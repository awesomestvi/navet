import { createRoot } from 'react-dom/client';
import DemoApp from '@navet/app/demo/demo-app';
import { initializeInputModality } from '@navet/app/utils/input-modality';
import '@navet/app/styles/index.css';

initializeInputModality();

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(<DemoApp />);
}
