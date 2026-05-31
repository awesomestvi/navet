import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import type { OpenHABItem, OpenHABSnapshot } from './openhab-types';

export interface OpenHABSnapshotClient {
  loadSnapshot?(): Promise<OpenHABSnapshot>;
  subscribeSnapshot?(listener: OpenHABSnapshotListener): () => void;
  sendItemCommand(itemName: string, command: string): Promise<void>;
}

type OpenHABSnapshotListener = (snapshot: OpenHABSnapshot) => void;

const EMPTY_OPENHAB_SNAPSHOT: OpenHABSnapshot = {
  connected: false,
  items: {},
};

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
  };
}

function getRequestHeaders(session: NavetProviderSessionInput) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const accessToken = session.auth?.accessToken;
  if (typeof accessToken === 'string' && accessToken.length > 0) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function createOpenHABEventUrl(baseUrl: string) {
  return `${baseUrl}/rest/events`;
}

export function createOpenHABSnapshotClient(
  session: NavetProviderSessionInput
): OpenHABSnapshotClient {
  const baseUrl = (session.hassUrl ?? '').replace(/\/$/, '');

  return {
    async loadSnapshot() {
      const response = await fetch(`${baseUrl}/rest/items?recursive=false`, {
        headers: getRequestHeaders(session),
      });

      if (!response.ok) {
        throw new Error(`openHAB snapshot request failed with status ${response.status}`);
      }

      return normalizeOpenHABSnapshotPayload(await response.json());
    },
    subscribeSnapshot(listener) {
      if (typeof EventSource === 'undefined') {
        return () => {};
      }

      const source = new EventSource(createOpenHABEventUrl(baseUrl));
      const loadSnapshot = async () => {
        const response = await fetch(`${baseUrl}/rest/items?recursive=false`, {
          headers: getRequestHeaders(session),
        });

        if (!response.ok) {
          throw new Error(`openHAB snapshot request failed with status ${response.status}`);
        }

        return normalizeOpenHABSnapshotPayload(await response.json());
      };
      const reload = async () => {
        try {
          listener(await loadSnapshot());
        } catch {
          listener({
            connected: false,
            items: {},
          });
        }
      };

      source.onmessage = () => {
        void reload();
      };
      source.onerror = () => {
        void reload();
      };

      return () => {
        source.close();
      };
    },
    async sendItemCommand(itemName, command) {
      const response = await fetch(`${baseUrl}/rest/items/${encodeURIComponent(itemName)}`, {
        method: 'POST',
        headers: {
          ...getRequestHeaders(session),
          'Content-Type': 'text/plain',
        },
        body: command,
      });

      if (!response.ok) {
        throw new Error(
          `openHAB command request failed for ${itemName} with status ${response.status}`
        );
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
      throw new Error('openHAB snapshot loading is not configured yet');
    }

    const snapshot = await this.client.loadSnapshot();
    this.replaceSnapshot(snapshot);
    return snapshot;
  }

  getSnapshot(): OpenHABSnapshot {
    return this.snapshot;
  }

  replaceSnapshot(snapshot: Partial<OpenHABSnapshot>) {
    this.snapshot = {
      connected: snapshot.connected ?? this.snapshot.connected,
      items: snapshot.items ?? this.snapshot.items,
    };
    this.emitSnapshot();
  }

  resetSnapshot() {
    this.snapshot = EMPTY_OPENHAB_SNAPSHOT;
    this.emitSnapshot();
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
