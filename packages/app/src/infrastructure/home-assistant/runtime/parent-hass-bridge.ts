import type {
  HomeAssistantPanelHass,
  HomeAssistantPanelShellBridge,
} from '@navet/app/services/home-assistant-panel-adapter';
import type { MessageBase } from 'home-assistant-js-websocket';
import { callService as callHassService } from 'home-assistant-js-websocket';
import {
  NAVET_HOME_ASSISTANT_SHELL_GLOBAL,
  type NavetHomeAssistantShellApi,
} from './navet-ha-shell-api';

interface ParentHassLike {
  states: HomeAssistantPanelHass['states'];
  config: HomeAssistantPanelHass['config'];
  user?: HomeAssistantPanelHass['user'];
  connection?: HomeAssistantPanelHass['connection'];
  callService?: HomeAssistantPanelHass['callService'];
  callWS?: HomeAssistantPanelHass['callWS'];
}

type ParentWindowLike = Window & typeof globalThis;
type Cleanup = () => void;

type ManagedStyleRecord = Map<
  Element,
  {
    inlineStyle: string | null;
  }
>;

interface ParentDomKioskController {
  connect: (listener?: () => void) => Cleanup;
  getAvailable: () => boolean;
  isKioskEnabled: () => boolean;
  openSidebar: () => Promise<boolean>;
  setKioskEnabled: (enabled: boolean) => Promise<boolean>;
}

const parentDomKioskControllers = new WeakMap<ParentWindowLike, ParentDomKioskController>();

const HEADER_SELECTORS = ['app-header', 'app-toolbar', 'ha-menu-button', '.header'];
const SHELL_SYNC_RETRY_LIMIT = 20;
const SHELL_SYNC_RETRY_DELAY_MS = 250;

const KIOSK_STYLE_RULES = {
  appContent: {
    'padding-left': '0px',
  },
  drawer: {
    '--app-drawer-width': '0px',
    '--ha-sidebar-width': '0px',
    '--kiosk-sidebar-width': '0px',
    '--mdc-drawer-width': '0px',
  },
  header: {
    display: 'none',
  },
  panelResolver: {
    '--mdc-top-app-bar-width': '100%',
  },
  panelAppHeader: {
    display: 'none',
  },
  sidebar: {
    display: 'none',
    'max-width': '0px',
    'min-width': '0px',
    visibility: 'hidden',
    width: '0px',
  },
  sidebarShell: {
    display: 'none',
    'max-width': '0px',
    'min-width': '0px',
    width: '0px',
  },
} as const;

function isMessageBase(message: Record<string, unknown>): message is MessageBase {
  return typeof message.type === 'string';
}

function isParentHassLike(value: unknown): value is ParentHassLike {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ParentHassLike>;

  return (
    typeof candidate.states === 'object' &&
    candidate.states !== null &&
    typeof candidate.config === 'object' &&
    candidate.config !== null &&
    typeof candidate.connection === 'object' &&
    candidate.connection !== null
  );
}

function getNodeChildren(node: Element): Element[] {
  const children = [...Array.from(node.children)];
  const shadowChildren = node.shadowRoot ? [...Array.from(node.shadowRoot.children)] : [];
  return [...children, ...shadowChildren];
}

function isElementNode(value: unknown): value is Element {
  return Boolean(value && typeof value === 'object' && 'nodeType' in value && value.nodeType === 1);
}

function isRootNode(value: unknown): value is ParentNode & { children: HTMLCollection } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'nodeType' in value &&
      (value.nodeType === 9 || value.nodeType === 11)
  );
}

