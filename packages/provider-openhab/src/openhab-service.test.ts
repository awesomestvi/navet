import type { NavetProviderSessionInput } from '@navet/core/provider-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOpenHABSnapshotClient } from './openhab-service';

class MockWebSocket {
  static readonly OPEN = 1;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readonly sent: string[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  emitMessage(data: unknown) {
    this.onmessage?.({
      data: JSON.stringify(data),
    } as MessageEvent);
  }

  emitClose() {
    this.readyState = 3;
    this.onclose?.({} as CloseEvent);
  }
}

const session: NavetProviderSessionInput = {
  providerId: 'openhab',
  runtime: 'standalone-oauth',
  authMode: 'oauth',
  haBaseUrl: 'http://openhab.local:8080',
  hassUrl: 'http://openhab.local:8080',
  username: 'navet',
  password: 'secret',
};

const proxiedSession: NavetProviderSessionInput = {
  ...session,
  proxyBaseUrl: '/__navet_openhab_proxy__',
};

describe('openhab service', () => {
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.restoreAllMocks();
    vi.useRealTimers();
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
  });

  it('loads snapshots with basic authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ name: 'LivingRoomLamp', type: 'Switch', state: 'ON' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createOpenHABSnapshotClient(session);
    const snapshot = await client.loadSnapshot?.();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://openhab.local:8080/rest/items?recursive=false',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${btoa('navet:secret')}`,
        }),
      })
    );
    expect(snapshot).toMatchObject({
      connected: true,
      items: {
        LivingRoomLamp: expect.objectContaining({
          name: 'LivingRoomLamp',
          state: 'ON',
        }),
      },
    });
  });

  it('prefers the same-origin proxy for snapshot loading when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ name: 'LivingRoomLamp', type: 'Switch', state: 'ON' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createOpenHABSnapshotClient(proxiedSession);
    const snapshot = await client.loadSnapshot?.();

    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_openhab_proxy__/rest/items?recursive=false',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
        },
      })
    );
    expect(snapshot).toMatchObject({
      connected: true,
      items: {
        LivingRoomLamp: expect.objectContaining({
          name: 'LivingRoomLamp',
          state: 'ON',
        }),
      },
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('http://openhab.local:8080/rest/items?recursive=false'),
      expect.anything()
    );
  });

  it('surfaces openHAB auth failures distinctly', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
      ) as typeof fetch;

    const client = createOpenHABSnapshotClient(session);

    await expect(client.loadSnapshot?.()).rejects.toThrow(
      'openHAB authentication failed. Check your username, password, and API Security settings.'
    );
  });

  it('sends item commands with basic authentication', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 202, headers: { 'Content-Type': 'text/plain' } })
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createOpenHABSnapshotClient(session);
    await client.sendItemCommand('LivingRoomLamp', 'OFF');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://openhab.local:8080/rest/items/LivingRoomLamp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Basic ${btoa('navet:secret')}`,
          'Content-Type': 'text/plain',
        }),
        body: 'OFF',
      })
    );
  });

  it('sends item commands through the same-origin proxy when configured', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 202, headers: { 'Content-Type': 'text/plain' } })
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createOpenHABSnapshotClient(proxiedSession);
    await client.sendItemCommand('LivingRoomLamp', 'OFF');

    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_openhab_proxy__/rest/items/LivingRoomLamp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'text/plain',
        }),
        body: 'OFF',
      })
    );
    expect(fetchMock.mock.calls[0]?.[1]).not.toMatchObject({
      headers: expect.objectContaining({
        Authorization: expect.any(String),
      }),
    });
  });

  it('connects to the authenticated WebSocket and reconnects after disconnects', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ name: 'LivingRoomLamp', type: 'Switch', state: 'ON' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const listener = vi.fn();

    const client = createOpenHABSnapshotClient(session);
    const unsubscribe = client.subscribeSnapshot?.(listener);
    const socket = MockWebSocket.instances[0];

    expect(new URL(socket.url).pathname).toBe('/ws');
    expect(new URL(socket.url).searchParams.get('accessToken')).toBe(btoa('navet:secret'));

    socket.emitOpen();

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          items: {
            LivingRoomLamp: expect.objectContaining({ state: 'ON' }),
          },
        })
      )
    );

    expect(socket.sent.some((message) => message.includes('openhab/websocket/filter/topic'))).toBe(
      true
    );

    socket.emitClose();

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          reconnecting: true,
          error: 'openHAB live updates disconnected. Cached UI is still available.',
        })
      )
    );

    await vi.advanceTimersByTimeAsync(3_000);
    expect(MockWebSocket.instances).toHaveLength(2);

    unsubscribe?.();
  });

  it('uses the same-origin proxy for websocket live updates when configured', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ name: 'LivingRoomLamp', type: 'Switch', state: 'ON' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    const listener = vi.fn();
    const client = createOpenHABSnapshotClient(proxiedSession);
    const unsubscribe = client.subscribeSnapshot?.(listener);
    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe(
      `${window.location.origin.replace(/^http/, 'ws')}/__navet_openhab_proxy__/ws`
    );
    expect(new URL(socket.url).searchParams.get('accessToken')).toBeNull();

    socket.emitOpen();

    await vi.waitFor(() =>
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          items: {
            LivingRoomLamp: expect.objectContaining({ state: 'ON' }),
          },
        })
      )
    );

    unsubscribe?.();
  });
});
