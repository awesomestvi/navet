import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';
import App from '../App';
import { useAuthStore } from '../stores/auth-store';

const CONNECTION_TIMEOUT_MESSAGE =
  'Cannot connect to Home Assistant. Check the saved URL and update it if your Home Assistant address changed.';

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
};

const { homeAssistantServiceStub } = vi.hoisted(() => ({
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
    loadRegistries: vi.fn(async () => {}),
  },
}));

vi.mock('../services/home-assistant.service', () => ({
  homeAssistantService: homeAssistantServiceStub,
}));

vi.mock('../features/dashboard', async () => {
  const { useStoreWithEqualityFn } =
    await vi.importActual<typeof import('zustand/traditional')>('zustand/traditional');
  const { homeAssistantStore } = await vi.importActual<
    typeof import('../stores/home-assistant-store')
  >('../stores/home-assistant-store');

  return {
    DashboardPage: () => {
      const connecting = useStoreWithEqualityFn(homeAssistantStore, (state) => state.connecting);
      return <main>{connecting ? 'Connecting to Home Assistant...' : 'dashboard'}</main>;
    },
  };
});

vi.mock('../features/auth/login-page', () => ({
  LoginPage: () => <main>login</main>,
}));

vi.mock('../components/shared/pwa-update-prompt', () => ({
  PwaUpdatePrompt: () => null,
}));

describe('App Home Assistant connection recovery', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await resetAppStores();
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts a connection attempt for a saved authenticated session', async () => {
    setAuthenticatedSession();

    await act(async () => {
      render(<App />);
    });

    expect(homeAssistantServiceStub.authenticate).toHaveBeenCalledWith({
      hassUrl: 'http://192.168.68.71:8123',
      token: 'token',
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
      hassUrl: 'http://192.168.68.71:8123',
      token: 'token',
    });
  });
});

function setAuthenticatedSession() {
  useAuthStore.setState({
    isAuthenticated: true,
    config: {
      url: 'http://192.168.68.71:8123',
      token: 'token',
    },
  });
}
