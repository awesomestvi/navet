import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type { OpenHABItem, OpenHABSnapshot } from './openhab-types';

export interface OpenHABSnapshotClient {
  loadSnapshot?(): Promise<OpenHABSnapshot>;
  subscribeSnapshot?(listener: OpenHABSnapshotListener): () => void;
  sendItemCommand(itemName: string, command: string): Promise<void>;
}

type OpenHABSnapshotListener = (snapshot: OpenHABSnapshot) => void;

interface OpenHABWebSocketEvent {
  type?: string;
  topic?: string;
  payload?: string;
}

const EMPTY_OPENHAB_SNAPSHOT: OpenHABSnapshot = {
  connected: false,
  items: {},
  reconnecting: false,
  error: null,
};

const NAVET_OPENHAB_WS_SOURCE = 'navet-openhab';
const OPENHAB_WS_RECONNECT_DELAY_MS = 3_000;
const OPENHAB_WS_HEARTBEAT_INTERVAL_MS = 5_000;

function getErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    /failed to fetch|networkerror|load failed/i.test(error.message.trim())
  ) {
    return 'Unable to reach openHAB. Check the URL, network path, and browser access to the server.';
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return 'Unable to reach openHAB';
}

function normalizeOpenHABItem(value: unknown): OpenHABItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Partial<OpenHABItem>;
  if (typeof item.name !== 'string' || item.name.trim().length === 0) {
    return null;
  }

  return {
    name: item.name,
    type: typeof item.type === 'string' ? item.type : undefined,
    label: typeof item.label === 'string' ? item.label : undefined,
    category: typeof item.category === 'string' ? item.category : null,
    state: typeof item.state === 'string' ? item.state : undefined,
    tags: Array.isArray(item.tags)
      ? item.tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
      : [],
    groupNames: Array.isArray(item.groupNames)
      ? item.groupNames.filter(
          (groupName): groupName is string => typeof groupName === 'string' && groupName.length > 0
        )
      : [],
    stateDescription:
      item.stateDescription && typeof item.stateDescription === 'object'
        ? {
            pattern:
              typeof item.stateDescription.pattern === 'string'
                ? item.stateDescription.pattern
                : undefined,
            readOnly:
              typeof item.stateDescription.readOnly === 'boolean'
                ? item.stateDescription.readOnly
                : undefined,
            options: Array.isArray(item.stateDescription.options)
              ? item.stateDescription.options
                  .filter((option): option is { value?: string; label?: string } =>
                    Boolean(option && typeof option === 'object')
                  )
                  .map((option) => ({
                    value: typeof option.value === 'string' ? option.value : undefined,
                    label: typeof option.label === 'string' ? option.label : undefined,
                  }))
              : undefined,
          }
        : undefined,
    metadata:
      item.metadata && typeof item.metadata === 'object'
        ? {
            semantics:
              item.metadata.semantics && typeof item.metadata.semantics === 'object'
                ? {
                    value:
                      typeof item.metadata.semantics.value === 'string'
                        ? item.metadata.semantics.value
                        : undefined,
                    config:
                      item.metadata.semantics.config &&
                      typeof item.metadata.semantics.config === 'object'
                        ? {
                            hasLocation:
                              typeof item.metadata.semantics.config.hasLocation === 'string'
                                ? item.metadata.semantics.config.hasLocation
                                : undefined,
                            isPointOf:
                              typeof item.metadata.semantics.config.isPointOf === 'string'
                                ? item.metadata.semantics.config.isPointOf
                                : undefined,
                            relatesTo:
                              typeof item.metadata.semantics.config.relatesTo === 'string'
                                ? item.metadata.semantics.config.relatesTo
                                : undefined,
                            isPartOf:
                              typeof item.metadata.semantics.config.isPartOf === 'string'
                                ? item.metadata.semantics.config.isPartOf
                                : undefined,
                          }
                        : undefined,
                    editable:
                      typeof item.metadata.semantics.editable === 'boolean'
                        ? item.metadata.semantics.editable
                        : undefined,
                  }
                : undefined,
          }
        : undefined,
    editable: typeof item.editable === 'boolean' ? item.editable : undefined,
  };
}

