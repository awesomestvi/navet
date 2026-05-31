import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installBrowserMocks, resetBrowserMocks } from './test/browser-mocks';

installBrowserMocks();

afterEach(() => {
  cleanup();
  resetBrowserMocks();
});
