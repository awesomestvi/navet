import { createRoot } from 'react-dom/client';
import DemoApp from '../../../packages/app/src/demo/demo-app';
import { initializeInputModality } from '../../../packages/app/src/utils/input-modality';
import '../../../packages/app/src/styles/index.css';

initializeInputModality();

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(<DemoApp />);
}
