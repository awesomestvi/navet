import type { HomeAssistantPanelHass } from '@navet/app/services/home-assistant-panel-adapter';
import type { MessageBase } from 'home-assistant-js-websocket';
import { callService as callHassService } from 'home-assistant-js-websocket';

interface ParentHassLike {
  states: HomeAssistantPanelHass['states'];
  config: HomeAssistantPanelHass['config'];
  user?: HomeAssistantPanelHass['user'];
  connection?: HomeAssistantPanelHass['connection'];
  callService?: HomeAssistantPanelHass['callService'];
  callWS?: HomeAssistantPanelHass['callWS'];
}

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

export function resolveParentHomeAssistantBridge(): HomeAssistantPanelHass | null {
  if (typeof window === 'undefined' || window.parent === window) {
    return null;
  }

  try {
    const parentDocument = window.parent.document;
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
