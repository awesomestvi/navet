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

function createShellBridge(parentWindow: ParentWindowLike): HomeAssistantPanelShellBridge {
  let unsubscribe: (() => void) | null = null;

  const connect = (listener?: () => void) => {
    unsubscribe?.();

    if (!listener) {
      return;
    }

    const shellApi = getParentShellApi(parentWindow);
    unsubscribe = shellApi?.subscribe(() => listener()) ?? null;
  };

  const disconnect = () => {
    unsubscribe?.();
    unsubscribe = null;
  };

  const isKioskEnabled = () => {
    const shellApi = getParentShellApi(parentWindow);
    return shellApi ? shellApi.isKioskEnabled() : null;
  };

  const setHomeAssistantKioskEnabled = async (enabled: boolean) => {
    const shellApi = getParentShellApi(parentWindow);
    if (!shellApi) {
      return false;
    }

    return shellApi.setKioskEnabled(enabled);
  };

  const openHomeAssistantSidebar = async () => {
    const shellApi = getParentShellApi(parentWindow);
    if (!shellApi) {
      return false;
    }

    return shellApi.openSidebar();
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
    canToggleKiosk: Boolean(getParentShellApi(parentWindow)),
    canOpenSidebar: Boolean(getParentShellApi(parentWindow)),
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