function normalizeOpenHABSnapshotPayload(payload: unknown): OpenHABSnapshot {
  if (!Array.isArray(payload)) {
    return EMPTY_OPENHAB_SNAPSHOT;
  }

  const items = Object.fromEntries(
    payload
      .map((entry) => normalizeOpenHABItem(entry))
      .filter((item): item is OpenHABItem => item !== null)
      .map((item) => [item.name, item])
  );

  return {
    connected: true,
    items,
    reconnecting: false,
    error: null,
  };
}

function getOpenHABCredentials(session: NavetProviderSessionInput) {
  const sessionRecord = session as Record<string, unknown>;
  const username = typeof sessionRecord.username === 'string' ? sessionRecord.username.trim() : '';
  const password = typeof sessionRecord.password === 'string' ? sessionRecord.password : '';

  return username && password ? { username, password } : null;
}

function createBasicAuthToken(session: NavetProviderSessionInput): string | null {
  const credentials = getOpenHABCredentials(session);
  if (credentials) {
    return btoa(`${credentials.username}:${credentials.password}`);
  }

  const apiToken = session.auth?.accessToken?.trim();
  return apiToken ? btoa(`${apiToken}:`) : null;
}

function getProxyBaseUrl(session: NavetProviderSessionInput): string | null {
  const proxyBaseUrl = typeof session.proxyBaseUrl === 'string' ? session.proxyBaseUrl.trim() : '';
  return proxyBaseUrl.length > 0 ? proxyBaseUrl.replace(/\/$/, '') : null;
}

function getDirectBaseUrl(session: NavetProviderSessionInput): string {
  return (session.hassUrl ?? '').replace(/\/$/, '');
}

function resolveOpenHABTransport(session: NavetProviderSessionInput) {
  const proxyBaseUrl = getProxyBaseUrl(session);
  const directBaseUrl = getDirectBaseUrl(session);

  return {
    baseUrl: proxyBaseUrl ?? directBaseUrl,
    isProxied: proxyBaseUrl !== null,
  };
}

function resolveAbsoluteUrl(baseUrl: string) {
  return new URL(
    baseUrl,
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
  );
}

function getRequestHeaders(session: NavetProviderSessionInput) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (getProxyBaseUrl(session)) {
    return headers;
  }

  const basicAuthToken = createBasicAuthToken(session);
  if (basicAuthToken) {
    headers.Authorization = `Basic ${basicAuthToken}`;
  }

  return headers;
}

function buildOpenHABRequestError(response: Pick<Response, 'status'>, requestLabel: string): Error {
  if (response.status === 401 || response.status === 403) {
    return new Error(
      'openHAB authentication failed. Check your username, password, and API Security settings.'
    );
  }

  return new Error(`openHAB ${requestLabel} request failed with status ${response.status}`);
}

function createOpenHABWebSocketUrl(
  baseUrl: string,
  session: NavetProviderSessionInput,
  isProxied: boolean
) {
  const base = resolveAbsoluteUrl(baseUrl);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  base.pathname = `${base.pathname.replace(/\/$/, '')}/ws`;
  base.search = '';

  if (isProxied) {
    return base.toString();
  }

  const accessToken = createBasicAuthToken(session);
  if (accessToken) {
    base.searchParams.set('accessToken', accessToken);
  }

  return base.toString();
}

function isOpenHABItemEvent(message: OpenHABWebSocketEvent) {
  return (
    typeof message.topic === 'string' &&
    message.topic.startsWith('openhab/items/') &&
    typeof message.type === 'string' &&
    message.type !== 'WebSocketEvent'
  );
}

function sendWebSocketJson(socket: WebSocket, payload: Record<string, string>) {
  socket.send(JSON.stringify(payload));
}

