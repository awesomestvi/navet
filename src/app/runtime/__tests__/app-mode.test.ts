import { afterEach, describe, expect, it } from 'vitest';
import { isHomeAssistantAddonMode, isHomeAssistantPanelMode } from '../app-mode';

function setPath(path: string) {
  window.history.replaceState(null, '', path);
}

function installBase(href: string) {
  const base = document.createElement('base');
  base.href = href;
  document.head.append(base);
  return base;
}

afterEach(() => {
  window.__NAVET_PANEL__ = undefined;
  document.querySelector('base')?.remove();
  setPath('/');
});

describe('app mode detection', () => {
  it('detects custom panel mode from the panel flag', () => {
    window.__NAVET_PANEL__ = true;

    expect(isHomeAssistantPanelMode()).toBe(true);
    expect(isHomeAssistantAddonMode()).toBe(false);
  });

  it('detects add-on mode from the current ingress path', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');

    expect(isHomeAssistantAddonMode()).toBe(true);
  });

  it('detects add-on mode from the document base href', () => {
    const base = installBase(`${window.location.origin}/api/hassio_ingress/navet_dev/`);

    try {
      expect(isHomeAssistantAddonMode()).toBe(true);
    } finally {
      base.remove();
    }
  });

  it('does not treat hosted or Docker paths as add-on mode', () => {
    setPath('/dashboard');

    expect(isHomeAssistantAddonMode()).toBe(false);
  });
});
