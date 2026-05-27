import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRuntimeContextForTests } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import { homeyService } from '@/app/services/homey.service';
import { resetAppStores } from '@/test/store-reset';
import App from '../App';

const CONNECTION_TIMEOUT_MESSAGE =
  'Cannot connect to Home Assistant. Check the saved URL and update it if your Home Assistant address changed.';
const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;

type StubListenerMap = {
  entities: Set<(payload: Record<string, unknown> | null) => void>;
  config: Set<(payload: Record<string, unknown> | null) => void>;
  registries: Set<(payload: unknown) => void>;
  connection: Set<
    (payload: { connected: boolean; connection: unknown; reconnecting: boolean }) => void
  >;
  error: Set<(payload: { message: string }) => void>;
};
type StubHomeAssistantService = {
  listeners: StubListenerMap;
  connected: boolean;
  config: Record<string, unknown> | null;
  entities: Record<string, unknown> | null;
  user: unknown;
  connection: unknown;
  areas: Array<{ area_id: string; name: string }>;
  deviceRegistry: Array<{ id: string; area_id?: string | null }>;
  entityRegistry: Array<{ entity_id: string; area_id?: string | null }>;
  setPanelHass: ReturnType<typeof vi.fn>;
};

const { getAuthAppMock, homeAssistantServiceStub } = vi.hoisted(() => ({
  getAuthAppMock: vi.fn(),
  homeAssistantServiceStub: {
    listeners: {
      entities: new Set<(payload: Record<string, unknown> | null) => void>(),
      config: new Set<(payload: Record<string, unknown> | null) => void>(),
      registries: new Set<(payload: unknown) => void>(),
      connection: new Set<
        (payload: { connected: boolean; connection: unknown; reconnecting: boolean }) => void
      >(),
      error: new Set<(payload: { message: string }) => void>(),
    },
    connected: false,
    config: null as Record<string, unknown> | null,
    entities: null as Record<string, unknown> | null,
    user: null as unknown,
    connection: null as unknown,
    areas: [] as Array<{ area_id: string; name: string }>,
    deviceRegistry: [] as Array<{ id: string; area_id?: string | null }>,
    entityRegistry: [] as Array<{ entity_id: string; area_id?: string | null }>,
    addListener: vi.fn(function (
      this: StubHomeAssistantService,
      type: keyof StubListenerMap,
      listener: StubListenerMap[keyof StubListenerMap] extends Set<infer Listener>
        ? Listener
        : never
    ) {
      const listeners = this.listeners[type] as Set<typeof listener>;
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    authenticate: vi.fn(async function (this: StubHomeAssistantService) {
      this.connected = true;
    }),
    disconnect: vi.fn(function (this: StubHomeAssistantService) {
      this.connected = false;
      this.connection = null;
    }),
    isConnected: vi.fn(function (this: StubHomeAssistantService) {
      return this.connected;
    }),
    getConfig: vi.fn(function (this: StubHomeAssistantService) {
      return this.config;
    }),
    getEntities: vi.fn(function (this: StubHomeAssistantService) {
      return this.entities;
    }),
    getUser: vi.fn(function (this: StubHomeAssistantService) {
      return this.user;
    }),
    getAreas: vi.fn(function (this: StubHomeAssistantService) {
      return this.areas;
    }),
    getDeviceRegistry: vi.fn(function (this: StubHomeAssistantService) {
      return this.deviceRegistry;
    }),
    getEntityRegistry: vi.fn(function (this: StubHomeAssistantService) {
      return this.entityRegistry;
    }),
    getConnection: vi.fn(function (this: StubHomeAssistantService) {
      return this.connection;
    }),
    setPanelHass: vi.fn(function (
      this: StubHomeAssistantService,
      hass: {
        states: Record<string, unknown>;
        config: Record<string, unknown>;
        user?: unknown;
        connection?: unknown;
      }
    ) {
      this.connected = true;
      this.config = hass.config;
      this.entities = hass.states;
      this.user = hass.user ?? null;
      this.connection = hass.connection ?? { id: 'panel-connection' };
    }),
    loadRegistries: vi.fn(async () => {}),
  },
}));

vi.mock('../services/home-assistant.service', () => ({
  homeAssistantService: homeAssistantServiceStub,
}));

vi.mock('../features/dashboard', async () => {
  const { useLogout } =
    await vi.importActual<typeof import('../hooks/use-logout')>('../hooks/use-logout');
  const { useStoreWithEqualityFn } =
    await vi.importActual<typeof import('zustand/traditional')>('zustand/traditional');
  const { homeAssistantStore } = await vi.importActual<
    typeof import('../stores/home-assistant-store')
  >('../stores/home-assistant-store');

  return {
    DashboardPage: () => {
      const connecting = useStoreWithEqualityFn(homeAssistantStore, (state) => state.connecting);
      const logout = useLogout();
      return (
        <main>
          {connecting ? 'Connecting to Home Assistant...' : 'dashboard'}
          <button type="button" onClick={logout}>
            Logout
          </button>
        </main>
      );
    },
  };
});

vi.mock('../features/auth/login-page', () => ({
  LoginPage: () => <main>login</main>,
}));

vi.mock('../components/shared/pwa-update-prompt', () => ({
  PwaUpdatePrompt: () => null,
}));

vi.mock('home-assistant-js-websocket', () => ({
  getAuth: getAuthAppMock,
  callService: vi.fn(),
}));

describe('App Home Assistant connection recovery', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await resetAppStores();
    homeyService.setClient(null);
    homeyService.resetSnapshot();
    homeAssistantServiceStub.connected = false;
    homeAssistantServiceStub.config = { location_name: 'Home' };
    homeAssistantServiceStub.entities = {};
    homeAssistantServiceStub.user = { name: 'Test User' };
    homeAssistantServiceStub.connection = { id: 'conn-1' };
    homeAssistantServiceStub.areas = [];
    homeAssistantServiceStub.deviceRegistry = [];
    homeAssistantServiceStub.entityRegistry = [];
    Object.values(homeAssistantServiceStub.listeners).forEach((listeners) => {
      listeners.clear();
    });
    homeAssistantServiceStub.addListener.mockClear();
    homeAssistantServiceStub.disconnect.mockClear();
    homeAssistantServiceStub.authenticate.mockReset();
    homeAssistantServiceStub.authenticate.mockImplementation(async function (
      this: StubHomeAssistantService
    ) {
      this.connected = true;
    });
    homeAssistantServiceStub.setPanelHass.mockClear();
    getAuthAppMock.mockReset();
    getAuthAppMock.mockResolvedValue({
      data: {
        hassUrl: 'http://192.168.68.71:8123',
        clientId: 'http://localhost/',
        expires: Date.now() + 3_600_000,
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        expires_in: 3600,
      },
      wsUrl: 'ws://192.168.68.71:8123/api/websocket',
      accessToken: 'access-token',
      expired: false,
      refreshAccessToken: vi.fn(),
      revoke: vi.fn(),
    });
    window.history.replaceState({}, '', '/');
    window.__NAVET_PANEL__ = undefined;
    window.__NAVET_CONFIG__ = undefined;
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: window,
    });
    resetRuntimeContextForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.__NAVET_PANEL__ = undefined;
    window.__NAVET_CONFIG__ = undefined;
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: window,
    });
    resetRuntimeContextForTests();
  });

  it('starts a connection attempt for a saved authenticated session', async () => {
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledWith({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://192.168.68.71:8123',
      hassUrl: 'http://192.168.68.71:8123',
      auth: expect.any(Object),
      expiresAt: expect.any(Number),
    });
  });

  it('hydrates a saved Homey session without opening a Home Assistant connection', async () => {
    vi.useRealTimers();
    setStoredHomeySession();
    homeyService.setClient({
      setCapabilityValue: vi.fn(),
      loadSnapshot: vi.fn(async () => ({
        connected: true,
        devices: {
          light_1: {
            id: 'light_1',
            name: 'Sofa Lamp',
            class: 'light',
            zone: 'living_room',
            capabilitiesObj: {
              onoff: { value: true },
              dim: { value: 0.4 },
            },
          },
        },
        zones: {
          living_room: { id: 'living_room', name: 'Living Room' },
        },
      })),
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument());
    expect(homeAssistantServiceStub.authenticate).not.toHaveBeenCalled();
    expect(homeyService.getSnapshot()).toMatchObject({
      connected: true,
      devices: {
        light_1: expect.objectContaining({
          name: 'Sofa Lamp',
        }),
      },
    });
  });

  it('falls back to the Home Assistant login when auth bootstrap stalls', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Starting your dashboard...')).toBeInTheDocument();
    expect(screen.queryByText('login')).not.toBeInTheDocument();
    expect(homeAssistantServiceStub.authenticate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTH_SESSION_LOAD_TIMEOUT_MS * 2);
    });

    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.queryByText('Starting your dashboard...')).not.toBeInTheDocument();
  });

  it('completes OAuth callback startup without returning to the URL login form', async () => {
    vi.useRealTimers();
    setNoStoredSession();
    const clientId = `${window.location.origin}/`;
    const state = window.btoa(JSON.stringify({ hassUrl: 'http://192.168.68.71:8123', clientId }));
    window.history.replaceState({}, '', `/?auth_callback=1&code=oauth-code&state=${state}`);

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.queryByText('login')).not.toBeInTheDocument());
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(getAuthAppMock).toHaveBeenCalledWith({
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
    });
    expect(window.location.search).toBe('');
  });

  it('keeps OAuth callback startup ahead of a stale persisted standalone session', async () => {
    vi.useRealTimers();
    const clientId = `${window.location.origin}/`;
    const state = window.btoa(JSON.stringify({ hassUrl: 'http://192.168.68.71:8123', clientId }));
    window.history.replaceState({}, '', `/?auth_callback=1&code=oauth-code&state=${state}`);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          hassUrl: 'http://192.168.68.55:8123',
          clientId,
          expires: Date.now() + 3_600_000,
          refresh_token: 'stale-refresh-token',
          access_token: 'stale-access-token',
          expires_in: 3600,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    getAuthAppMock.mockResolvedValueOnce({
      data: {
        hassUrl: 'http://192.168.68.99:8123',
        clientId,
        expires: Date.now() + 3_600_000,
        refresh_token: 'fresh-refresh-token',
        access_token: 'fresh-access-token',
        expires_in: 3600,
      },
      wsUrl: 'ws://192.168.68.99:8123/api/websocket',
      accessToken: 'fresh-access-token',
      expired: false,
      refreshAccessToken: vi.fn(),
      revoke: vi.fn(),
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.queryByText('login')).not.toBeInTheDocument());
    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(getAuthAppMock).toHaveBeenCalledWith({
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
    });
    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledWith({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://192.168.68.99:8123',
      hassUrl: 'http://192.168.68.99:8123',
      auth: expect.any(Object),
      expiresAt: expect.any(Number),
    });
  });

  it('shows recovery when the saved Home Assistant URL does not connect within the grace period', async () => {
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Connecting to Home Assistant...')).toBeInTheDocument();
    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(CONNECTION_TIMEOUT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    expect(homeAssistantServiceStub.disconnect).toHaveBeenCalled();
  });

  it('returns to login when a saved standalone session becomes invalid', async () => {
    vi.useRealTimers();
    homeAssistantServiceStub.authenticate.mockRejectedValueOnce(
      new Error('Invalid Home Assistant authentication. Sign in again to refresh the session.')
    );
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(screen.getByText('login')).toBeInTheDocument());
    expect(screen.queryByText(/Invalid Home Assistant authentication/i)).not.toBeInTheDocument();
    expect(homeAssistantServiceStub.disconnect).toHaveBeenCalled();
  });

  it('keeps the recovery screen hidden when Home Assistant connects before the grace period expires', async () => {
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByText(/Cannot connect to Home Assistant/)).not.toBeInTheDocument();
  });

  it('retries the saved connection after the grace period recovery appears', async () => {
    homeAssistantServiceStub.authenticate.mockImplementation(() => new Promise(() => {}));
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    const retry = screen.getByRole('button', { name: /retry/i });

    fireEvent.click(retry);

    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledTimes(2);
    expect(homeAssistantServiceStub.authenticate).toHaveBeenLastCalledWith({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://192.168.68.71:8123',
      hassUrl: 'http://192.168.68.71:8123',
      auth: expect.any(Object),
      expiresAt: expect.any(Number),
    });
  });

  it('does not show login reset recovery in add-on ingress', async () => {
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/');
    resetRuntimeContextForTests();
    setNoStoredSession();

    await act(async () => {
      render(<App />);
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(CONNECTION_TIMEOUT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /back to login/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/access token/i)).not.toBeInTheDocument();
  });

  it('reuses the parent Home Assistant frontend connection in ingress before opening a new websocket', async () => {
    vi.useRealTimers();
    setNoStoredSession();
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/');
    resetRuntimeContextForTests();

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

    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: {
        document: parentDocument,
      },
    });

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(homeAssistantServiceStub.setPanelHass).toHaveBeenCalled());
    expect(homeAssistantServiceStub.authenticate).not.toHaveBeenCalled();
    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('recovers from invalid ingress auth by rebuilding the session instead of retrying the stale auth handle', async () => {
    vi.useRealTimers();
    homeAssistantServiceStub.authenticate
      .mockRejectedValueOnce(
        new Error('Invalid Home Assistant authentication. Sign in again to refresh the session.')
      )
      .mockImplementationOnce(async function (this: StubHomeAssistantService) {
        this.connected = true;
      })
      .mockImplementationOnce(async function (this: StubHomeAssistantService) {
        this.connected = true;
      });
    getAuthAppMock.mockResolvedValueOnce({
      data: {
        hassUrl: 'http://192.168.68.71:8123',
        clientId: `${window.location.origin}/`,
        expires: Date.now() + 3_600_000,
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        expires_in: 3600,
      },
      wsUrl: 'ws://192.168.68.71:8123/api/websocket',
      accessToken: 'access-token',
      expired: false,
      refreshAccessToken: vi.fn(),
      revoke: vi.fn(),
    });
    localStorage.setItem(
      'hassTokens',
      JSON.stringify({
        data: {
          hassUrl: 'http://192.168.68.71:8123',
          clientId: `${window.location.origin}/`,
          expires: Date.now() + 3_600_000,
          refresh_token: 'refresh-token',
          access_token: 'access-token',
          expires_in: 3600,
        },
      })
    );
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/');
    resetRuntimeContextForTests();

    await act(async () => {
      render(<App />);
    });

    await waitFor(() => expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledTimes(2));
    const authenticateCalls = homeAssistantServiceStub.authenticate.mock.calls as unknown as Array<
      [Record<string, unknown>]
    >;

    expect(authenticateCalls[0]?.[0]).toMatchObject({
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      auth: expect.any(Object),
    });
    expect(authenticateCalls[1]?.[0]).toMatchObject({
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
    });
    expect(authenticateCalls[1]?.[0]?.auth).toBeUndefined();
    expect(getAuthAppMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText(/Invalid Home Assistant authentication/i)).not.toBeInTheDocument()
    );
  });

  it('keeps Home Assistant local storage when returning to login from recovery', async () => {
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));
    localStorage.setItem('hassTokens', '{"data":"home-assistant-session"}');
    localStorage.setItem('ha_auth_config', '{"url":"http://old.local:8123","token":"token"}');
    localStorage.setItem('ha-dashboard-config', '{"url":"http://old.local:8123","token":"token"}');
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));

    expect(screen.getByText('login')).toBeInTheDocument();
    expect(localStorage.getItem('hassTokens')).toBe('{"data":"home-assistant-session"}');
    expect(localStorage.getItem('ha_auth_config')).toBeNull();
    expect(localStorage.getItem('ha-dashboard-config')).toBeNull();
  });

  it('keeps stale Home Assistant auth errors hidden after logout', async () => {
    vi.useRealTimers();
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    const staleErrorListeners = [...homeAssistantServiceStub.listeners.error];

    fireEvent.click(screen.getByRole('button', { name: /^logout$/i }));

    await waitFor(() => expect(screen.getByText('login')).toBeInTheDocument());

    act(() => {
      staleErrorListeners.forEach((listener) => {
        listener({
          message: 'Invalid Home Assistant authentication. Sign in again to refresh the session.',
        });
      });
    });

    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Home Assistant authentication/i)).not.toBeInTheDocument();
  });

  it('shows a Homey chooser when OAuth session has multiple Homeys but none selected', async () => {
    vi.useRealTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/__navet_auth__/session')) {
        return new Response(null, { status: 204 });
      }

      return new Response(
        JSON.stringify({
          userId: 'user-1',
          homeys: [
            { id: 'homey-1', name: 'Living Room Homey' },
            { id: 'homey-2', name: 'Cabin Homey' },
          ],
          selectedHomeyId: null,
          homeyBaseUrl: null,
          hasActiveHomeySession: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Choose a Homey')).toBeInTheDocument();
    expect(homeAssistantServiceStub.authenticate).not.toHaveBeenCalled();
  });
});

function setAuthenticatedSession() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        hassUrl: 'http://192.168.68.71:8123',
        clientId: 'http://localhost/',
        expires: Date.now() + 3_600_000,
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        expires_in: 3600,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

function setNoStoredSession() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
}

function setStoredHomeySession() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/__navet_auth__/session')) {
      return new Response(null, { status: 204 });
    }

    return new Response(
      JSON.stringify({
        userId: 'user-1',
        homeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
        selectedHomeyId: 'homey-1',
        homeyBaseUrl: 'https://homey.example.com',
        hasActiveHomeySession: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });
}
