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
  const homeAssistantShadowRoot = homeAssistantRoot.attachShadow({ mode: 'open' });
  const homeAssistantMain = parentDocument.createElement('home-assistant-main');
  const homeAssistantMainShadowRoot = homeAssistantMain.attachShadow({ mode: 'open' });
  const drawer = parentDocument.createElement('ha-drawer');
  const drawerShadowRoot = drawer.attachShadow({ mode: 'open' });
  const layout = parentDocument.createElement('div');
  const sidebarShell = parentDocument.createElement('div');
  const appContent = parentDocument.createElement('div');
  const sidebarSlot = parentDocument.createElement('slot');
  const appContentSlot = parentDocument.createElement('slot');
  const header = parentDocument.createElement('app-header');
  const sidebar = parentDocument.createElement('ha-sidebar');
  const panelResolver = parentDocument.createElement('partial-panel-resolver');
  const panelApp = parentDocument.createElement('ha-panel-app');
  const panelAppShadowRoot = panelApp.attachShadow({ mode: 'open' });
  const panelAppHeader = parentDocument.createElement('div');
  const panelAppFrame = parentDocument.createElement('iframe');

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

  layout.className = 'layout';
  sidebarShell.className = 'sidebar-shell';
  appContent.className = 'app-content';
  panelResolver.slot = 'appContent';

  sidebarShell.append(sidebarSlot);
  appContent.append(appContentSlot);
  panelAppHeader.className = 'header';
  panelAppHeader.textContent = 'Navet';
  panelAppFrame.className = 'loaded';
  panelAppShadowRoot.append(panelAppHeader, panelAppFrame);
  panelResolver.append(panelApp);
  layout.append(sidebarShell, appContent);
  drawerShadowRoot.append(layout);
  drawer.append(sidebar, panelResolver);
  homeAssistantMainShadowRoot.append(header, drawer);
  homeAssistantShadowRoot.append(homeAssistantMain);
  parentDocument.body.append(homeAssistantRoot);

  return { appContent, drawer, header, panelAppHeader, parentDocument, sidebar, sidebarShell };
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

  it('falls back to direct parent DOM kiosk controls when the parent shell API is missing', async () => {
    const { appContent, drawer, header, panelAppHeader, parentDocument, sidebar, sidebarShell } =
      createParentDocument();

    attachParentWindow({
      document: parentDocument,
      location: {
        href: 'http://ha.local:8123/navet',
        origin: 'http://ha.local:8123',
        assign: vi.fn(),
      },
    });

    const bridge = resolveParentHomeAssistantBridge();

    expect(bridge?.shell?.canToggleKiosk).toBe(true);
    expect(bridge?.shell?.canOpenSidebar).toBe(false);
    expect(bridge?.shell?.isKioskEnabled()).toBe(false);

    await expect(bridge?.shell?.setHomeAssistantKioskEnabled(true)).resolves.toBe(true);
    expect(drawer.style.getPropertyValue('--ha-sidebar-width')).toBe('0px');
    expect(sidebarShell.style.display).toBe('none');
    expect(appContent.style.paddingLeft).toBe('0px');
    expect(sidebar.style.display).toBe('none');
    expect(header.style.display).toBe('none');
    expect(panelAppHeader.style.display).toBe('none');
    expect(bridge?.shell?.isKioskEnabled()).toBe(true);

    await expect(bridge?.shell?.setHomeAssistantKioskEnabled(false)).resolves.toBe(true);
    expect(drawer.getAttribute('style')).toBeNull();
    expect(sidebarShell.getAttribute('style')).toBeNull();
    expect(appContent.getAttribute('style')).toBeNull();
    expect(sidebar.getAttribute('style')).toBeNull();
    expect(header.getAttribute('style')).toBeNull();
    expect(panelAppHeader.getAttribute('style')).toBeNull();
    expect(bridge?.shell?.isKioskEnabled()).toBe(false);
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
