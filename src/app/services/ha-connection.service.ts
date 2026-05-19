import type {
  Auth,
  Connection,
  HassConfig,
  HassEntities,
  HassUser,
} from 'home-assistant-js-websocket';
import {
  callService as callHassService,
  createConnection,
  createLongLivedTokenAuth,
  ERR_CANNOT_CONNECT,
  ERR_CONNECTION_LOST,
  ERR_HASS_HOST_REQUIRED,
  ERR_INVALID_AUTH,
  ERR_INVALID_HTTPS_TO_HTTP,
  getAuth,
  getUser,
  subscribeConfig,
  subscribeEntities,
} from 'home-assistant-js-websocket';

import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from './home-assistant.service';

export interface HAConnectionEventMap {
  connection: { connected: boolean; connection: Connection | null; reconnecting: boolean };
  error: { message: string };
  config: HassConfig;
  entities: HassEntities;
  registries: {
    areas: HomeAssistantAreaRegistryEntry[];
    devices: HomeAssistantDeviceRegistryEntry[];
    entities: HomeAssistantEntityRegistryEntry[];
  };
}

export type HAConnectionEventType = keyof HAConnectionEventMap;

export interface HomeAssistantConfiguration {
  hassUrl?: string;
  token?: string;
}

/**
 * Manages Home Assistant WebSocket connection, authentication, and reconnection logic.
 * Emits typed events for connection state changes, config updates, and entity subscriptions.
 */
class HAConnectionService {
  private connection: Connection | null = null;
  private config: HassConfig | null = null;
  private entities: HassEntities | null = null;
  private user: HassUser | null = null;
  private connected: boolean = false;
  private listeners: {
    [K in HAConnectionEventType]?: Array<(data: HAConnectionEventMap[K]) => void>;
  } = {};
  private manuallyDisconnected = false;
  private activeConfiguration: HomeAssistantConfiguration | null = null;
  private authenticationAttemptId = 0;

  /**
   * Authenticate and establish connection to Home Assistant
   */
  async authenticate(configuration: HomeAssistantConfiguration): Promise<void> {
    if (!configuration?.hassUrl) {
      throw new Error('Home Assistant URL is required');
    }

    this.activeConfiguration = configuration;
    this.manuallyDisconnected = false;
    const attemptId = ++this.authenticationAttemptId;

    let auth: Auth | undefined;
    let connection: Connection | null = null;

    try {
      if (this.connection) {
        this.connection.close();
        this.connection = null;
      }

      // Long-lived access token
      if (configuration?.token) {
        auth = createLongLivedTokenAuth(configuration.hassUrl, configuration.token);
      } else {
        // Default auth flow
        auth = await getAuth({ hassUrl: configuration.hassUrl });
        if (auth.expired) await auth.refreshAccessToken();
      }

      // Create connection
      connection = await createConnection({ auth, setupRetry: 3 });

      if (attemptId !== this.authenticationAttemptId) {
        connection.close();
        return;
      }

      this.connection = connection;
      this.connected = true;
      this.user = await getUser(connection);

      if (attemptId !== this.authenticationAttemptId || this.connection !== connection) {
        connection.close();
        return;
      }

      // Subscribe to entities
      subscribeEntities(connection, (entities) => {
        if (this.connection !== connection) {
          return;
        }
        this.entities = entities;
        this.notifyListeners('entities', entities);
      });

      // Subscribe to config
      subscribeConfig(connection, (config) => {
        if (this.connection !== connection) {
          return;
        }
        this.config = config;
        this.notifyListeners('config', config);
      });

      // Connection events
      connection.addEventListener('ready', () => {
        if (this.connection !== connection) {
          return;
        }
        this.connected = true;
        this.notifyListeners('connection', {
          connected: true,
          connection,
          reconnecting: false,
        });
      });

      connection.addEventListener('disconnected', () => {
        if (this.connection !== connection) {
          return;
        }
        this.connected = false;
        this.notifyListeners('connection', {
          connected: false,
          connection,
          reconnecting: !this.manuallyDisconnected && Boolean(this.activeConfiguration),
        });
      });

      connection.addEventListener('reconnect-error', (_connection, error) => {
        if (this.connection !== connection) {
          return;
        }
        this.connected = false;
        this.notifyListeners('connection', {
          connected: false,
          connection,
          reconnecting: false,
        });
        this.notifyListeners('error', {
          message: this.getErrorMessage(error),
        });
      });

      // Clear auth query string if present
      if (location.search.includes('auth_callback=1')) {
        history.replaceState(null, '', location.pathname);
      }
    } catch (error) {
      if (attemptId !== this.authenticationAttemptId) {
        return;
      }
      this.handleError(error);
    }
  }

