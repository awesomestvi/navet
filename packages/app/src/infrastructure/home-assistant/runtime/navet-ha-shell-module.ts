import {
  NAVET_HOME_ASSISTANT_SHELL_EVENT,
  NAVET_HOME_ASSISTANT_SHELL_GLOBAL,
  NAVET_PANEL_FRONTEND_PATH,
  type NavetHomeAssistantShellApi,
  type NavetHomeAssistantShellListener,
  type NavetHomeAssistantShellSnapshot,
} from './navet-ha-shell-api';

type MutableWindow = Window & typeof globalThis;
type Cleanup = () => void;

const SHELL_SYNC_RETRY_LIMIT = 20;
const SHELL_SYNC_RETRY_DELAY_MS = 250;
const TOGGLE_MENU_MESSAGE_TYPE = 'home-assistant/toggle-menu';

const STYLE_RULES = {
  header: {
    display: 'none',
  },
  sidebar: {
    display: 'none',
    width: '0px',
    minWidth: '0px',
    maxWidth: '0px',
    visibility: 'hidden',
  },
  view: {
    minHeight: '100vh',
    paddingTop: 'calc(var(--safe-area-inset-top) + var(--view-container-padding-top, 0px))',
  },
  drawerHost: {
    '--mdc-drawer-width': '0px',
    '--app-drawer-width': '0px',
    '--ha-sidebar-width': '0px',
    '--kiosk-sidebar-width': '0px',
  },
  panelResolver: {
    '--mdc-top-app-bar-width': '100%',
  },
} as const;

const HEADER_SELECTORS = ['app-header', 'app-toolbar', 'ha-menu-button', '.header'];

const SIDEBAR_SELECTORS = [
  'ha-sidebar',
  '.mdc-drawer',
  'aside',
  '[slot="drawer"]',
  '#sidebar-shell',
];

const DRAWER_HOST_SELECTORS = ['ha-drawer', 'app-drawer-layout'];
const PANEL_RESOLVER_SELECTORS = ['partial-panel-resolver'];
const VIEW_SELECTORS = ['#view'];
const MENU_BUTTON_SELECTORS = [
  'ha-menu-button',
  'mwc-icon-button[menu]',
  'button[menu]',
  'app-header [menu]',
];

type ManagedStyleRecord = Map<
  Element,
  {
    inlineStyle: string | null;
  }
>;

function getLocationPathname(targetWindow: MutableWindow) {
  return targetWindow.location?.pathname ?? '';
}

function isNavetPanelPath(pathname: string) {
  return (
    pathname === `/${NAVET_PANEL_FRONTEND_PATH}` ||
    pathname.startsWith(`/${NAVET_PANEL_FRONTEND_PATH}/`)
  );
}

function walkElements(root: ParentNode, callback: (element: Element) => void) {
  const queue: Element[] = [];
  if (root instanceof Document || root instanceof ShadowRoot) {
    queue.push(...Array.from(root.children));
  } else if (root instanceof Element) {
    queue.push(root);
  }

  const visited = new Set<Element>();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    callback(current);

    queue.push(...Array.from(current.children));
    if (current.shadowRoot) {
      queue.push(...Array.from(current.shadowRoot.children));
    }
  }
}

function queryFirstAcrossShadows(root: ParentNode, selectors: string[]): Element | null {
  let match: Element | null = null;

  walkElements(root, (element) => {
    if (match) {
      return;
    }

    if (selectors.some((selector) => element.matches(selector))) {
      match = element;
    }
  });

  return match;
}

function queryAllAcrossShadows(root: ParentNode, selectors: string[]) {
  const matches: Element[] = [];

  walkElements(root, (element) => {
    if (selectors.some((selector) => element.matches(selector))) {
      matches.push(element);
    }
  });

  return matches;
}

function rememberStyle(record: ManagedStyleRecord, element: Element) {
  if (record.has(element)) {
    return;
  }

  record.set(element, {
    inlineStyle: element.getAttribute('style'),
  });
}

