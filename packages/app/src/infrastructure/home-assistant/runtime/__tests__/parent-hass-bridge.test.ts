import {
  NAVET_HOME_ASSISTANT_SHELL_GLOBAL,
  type NavetHomeAssistantShellApi,
  type NavetHomeAssistantShellSnapshot,
} from '@navet/app/infrastructure/home-assistant/runtime/navet-ha-shell-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveParentHomeAssistantBridge } from '../parent-hass-bridge';

function attachParentWindow(parentWindow: {
  document: Document;
  location?: unknown;
  [NAVET_HOME_ASSISTANT_SHELL_GLOBAL]?: NavetHomeAssistantShellApi;
}) {
  Object.defineProperty(window, 'parent', {
    configurable: true,
    value: parentWindow,
  });
}

function createParentDocument() {
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

  return { parentDocument };
}

function createShellApi() {
  let snapshot: NavetHomeAssistantShellSnapshot = {
    active: true,
    available: true,
    kioskEnabled: false,
  };
  const listeners = new Set<(snapshot: NavetHomeAssistantShellSnapshot) => void>();
  const api: NavetHomeAssistantShellApi = {
    available: true,
    getSnapshot: () => snapshot,
    isKioskEnabled: () => snapshot.kioskEnabled,
    setKioskEnabled: vi.fn(async (enabled: boolean) => {
      snapshot = { ...snapshot, kioskEnabled: enabled };
      for (const listener of listeners) {
        listener(snapshot);
      }
      return true;
    }),
    openSidebar: vi.fn(async () => true),
    navigateHome: vi.fn(async () => true),
    subscribe: (listener) => {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return { api, listeners };
}

describe('resolveParentHomeAssistantBridge', () => {
  const originalParent = window.parent;

  beforeEach(() => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: originalParent,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: originalParent,
    });
  });

  it('uses the parent Home Assistant shell API when available', async () => {
    const { parentDocument } = createParentDocument();
    const { api } = createShellApi();

    attachParentWindow({
      document: parentDocument,
      location: {
        href: 'http://ha.local:8123/navet',
        origin: 'http://ha.local:8123',
        assign: vi.fn(),
      },
      [NAVET_HOME_ASSISTANT_SHELL_GLOBAL]: api,
    });

    const bridge = resolveParentHomeAssistantBridge();

    expect(bridge?.shell?.canToggleKiosk).toBe(true);
    expect(bridge?.shell?.canOpenSidebar).toBe(true);
    expect(bridge?.shell?.canNavigateHome).toBe(true);

    await expect(bridge?.shell?.setHomeAssistantKioskEnabled(true)).resolves.toBe(true);
    expect(api.setKioskEnabled).toHaveBeenCalledWith(true);
    expect(bridge?.shell?.isKioskEnabled()).toBe(true);

    await expect(bridge?.shell?.openHomeAssistantSidebar()).resolves.toBe(true);
    expect(api.openSidebar).toHaveBeenCalled();
  });

  it('reports kiosk controls unavailable when the parent shell API is missing', () => {
    const { parentDocument } = createParentDocument();

    attachParentWindow({
      document: parentDocument,
      location: {
        href: 'http://ha.local:8123/navet',
        origin: 'http://ha.local:8123',
        assign: vi.fn(),
      },
    });

    const bridge = resolveParentHomeAssistantBridge();

    expect(bridge?.shell?.canToggleKiosk).toBe(false);
    expect(bridge?.shell?.canOpenSidebar).toBe(false);
    expect(bridge?.shell?.isKioskEnabled()).toBeNull();
  });

  it('navigates to the Home Assistant root as a fallback when the parent shell API is missing', async () => {
    const { parentDocument } = createParentDocument();
    const assign = vi.fn();

    attachParentWindow({
      document: parentDocument,
      location: {
        href: 'http://ha.local:8123/navet',
        origin: 'http://ha.local:8123',
        assign,
      },
    });

    const bridge = resolveParentHomeAssistantBridge();

    await expect(bridge?.shell?.navigateToHomeAssistantHome()).resolves.toBe(true);
    expect(assign).toHaveBeenCalledWith('/');
  });
});
