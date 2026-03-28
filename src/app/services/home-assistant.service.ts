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

export interface HomeAssistantConfiguration {
  hassUrl?: string;
  token?: string;
}

export interface HomeAssistantAreaRegistryEntry {
  area_id: string;
  name: string;
}

export interface HomeAssistantDeviceRegistryEntry {
  id: string;
  area_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
}

export interface HomeAssistantEntityRegistryEntry {
  entity_id: string;
  area_id?: string | null;
  device_id?: string | null;
  name?: string | null;
  original_name?: string | null;
}

interface CallServiceTarget {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
}

export interface HAServiceEventMap {
  entities: HassEntities;
  config: HassConfig;
  registries: {
    areas: HomeAssistantAreaRegistryEntry[];
    devices: HomeAssistantDeviceRegistryEntry[];
    entities: HomeAssistantEntityRegistryEntry[];
  };
  connection: { connected: boolean; connection: Connection | null };
}

export type HAServiceEventType = keyof HAServiceEventMap;

class HomeAssistantService {
  private connection: Connection | null = null;
  private config: HassConfig | null = null;
  private entities: HassEntities | null = null;
  private user: HassUser | null = null;
  private areas: HomeAssistantAreaRegistryEntry[] = [];
  private deviceRegistry: HomeAssistantDeviceRegistryEntry[] = [];
  private entityRegistry: HomeAssistantEntityRegistryEntry[] = [];
  private connected: boolean = false;
  private listeners: {
    [K in HAServiceEventType]?: Array<(data: HAServiceEventMap[K]) => void>;
  } = {};
  private registryLoadInProgress = false;
  private pendingRegistryLoad = false;

  /**
   * Authenticate and establish connection to Home Assistant
   */
  async authenticate(configuration: HomeAssistantConfiguration): Promise<void> {
    if (!configuration?.hassUrl) {
      throw new Error('Home Assistant URL is required');
    }

    let auth: Auth | undefined;

    try {
      // Long-lived access token
      if (configuration?.token) {
        auth = createLongLivedTokenAuth(configuration.hassUrl, configuration.token);
      } else {
        // Default auth flow
        auth = await getAuth({ hassUrl: configuration.hassUrl });
        if (auth.expired) await auth.refreshAccessToken();
      }

      // Create connection
      this.connection = await createConnection({ auth });
      this.connected = true;
      this.user = await getUser(this.connection);

      await this.loadRegistries();

      // Subscribe to entities
      subscribeEntities(this.connection, (entities) => {
        this.entities = entities;
        this.notifyListeners('entities', entities);
      });

      // Subscribe to config
      subscribeConfig(this.connection, (config) => {
        this.config = config;
        this.notifyListeners('config', config);
      });

      // Connection events
      this.connection.addEventListener('ready', () => {
        this.connected = true;
        this.notifyListeners('connection', { connected: true, connection: this.connection });
      });

      this.connection.addEventListener('disconnected', () => {
        this.connected = false;
        this.notifyListeners('connection', { connected: false, connection: this.connection });
      });

      this.connection.addEventListener('reconnect-error', () => {
        this.connected = false;
        this.notifyListeners('connection', { connected: false, connection: this.connection });
      });

      // Clear auth query string if present
      if (location.search.includes('auth_callback=1')) {
        history.replaceState(null, '', location.pathname);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private async loadRegistries(): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.registryLoadInProgress) {
      this.pendingRegistryLoad = true;
      return;
    }

    this.registryLoadInProgress = true;
    this.pendingRegistryLoad = false;

    try {
      const [areas, devices, entities] = await Promise.all([
        this.connection.sendMessagePromise({
          type: 'config/area_registry/list',
        }) as Promise<HomeAssistantAreaRegistryEntry[]>,
        this.connection.sendMessagePromise({
          type: 'config/device_registry/list',
        }) as Promise<HomeAssistantDeviceRegistryEntry[]>,
        this.connection.sendMessagePromise({
          type: 'config/entity_registry/list',
        }) as Promise<HomeAssistantEntityRegistryEntry[]>,
      ]);

      this.areas = areas;
      this.deviceRegistry = devices;
      this.entityRegistry = entities;
      this.notifyListeners('registries', { areas, devices, entities });
    } catch {
      this.areas = [];
      this.deviceRegistry = [];
      this.entityRegistry = [];
    } finally {
      this.registryLoadInProgress = false;
      if (this.pendingRegistryLoad) {
        void this.loadRegistries();
      }
    }
  }

  /**
   * Handle connection errors, translating numeric error codes to messages
   */
  private handleError(error: unknown): never {
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
      throw new Error(errorMessages[error]);
    }

    throw error;
  }

  /**
   * Notify all listeners of a specific event with its typed data
   */
  private notifyListeners<K extends HAServiceEventType>(
    event: K,
    data: HAServiceEventMap[K]
  ): void {
    const handlers = this.listeners[event];
    if (!handlers) return;
    for (const handler of handlers) {
      handler(data);
    }
  }

  /**
   * Subscribe to a specific typed HA service event.
   * Returns an unsubscribe function.
   */
  addListener<K extends HAServiceEventType>(
    event: K,
    callback: (data: HAServiceEventMap[K]) => void
  ): () => void {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Array<(data: HAServiceEventMap[K]) => void>).push(callback);