function applyStyleRules(
  record: ManagedStyleRecord,
  elements: Element[],
  styles: Record<string, string>
) {
  for (const element of elements) {
    rememberStyle(record, element);

    for (const [property, value] of Object.entries(styles)) {
      element instanceof HTMLElement || element instanceof SVGElement
        ? element.style.setProperty(property, value, 'important')
        : element.setAttribute(
            'style',
            `${element.getAttribute('style') ?? ''};${property}:${value}!important`
          );
    }
  }
}

function restoreStyles(record: ManagedStyleRecord) {
  for (const [element, snapshot] of record.entries()) {
    if (snapshot.inlineStyle === null) {
      element.removeAttribute('style');
    } else {
      element.setAttribute('style', snapshot.inlineStyle);
    }
  }

  record.clear();
}

function notifyListeners(
  targetWindow: MutableWindow,
  listeners: Set<NavetHomeAssistantShellListener>,
  snapshot: NavetHomeAssistantShellSnapshot
) {
  for (const listener of listeners) {
    listener(snapshot);
  }

  targetWindow.dispatchEvent(
    new CustomEvent(NAVET_HOME_ASSISTANT_SHELL_EVENT, {
      detail: snapshot,
    })
  );
}

function createSnapshot(
  targetWindow: MutableWindow,
  available: boolean,
  kioskEnabled: boolean
): NavetHomeAssistantShellSnapshot {
  return {
    active: isNavetPanelPath(getLocationPathname(targetWindow)),
    available,
    kioskEnabled,
  };
}

function queryShellElements(targetWindow: MutableWindow) {
  const root = queryFirstAcrossShadows(targetWindow.document, [
    'home-assistant',
    'home-assistant-main',
  ]);
  const header = queryFirstAcrossShadows(targetWindow.document, HEADER_SELECTORS);
  const sidebar = queryFirstAcrossShadows(targetWindow.document, SIDEBAR_SELECTORS);
  const drawerHost = queryFirstAcrossShadows(targetWindow.document, DRAWER_HOST_SELECTORS);
  const panelResolver = queryFirstAcrossShadows(targetWindow.document, PANEL_RESOLVER_SELECTORS);
  const view = queryFirstAcrossShadows(targetWindow.document, VIEW_SELECTORS);
  const menuButton = queryFirstAcrossShadows(targetWindow.document, MENU_BUTTON_SELECTORS);

  return {
    drawerHost,
    header,
    menuButton,
    panelResolver,
    root,
    sidebar,
    view,
  };
}

