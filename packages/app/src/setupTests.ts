import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installBrowserMocks, resetBrowserMocks } from './test/browser-mocks';

const nativeMatchMedia = window.matchMedia;
installBrowserMocks();
// Browser stories need real breakpoint behavior at their configured viewport.
if ('__vitest_browser__' in globalThis) {
  window.matchMedia = nativeMatchMedia;
}

afterEach(() => {
  cleanup();
  resetBrowserMocks();
});