    return () => {
      const handlers = this.listeners[event] as
        | Array<(data: HAServiceEventMap[K]) => void>
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

  getAreas(): HomeAssistantAreaRegistryEntry[] {
    return this.areas;
  }

  getUser(): HassUser | null {
    return this.user;
  }

  getDeviceRegistry(): HomeAssistantDeviceRegistryEntry[] {
    return this.deviceRegistry;
  }

  getEntityRegistry(): HomeAssistantEntityRegistryEntry[] {
    return this.entityRegistry;
  }

  /**
   * Get connection object
   */
  getConnection(): Connection | null {
    return this.connection;
  }

  /**
   * Call a Home Assistant service over the active websocket connection.
   */
  async callService(
    domain: string,
    service: string,
    serviceData: Record<string, unknown> = {},
    target?: CallServiceTarget
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Home Assistant is not connected');
    }

    const normalizedServiceData = { ...serviceData };

    // Keep entity_id in service data for broader compatibility with integrations and older setups.
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

  async updateEntityArea(entityId: string, areaId: string | null): Promise<void> {
    if (!this.connection) {
      throw new Error('Home Assistant is not connected');
    }

    await this.connection.sendMessagePromise({
      type: 'config/entity_registry/update',
      entity_id: entityId,
      area_id: areaId,
    });

    await this.loadRegistries();
  }

  /**
   * Update a light entity using Home Assistant light services.
   */
  async updateLight(
    entityId: string,
    options: {
      state?: 'on' | 'off';
      brightnessPct?: number;
      kelvin?: number;
      rgbColor?: [number, number, number];
      hsColor?: [number, number];
      xyColor?: [number, number];
    }
  ): Promise<void> {
    const { state = 'on', brightnessPct, kelvin, rgbColor, hsColor, xyColor } = options;

    if (state === 'off') {
      await this.callService('light', 'turn_off', {}, { entity_id: entityId });
      return;
    }

    const serviceData: Record<string, unknown> = {};
    if (typeof brightnessPct === 'number') {
      serviceData.brightness_pct = Math.max(1, Math.min(100, Math.round(brightnessPct)));
    }
    if (typeof kelvin === 'number') {
      serviceData.color_temp_kelvin = Math.max(2000, Math.min(6500, Math.round(kelvin)));
    }
    if (rgbColor) {
      serviceData.rgb_color = rgbColor;
    }
    if (hsColor) {
      serviceData.hs_color = [
        Math.max(0, Math.min(360, hsColor[0])),
        Math.max(0, Math.min(100, hsColor[1])),
      ];
    }
    if (xyColor) {
      serviceData.xy_color = [
        Math.max(0, Math.min(1, xyColor[0])),
        Math.max(0, Math.min(1, xyColor[1])),
      ];
    }

    await this.callService('light', 'turn_on', serviceData, { entity_id: entityId });
  }

  /**
   * Update a switch entity using Home Assistant switch services.
   */
  async updateSwitch(entityId: string, state: 'on' | 'off'): Promise<void> {
    await this.callService(
      'switch',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entityId }
    );
  }

  async updateMediaPlayerPlayback(
    entityId: string,
    action: 'toggle' | 'play' | 'pause' | 'previous' | 'next'
  ): Promise<void> {
    const service =
      action === 'toggle'
        ? 'media_play_pause'
        : action === 'play'
          ? 'media_play'
          : action === 'pause'
            ? 'media_pause'
            : action === 'previous'
              ? 'media_previous_track'
              : 'media_next_track';

    await this.callService('media_player', service, {}, { entity_id: entityId });
  }

  async setMediaPlayerVolume(entityId: string, volumePct: number): Promise<void> {
    const volumeLevel = Math.max(0, Math.min(1, volumePct / 100));
    await this.callService(
      'media_player',
      'volume_set',
      { volume_level: volumeLevel },
      { entity_id: entityId }
    );
  }

  async setMediaPlayerMute(entityId: string, isMuted: boolean): Promise<void> {
    await this.callService(
      'media_player',
      'volume_mute',
      { is_volume_muted: isMuted },
      { entity_id: entityId }
    );
  }

  async joinMediaPlayers(entityId: string, memberEntityIds: string[]): Promise<void> {
    await this.callService(
      'media_player',
      'join',
      { group_members: memberEntityIds },
      { entity_id: entityId }
    );
  }

  async unjoinMediaPlayer(entityId: string): Promise<void> {
    await this.callService('media_player', 'unjoin', {}, { entity_id: entityId });
  }

  /**
   * Turn a camera entity on or off.
   */
  async updateCamera(entityId: string, state: 'on' | 'off'): Promise<void> {
    await this.callService(
      'camera',
      state === 'on' ? 'turn_on' : 'turn_off',
      {},
      { entity_id: entityId }
    );
  }

  /**
   * Close the connection
   */
  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.connected = false;
      this.user = null;
      this.areas = [];
      this.deviceRegistry = [];
      this.entityRegistry = [];
      this.notifyListeners('connection', { connected: false, connection: null });
    }
  }
}

export const homeAssistantService = new HomeAssistantService();
