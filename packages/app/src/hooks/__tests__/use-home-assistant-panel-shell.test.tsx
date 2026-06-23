import { resetRuntimeContextForTests } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useHomeAssistantPanelShell,
  useSyncHomeAssistantPanelKioskMode,
} from '../use-home-assistant-panel-shell';

function setPath(path: string) {
  window.history.replaceState(null, '', path);
}

function setParentWindow(parentWindow: Window & typeof globalThis) {
  Object.defineProperty(window, 'parent', {
    configurable: true,
    value: parentWindow,
  });
}

function createParentWindow(options?: {
  kioskEnabled?: boolean;
  setKioskEnabled?: (enabled: boolean) => Promise<boolean>;
  includeShell?: boolean;
}) {
  const {
    kioskEnabled = false,
    setKioskEnabled = vi.fn(async () => true),
    includeShell = true,
  } = options ?? {};
  const parentDocument = document.implementation.createHTMLDocument('ha-parent');
  const homeAssistantRoot = parentDocument.createElement('home-assistant') as HTMLElement & {
    hass?: Record<string, unknown>;
  };

  homeAssistantRoot.hass = {
    states: { 'light.kitchen': { entity_id: 'light.kitchen', state: 'on' } },
    config: { location_name: 'Parent Home' },
    user: { name: 'Parent User' },
    connection: {
      sendMessagePromise: vi.fn(async () => ({ ok: true })),
      subscribeMessage: vi.fn(async () => vi.fn()),
    },
    callService: vi.fn(async () => undefined),
    callWS: vi.fn(async () => ({ ok: true })),
  };
  parentDocument.body.append(homeAssistantRoot);

  const parentWindow = {
    document: parentDocument,
    location: {
      href: 'http://ha.local:8123/navet',
      origin: 'http://ha.local:8123',
      assign: vi.fn(),
    },
  } as unknown as Window & typeof globalThis;

  if (includeShell) {
    let currentKioskEnabled = kioskEnabled;
    parentWindow.__NAVET_HA_SHELL__ = {
      available: true,
      getSnapshot: () => ({ active: true, available: true, kioskEnabled: currentKioskEnabled }),
      isKioskEnabled: () => currentKioskEnabled,
      setKioskEnabled: vi.fn(async (enabled: boolean) => {
        currentKioskEnabled = enabled;
        return setKioskEnabled(enabled);
      }),
      openSidebar: vi.fn(async () => true),
      navigateHome: vi.fn(async () => true),
      subscribe: (listener) => {
        listener({ active: true, available: true, kioskEnabled: currentKioskEnabled });
        return () => {};
      },
    };
  }

  setParentWindow(parentWindow);

  return { setKioskEnabled, parentWindow };
}

describe('useHomeAssistantPanelShell', () => {
  const originalParent = window.parent;

  afterEach(() => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: originalParent,
    });
    document.querySelector('base')?.remove();
    window.__NAVET_PANEL__ = undefined;
    setPath('/');
    resetRuntimeContextForTests();
  });

  it('reports the parent shell as available in add-on ingress mode', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');
    createParentWindow();
    resetRuntimeContextForTests();

    const { result } = renderHookWithProviders(() => useHomeAssistantPanelShell());

    expect(result.current.available).toBe(true);
    expect(result.current.canToggleKiosk).toBe(true);
    expect(result.current.canOpenSidebar).toBe(true);
    expect(result.current.canNavigateHome).toBe(true);
    expect(result.current.isKioskEnabled).toBe(false);
  });

  it('stays unavailable in add-on ingress mode when the parent shell API is missing', () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');
    createParentWindow({ includeShell: false });
    resetRuntimeContextForTests();

    const { result } = renderHookWithProviders(() => useHomeAssistantPanelShell());

    expect(result.current.available).toBe(false);
    expect(result.current.canToggleKiosk).toBe(false);
    expect(result.current.canOpenSidebar).toBe(false);
    expect(result.current.canNavigateHome).toBe(false);
    expect(result.current.isKioskEnabled).toBeNull();
  });
});

describe('useSyncHomeAssistantPanelKioskMode', () => {
  const originalParent = window.parent;

  afterEach(() => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: originalParent,
    });
    document.querySelector('base')?.remove();
    window.__NAVET_PANEL__ = undefined;
    setPath('/');
    resetRuntimeContextForTests();
  });

  it('enables and disables the parent shell kiosk mode in add-on ingress mode', async () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');
    const setKioskEnabled = vi.fn(async () => true);
    createParentWindow({ setKioskEnabled });
    resetRuntimeContextForTests();

    const { unmount } = renderHookWithProviders(() => useSyncHomeAssistantPanelKioskMode());

    await waitFor(() => expect(setKioskEnabled).toHaveBeenCalledWith(true));

    act(() => {
      unmount();
    });

    await waitFor(() => expect(setKioskEnabled).toHaveBeenCalledWith(false));
  });

  it('does not call into the parent shell when ingress mode has no shell API', async () => {
    setPath('/api/hassio_ingress/navet_dev/dashboard');
    const setKioskEnabled = vi.fn(async () => true);
    createParentWindow({ includeShell: false, setKioskEnabled });
    resetRuntimeContextForTests();

    renderHookWithProviders(() => useSyncHomeAssistantPanelKioskMode());

    await waitFor(() => expect(setKioskEnabled).not.toHaveBeenCalled());
  });
});