export function installNavetHomeAssistantShell(targetWindow: MutableWindow = window) {
  const listeners = new Set<NavetHomeAssistantShellListener>();
  const cleanups: Cleanup[] = [];
  const styleRecord: ManagedStyleRecord = new Map();
  let kioskEnabled = false;
  let shellAvailable = false;
  let retryTimer: number | null = null;
  let retryCount = 0;

  const emit = () => {
    notifyListeners(
      targetWindow,
      listeners,
      createSnapshot(targetWindow, shellAvailable, kioskEnabled)
    );
  };

  const clearRetry = () => {
    if (retryTimer !== null) {
      targetWindow.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const disableShellStyles = () => {
    restoreStyles(styleRecord);
  };

  const scheduleRetry = (sync: () => void) => {
    if (retryCount >= SHELL_SYNC_RETRY_LIMIT || retryTimer !== null) {
      return;
    }

    retryTimer = targetWindow.setTimeout(() => {
      retryTimer = null;
      retryCount += 1;
      sync();
    }, SHELL_SYNC_RETRY_DELAY_MS);
  };

  const sync = () => {
    const active = isNavetPanelPath(getLocationPathname(targetWindow));
    const shellElements = queryShellElements(targetWindow);
    shellAvailable = Boolean(
      shellElements.root ||
        shellElements.header ||
        shellElements.sidebar ||
        shellElements.drawerHost
    );

    if (!active || !kioskEnabled) {
      clearRetry();
      retryCount = 0;
      disableShellStyles();
      emit();
      return;
    }

    if (!shellAvailable) {
      disableShellStyles();
      scheduleRetry(sync);
      emit();
      return;
    }

    clearRetry();
    retryCount = 0;
    disableShellStyles();

    applyStyleRules(
      styleRecord,
      queryAllAcrossShadows(targetWindow.document, HEADER_SELECTORS),
      STYLE_RULES.header
    );
    applyStyleRules(
      styleRecord,
      queryAllAcrossShadows(targetWindow.document, SIDEBAR_SELECTORS),
      STYLE_RULES.sidebar
    );
    applyStyleRules(
      styleRecord,
      queryAllAcrossShadows(targetWindow.document, VIEW_SELECTORS),
      STYLE_RULES.view
    );
    applyStyleRules(
      styleRecord,
      queryAllAcrossShadows(targetWindow.document, DRAWER_HOST_SELECTORS),
      STYLE_RULES.drawerHost
    );
    applyStyleRules(
      styleRecord,
      queryAllAcrossShadows(targetWindow.document, PANEL_RESOLVER_SELECTORS),
      STYLE_RULES.panelResolver
    );

    emit();
  };

  const handleLocationChange = () => {
    sync();
  };

  const patchHistoryMethod = (methodName: 'pushState' | 'replaceState') => {
    const history = targetWindow.history;
    if (!history || typeof history[methodName] !== 'function') {
      return;
    }

    const original = history[methodName].bind(history);
    history[methodName] = ((...args: Parameters<History['pushState']>) => {
      const result = original(...args);
      queueMicrotask(handleLocationChange);
      return result;
    }) as History['pushState'];

    cleanups.push(() => {
      history[methodName] = original as History['pushState'];
    });
  };

  patchHistoryMethod('pushState');
  patchHistoryMethod('replaceState');
  targetWindow.addEventListener('popstate', handleLocationChange);
  targetWindow.addEventListener('location-changed', handleLocationChange as EventListener);
  cleanups.push(() => {
    targetWindow.removeEventListener('popstate', handleLocationChange);
    targetWindow.removeEventListener('location-changed', handleLocationChange as EventListener);
  });

  const api: NavetHomeAssistantShellApi = {
    get available() {
      return shellAvailable;
    },
    getSnapshot: () => createSnapshot(targetWindow, shellAvailable, kioskEnabled),
    isKioskEnabled: () => kioskEnabled,
    setKioskEnabled: async (enabled: boolean) => {
      kioskEnabled = enabled;
      sync();
      return true;
    },
    openSidebar: async () => {
      if (kioskEnabled) {
        kioskEnabled = false;
        sync();
      }

      targetWindow.postMessage({ type: TOGGLE_MENU_MESSAGE_TYPE }, '*');

      const menuButton = queryFirstAcrossShadows(
        targetWindow.document,
        MENU_BUTTON_SELECTORS
      ) as HTMLElement | null;
      if (menuButton && typeof menuButton.click === 'function') {
        menuButton.click();
        return true;
      }

      return shellAvailable;
    },
    navigateHome: async () => {
      if (typeof targetWindow.location?.assign === 'function') {
        targetWindow.location.assign('/');
        return true;
      }

      return false;
    },
    subscribe: (listener: NavetHomeAssistantShellListener) => {
      listeners.add(listener);
      listener(createSnapshot(targetWindow, shellAvailable, kioskEnabled));
      return () => {
        listeners.delete(listener);
      };
    },
  };

  targetWindow[NAVET_HOME_ASSISTANT_SHELL_GLOBAL] = api;
  sync();

  const destroy = () => {
    clearRetry();
    disableShellStyles();
    listeners.clear();
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
    if (targetWindow[NAVET_HOME_ASSISTANT_SHELL_GLOBAL] === api) {
      delete targetWindow[NAVET_HOME_ASSISTANT_SHELL_GLOBAL];
    }
  };

  return { api, destroy, sync };
}