function walkElements(root: ParentNode, callback: (element: Element) => void) {
  const queue: Element[] = [];
  if (isRootNode(root)) {
    queue.push(...Array.from(root.children));
  } else if (isElementNode(root)) {
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

function queryAllAcrossShadows(root: ParentNode, selectors: string[]) {
  const matches: Element[] = [];

  walkElements(root, (element) => {
    if (selectors.some((selector) => element.matches(selector))) {
      matches.push(element);
    }
  });

  return matches;
}

function queryFirstAcrossShadows(root: ParentNode, selectors: string[]) {
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

function rememberStyle(record: ManagedStyleRecord, element: Element) {
  if (record.has(element)) {
    return;
  }

  record.set(element, {
    inlineStyle: element.getAttribute('style'),
  });
}

function hasStyleDeclaration(element: Element): element is Element & {
  style: CSSStyleDeclaration & { setProperty: typeof CSSStyleDeclaration.prototype.setProperty };
} {
  if (!('style' in element)) {
    return false;
  }

  const style = (element as Element & { style?: Partial<CSSStyleDeclaration> }).style;
  return typeof style?.setProperty === 'function';
}

function applyStyleRules(
  record: ManagedStyleRecord,
  elements: Element[],
  styles: Record<string, string>
) {
  for (const element of elements) {
    rememberStyle(record, element);

    for (const [property, value] of Object.entries(styles)) {
      hasStyleDeclaration(element)
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

function getParentWindow(): ParentWindowLike | null {
  if (typeof window === 'undefined' || window.parent === window) {
    return null;
  }

  return window.parent as ParentWindowLike;
}

export function resolveParentHomeAssistantShellBridge(): HomeAssistantPanelShellBridge | null {
  const parentWindow = getParentWindow();
  if (!parentWindow) {
    return null;
  }

  try {
    return createShellBridge(parentWindow);
  } catch {
    return null;
  }
}

function findParentHass(root: ParentNode): ParentHassLike | null {
  const queue: Element[] = [];
  const homeAssistantRoot = root.querySelector('home-assistant');

  if (homeAssistantRoot) {
    queue.push(homeAssistantRoot);
  }

  queue.push(...Array.from(root.querySelectorAll('*')));

  const visited = new Set<Element>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const hass = (current as Element & { hass?: unknown }).hass;
    if (isParentHassLike(hass)) {
      return hass;
    }

    queue.push(...getNodeChildren(current));
  }

  return null;
}

function getParentShellApi(parentWindow: ParentWindowLike): NavetHomeAssistantShellApi | null {
  const shellApi = parentWindow[NAVET_HOME_ASSISTANT_SHELL_GLOBAL];
  return shellApi ?? null;
}

function createParentDomKioskController(parentWindow: ParentWindowLike): ParentDomKioskController {
  const listeners = new Set<() => void>();
  const styleRecord: ManagedStyleRecord = new Map();
  let kioskEnabled = false;
  let retryCount = 0;
  let retryTimer: number | null = null;

  const resolveLayout = () => {
    const drawer = queryFirstAcrossShadows(parentWindow.document, ['ha-drawer']) as
      | (Element & { shadowRoot?: ShadowRoot | null })
      | null;
    const layout =
      (drawer?.shadowRoot?.querySelector('.layout') as Element | null) ??
      queryFirstAcrossShadows(parentWindow.document, ['.layout']);
    const sidebarShell =
      (layout?.querySelector('.sidebar-shell') as Element | null) ??
      queryFirstAcrossShadows(parentWindow.document, ['.sidebar-shell']);
    const appContent =
      (layout?.querySelector('.app-content') as Element | null) ??
      queryFirstAcrossShadows(parentWindow.document, ['.app-content']);
    const sidebar =
      drawer?.querySelector('ha-sidebar') ??
      queryFirstAcrossShadows(drawer?.shadowRoot ?? parentWindow.document, ['ha-sidebar']);
    const panelResolver =
      drawer?.querySelector('partial-panel-resolver') ??
      queryFirstAcrossShadows(drawer?.shadowRoot ?? parentWindow.document, [
        'partial-panel-resolver',
      ]);
    const panelApp =
      (panelResolver?.querySelector('ha-panel-app') as
        | (Element & { shadowRoot?: ShadowRoot | null })
        | null) ??
      (queryFirstAcrossShadows(parentWindow.document, ['ha-panel-app']) as
        | (Element & { shadowRoot?: ShadowRoot | null })
        | null);
    const panelAppHeader =
      (panelApp?.shadowRoot?.querySelector('.header') as Element | null) ??
      queryFirstAcrossShadows(panelApp?.shadowRoot ?? parentWindow.document, ['.header']);
    const headers = queryAllAcrossShadows(parentWindow.document, HEADER_SELECTORS);

    return {
      appContent,
      drawer,
      headers,
      panelApp,
      panelAppHeader,
      panelResolver,
      sidebar,
      sidebarShell,
    };
  };

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const clearRetry = () => {
    if (retryTimer !== null) {
      parentWindow.clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const scheduleRetry = () => {
    if (!kioskEnabled || retryCount >= SHELL_SYNC_RETRY_LIMIT || retryTimer !== null) {
      return;
    }

    retryTimer = parentWindow.setTimeout(() => {
      retryTimer = null;
      retryCount += 1;
      syncStyles();
    }, SHELL_SYNC_RETRY_DELAY_MS);
  };

  const getAvailable = () => {
    const layout = resolveLayout();
    return Boolean(
      layout.drawer && ((layout.sidebarShell && layout.appContent) || layout.panelAppHeader)
    );
  };

  const syncStyles = () => {
    clearRetry();

    if (!kioskEnabled) {
      restoreStyles(styleRecord);
      emit();
      return true;
    }

    const layout = resolveLayout();
    if (!layout.drawer || (!(layout.sidebarShell && layout.appContent) && !layout.panelAppHeader)) {
      scheduleRetry();
      return false;
    }

    applyStyleRules(styleRecord, [layout.drawer], KIOSK_STYLE_RULES.drawer);
    if (layout.sidebarShell) {
      applyStyleRules(styleRecord, [layout.sidebarShell], KIOSK_STYLE_RULES.sidebarShell);
    }
    if (layout.appContent) {
      applyStyleRules(styleRecord, [layout.appContent], KIOSK_STYLE_RULES.appContent);
    }

    if (layout.sidebar) {
      applyStyleRules(styleRecord, [layout.sidebar], KIOSK_STYLE_RULES.sidebar);
    }

    if (layout.panelResolver) {
      applyStyleRules(styleRecord, [layout.panelResolver], KIOSK_STYLE_RULES.panelResolver);
    }

    if (layout.panelAppHeader) {
      applyStyleRules(styleRecord, [layout.panelAppHeader], KIOSK_STYLE_RULES.panelAppHeader);
    }

    if (layout.headers.length > 0) {
      applyStyleRules(styleRecord, layout.headers, KIOSK_STYLE_RULES.header);
    }

    emit();
    return true;
  };

  return {
    connect(listener) {
      if (!listener) {
        return () => {};
      }

      listeners.add(listener);
      listener();

      return () => {
        listeners.delete(listener);
      };
    },
    getAvailable,
    isKioskEnabled: () => kioskEnabled,
    openSidebar: async () => false,
    setKioskEnabled: async (enabled: boolean) => {
      const previousKioskEnabled = kioskEnabled;
      kioskEnabled = enabled;
      retryCount = 0;

      const changed = syncStyles();
      if (!changed) {
        kioskEnabled = previousKioskEnabled;
      }
      if (!enabled) {
        clearRetry();
      }

      return changed;
    },
  };
}

function getParentDomKioskController(parentWindow: ParentWindowLike) {
  const existing = parentDomKioskControllers.get(parentWindow);
  if (existing) {
    return existing;
  }

  const controller = createParentDomKioskController(parentWindow);
  parentDomKioskControllers.set(parentWindow, controller);
  return controller;
}

function createShellBridge(parentWindow: ParentWindowLike): HomeAssistantPanelShellBridge {
  let unsubscribe: (() => void) | null = null;
  const shellApi = getParentShellApi(parentWindow);
  const fallbackController = shellApi ? null : getParentDomKioskController(parentWindow);

  const connect = (listener?: () => void) => {
    unsubscribe?.();

    if (!listener) {
      return;
    }

    unsubscribe =
      shellApi?.subscribe(() => listener()) ??
      fallbackController?.connect(() => listener()) ??
      null;
  };

  const disconnect = () => {
    unsubscribe?.();
    unsubscribe = null;
  };

  const isKioskEnabled = () => {
    if (shellApi) {
      return shellApi.isKioskEnabled();
    }

    return fallbackController?.isKioskEnabled() ?? null;
  };

  const setHomeAssistantKioskEnabled = async (enabled: boolean) => {
    if (shellApi) {
      return shellApi.setKioskEnabled(enabled);
    }

    return fallbackController?.setKioskEnabled(enabled) ?? false;
  };

  const openHomeAssistantSidebar = async () => {
    if (shellApi) {
      return shellApi.openSidebar();
    }

    return fallbackController?.openSidebar() ?? false;
  };

  const navigateToHomeAssistantHome = async () => {
    const shellApi = getParentShellApi(parentWindow);
    if (shellApi) {
      return shellApi.navigateHome();
    }

    if (typeof parentWindow.location?.assign === 'function') {
      parentWindow.location.assign('/');
      return true;
    }

    if (parentWindow.location) {
      parentWindow.location.href = '/';
      return true;
    }

    return false;
  };

  return {
    canToggleKiosk: Boolean(shellApi || fallbackController),
    canOpenSidebar: Boolean(shellApi),
    canNavigateHome: true,
    connect,
    disconnect,
    isKioskEnabled,
    setHomeAssistantKioskEnabled,
    openHomeAssistantSidebar,
    navigateToHomeAssistantHome,
  };
}

export function resolveParentHomeAssistantBridge(): HomeAssistantPanelHass | null {
  const parentWindow = getParentWindow();
  if (!parentWindow) {
    return null;
  }

  try {
    const parentDocument = parentWindow.document;
    const parentHass = findParentHass(parentDocument);
    const connection = parentHass?.connection;

    if (!parentHass || !connection) {
      return null;
    }

    return {
      states: parentHass.states,
      config: parentHass.config,
      user: parentHass.user,
      connection,
      shell: resolveParentHomeAssistantShellBridge() ?? undefined,
      callService:
        parentHass.callService ??
        (async (domain, service, serviceData = {}, target) => {
          await callHassService(connection as never, domain, service, serviceData, target);
        }),
      callWS:
        parentHass.callWS ??
        (async <T = unknown>(message: Record<string, unknown>) => {
          if (!isMessageBase(message)) {
            throw new Error('Home Assistant websocket messages must include a type');
          }

          return connection.sendMessagePromise(message) as Promise<T>;
        }),
    };
  } catch {
    return null;
  }
}