  /**
   * Handle connection errors, translating numeric error codes to messages
   */
  private getErrorMessage(error: unknown): string {
    const errorMessages: Record<number, string> = {
      [ERR_INVALID_AUTH]:
        'Invalid authentication token. Please check your long-lived access token.',
      [ERR_CANNOT_CONNECT]:
        'Cannot connect to Home Assistant. Check the URL and ensure it is reachable.',
      [ERR_CONNECTION_LOST]: 'Connection to Home Assistant was lost.',
      [ERR_HASS_HOST_REQUIRED]: 'Home Assistant host URL is required.',
      [ERR_INVALID_HTTPS_TO_HTTP]: 'Cannot connect to an HTTP server from an HTTPS page.',
    };

    if (typeof error === 'number' && error in errorMessages) {
      return errorMessages[error];
    }

    return error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Failed to connect';
  }

  /**
   * Handle connection errors, translating numeric error codes to messages
   */
  private handleError(error: unknown): never {
    if (typeof error === 'number') {
      throw new Error(this.getErrorMessage(error));
    }

    throw error;
  }

  /**
   * Notify all listeners of a specific typed event
   */
  private notifyListeners<K extends HAConnectionEventType>(
    event: K,
    data: HAConnectionEventMap[K]
  ): void {
    const handlers = this.listeners[event];
    if (!handlers) return;
    for (const handler of handlers) {
      handler(data);
    }
  }

  /**
   * Subscribe to a specific typed event. Returns an unsubscribe function.
   */
  addListener<K extends HAConnectionEventType>(
    event: K,
    callback: (data: HAConnectionEventMap[K]) => void
  ): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Array<(data: HAConnectionEventMap[K]) => void>).push(callback);

    return () => {
      const handlers = this.listeners[event] as
        | Array<(data: HAConnectionEventMap[K]) => void>
        | undefined;
      if (!handlers) return;
      const index = handlers.indexOf(callback);
      if (index !== -1) handlers.splice(index, 1);
    };
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get Home Assistant configuration
   */
  getConfig(): HassConfig | null {
    return this.config;
  }

  /**
   * Get Home Assistant entities
   */
  getEntities(): HassEntities | null {
    return this.entities;
  }

  /**
   * Get Home Assistant user
   */
  getUser(): HassUser | null {
    return this.user;
  }

  /**
   * Get connection object
   */
  getConnection(): Connection | null {
    return this.connection;
  }

  /**
   * Disconnect from Home Assistant
   */
  disconnect(): void {
    this.manuallyDisconnected = true;
    this.authenticationAttemptId += 1;
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.connected = false;
    this.notifyListeners('connection', {
      connected: false,
      connection: null,
      reconnecting: false,
    });
  }

  /**
   * Call a Home Assistant service over the active websocket connection.
   */
  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> = {},
    target?: {
      entity_id?: string | string[];
      area_id?: string | string[];
      device_id?: string | string[];
    }
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Home Assistant is not connected');
    }

    const normalizedServiceData = { ...serviceData };

    // Keep entity_id in service data for broader compatibility
    if (target?.entity_id && normalizedServiceData.entity_id === undefined) {
      normalizedServiceData.entity_id = target.entity_id;
    }
    if (target?.area_id && normalizedServiceData.area_id === undefined) {
      normalizedServiceData.area_id = target.area_id;
    }
    if (target?.device_id && normalizedServiceData.device_id === undefined) {
      normalizedServiceData.device_id = target.device_id;
    }

    await callHassService(this.connection, domain, service, normalizedServiceData, target);
  }
}

export default HAConnectionService;