function subscribeToOpenHABSnapshot(
  baseUrl: string,
  session: NavetProviderSessionInput,
  isProxied: boolean,
  listener: OpenHABSnapshotListener,
  loadSnapshot: () => Promise<OpenHABSnapshot>,
  getLatestSnapshot: () => OpenHABSnapshot,
  setLatestSnapshot: (snapshot: OpenHABSnapshot) => void
) {
  if (typeof WebSocket === 'undefined') {
    return () => {};
  }

  let closed = false;
  let socket: WebSocket | null = null;
  let heartbeatIntervalId: ReturnType<typeof globalThis.setInterval> | null = null;
  let reconnectTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  let reloadInFlight: Promise<void> | null = null;

  const clearHeartbeat = () => {
    if (heartbeatIntervalId !== null) {
      globalThis.clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
  };

  const clearReconnect = () => {
    if (reconnectTimeoutId !== null) {
      globalThis.clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
  };

  const emitDisconnected = (error: string) => {
    const latestSnapshot = getLatestSnapshot();
    listener({
      connected: latestSnapshot.connected,
      items: latestSnapshot.items,
      reconnecting: true,
      error,
    });
  };

  const reload = () => {
    if (reloadInFlight) {
      return reloadInFlight;
    }

    reloadInFlight = (async () => {
      try {
        const snapshot = await loadSnapshot();
        setLatestSnapshot(snapshot);
        listener(snapshot);
      } catch (error) {
        emitDisconnected(getErrorMessage(error));
      } finally {
        reloadInFlight = null;
      }
    })();

    return reloadInFlight;
  };

  const scheduleReconnect = (error: string) => {
    emitDisconnected(error);
    if (closed || reconnectTimeoutId !== null) {
      return;
    }

    reconnectTimeoutId = globalThis.setTimeout(() => {
      reconnectTimeoutId = null;
      connect();
    }, OPENHAB_WS_RECONNECT_DELAY_MS);
  };

  const connect = () => {
    if (closed) {
      return;
    }

    clearReconnect();
    clearHeartbeat();

    socket = new WebSocket(createOpenHABWebSocketUrl(baseUrl, session, isProxied));

    socket.onopen = () => {
      if (!socket) {
        return;
      }

      sendWebSocketJson(socket, {
        type: 'WebSocketEvent',
        topic: 'openhab/websocket/filter/topic',
        payload: '["openhab/items/*/*"]',
        source: NAVET_OPENHAB_WS_SOURCE,
      });
      sendWebSocketJson(socket, {
        type: 'WebSocketEvent',
        topic: 'openhab/websocket/filter/source',
        payload: `["${NAVET_OPENHAB_WS_SOURCE}"]`,
        source: NAVET_OPENHAB_WS_SOURCE,
      });
      heartbeatIntervalId = globalThis.setInterval(() => {
        if (socket?.readyState !== WebSocket.OPEN) {
          return;
        }

        sendWebSocketJson(socket, {
          type: 'WebSocketEvent',
          topic: 'openhab/websocket/heartbeat',
          payload: 'PING',
          source: NAVET_OPENHAB_WS_SOURCE,
        });
      }, OPENHAB_WS_HEARTBEAT_INTERVAL_MS);

      void reload();
    };

    socket.onmessage = (event) => {
      let message: OpenHABWebSocketEvent | null = null;
      try {
        message = JSON.parse(String(event.data)) as OpenHABWebSocketEvent;
      } catch {
        return;
      }

      if (
        message.type === 'WebSocketEvent' &&
        message.topic === 'openhab/websocket/response/failed'
      ) {
        emitDisconnected(
          typeof message.payload === 'string' && message.payload.trim().length > 0
            ? `openHAB WebSocket request failed: ${message.payload}`
            : 'openHAB WebSocket request failed'
        );
        return;
      }

      if (isOpenHABItemEvent(message)) {
        void reload();
      }
    };

    socket.onerror = () => {
      socket?.close();
    };

    socket.onclose = () => {
      clearHeartbeat();
      socket = null;
      if (!closed) {
        scheduleReconnect('openHAB live updates disconnected. Cached UI is still available.');
      }
    };
  };

  connect();

  return () => {
    closed = true;
    clearReconnect();
    clearHeartbeat();
    socket?.close();
    socket = null;
  };
}

export function createOpenHABSnapshotClient(
  session: NavetProviderSessionInput
): OpenHABSnapshotClient {
  const transport = resolveOpenHABTransport(session);
  let latestSnapshot: OpenHABSnapshot = EMPTY_OPENHAB_SNAPSHOT;

  const loadSnapshot = async () => {
    const response = await fetch(`${transport.baseUrl}/rest/items?recursive=false`, {
      headers: getRequestHeaders(session),
    });

    if (!response.ok) {
      throw buildOpenHABRequestError(response, 'snapshot');
    }

    latestSnapshot = normalizeOpenHABSnapshotPayload(await response.json());
    return latestSnapshot;
  };

  return {
    loadSnapshot,
    subscribeSnapshot(listener) {
      return subscribeToOpenHABSnapshot(
        transport.baseUrl,
        session,
        transport.isProxied,
        listener,
        loadSnapshot,
        () => latestSnapshot,
        (snapshot) => {
          latestSnapshot = snapshot;
        }
      );
    },
    async sendItemCommand(itemName, command) {
      const response = await fetch(
        `${transport.baseUrl}/rest/items/${encodeURIComponent(itemName)}`,
        {
          method: 'POST',
          headers: {
            ...getRequestHeaders(session),
            'Content-Type': 'text/plain',
          },
          body: command,
        }
      );

      if (!response.ok) {
        throw buildOpenHABRequestError(response, `command for ${itemName}`);
      }
    },
  };
}

class OpenHABService {
  private client: OpenHABSnapshotClient | null = null;
  private snapshot: OpenHABSnapshot = EMPTY_OPENHAB_SNAPSHOT;
  private listeners = new Set<OpenHABSnapshotListener>();
  private clientSnapshotUnsubscribe: (() => void) | null = null;

  setClient(client: OpenHABSnapshotClient | null) {
    this.clientSnapshotUnsubscribe?.();
    this.clientSnapshotUnsubscribe = null;
    this.client = client;

    if (client?.subscribeSnapshot) {
      this.clientSnapshotUnsubscribe = client.subscribeSnapshot((snapshot) => {
        this.replaceSnapshot(snapshot);
      });
    }
  }

  isConfigured() {
    return this.client !== null;
  }

  async loadSnapshot(): Promise<OpenHABSnapshot> {
    if (!this.client?.loadSnapshot) {
      const error = 'openHAB snapshot loading is not configured yet';
      this.setError(error);
      throw new Error(error);
    }

    try {
      const snapshot = await this.client.loadSnapshot();
      this.replaceSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      const message = getErrorMessage(error);
      this.replaceSnapshot({
        connected: false,
        items: this.snapshot.items,
        reconnecting: false,
        error: message,
      });
      throw error;
    }
  }

  getSnapshot(): OpenHABSnapshot {
    return this.snapshot;
  }

  replaceSnapshot(snapshot: Partial<OpenHABSnapshot>) {
    this.snapshot = {
      connected: snapshot.connected ?? this.snapshot.connected,
      items: snapshot.items ?? this.snapshot.items,
      reconnecting: snapshot.reconnecting ?? false,
      error: snapshot.error ?? this.snapshot.error ?? null,
    };
    this.emitSnapshot();
  }

  resetSnapshot() {
    this.snapshot = EMPTY_OPENHAB_SNAPSHOT;
    this.emitSnapshot();
  }

  setError(error: string | null) {
    this.replaceSnapshot({
      connected: false,
      reconnecting: false,
      error,
    });
  }

  subscribe(listener: OpenHABSnapshotListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  async sendItemCommand(itemName: string, command: string): Promise<void> {
    if (!this.client) {
      throw new Error('openHAB integration is not configured yet');
    }

    await this.client.sendItemCommand(itemName, command);
  }

  private emitSnapshot() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

export const openhabService = new OpenHABService();
