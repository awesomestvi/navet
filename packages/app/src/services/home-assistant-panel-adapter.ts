import type {
  Connection,
  HassConfig,
  HassEntities,
  HassUser,
  MessageBase,
} from 'home-assistant-js-websocket';

import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from './home-assistant.service';

export interface HomeAssistantPanelHass {
  states: HassEntities;
  config: HassConfig;
  user?: HassUser;
  connection?: Connection;
  shell?: HomeAssistantPanelShellBridge;
  callService: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: {
      entity_id?: string | string[];
      area_id?: string | string[];
      device_id?: string | string[];
    }
  ) => Promise<unknown>;
  callApi?: <T = unknown>(
    method: string,
    path: string,
    parameters?: Record<string, unknown>
  ) => Promise<T>;
  callWS: <T = unknown>(message: Record<string, unknown>) => Promise<T>;
}

export interface HomeAssistantPanelShellBridge {
  canToggleKiosk: boolean;
  canOpenSidebar: boolean;
  canNavigateHome: boolean;
  connect: (listener?: () => void) => void;
  disconnect: () => void;
  isKioskEnabled: () => boolean | null;
  setHomeAssistantKioskEnabled: (enabled: boolean) => Promise<boolean>;
  openHomeAssistantSidebar: () => Promise<boolean>;
  navigateToHomeAssistantHome: () => Promise<boolean>;
}

export class HomeAssistantPanelAdapter {
  private hass: HomeAssistantPanelHass;

  constructor(hass: HomeAssistantPanelHass) {
    this.hass = hass;
  }

  update(hass: HomeAssistantPanelHass): void {
    this.hass = hass;
  }

  getHass(): HomeAssistantPanelHass {
    return this.hass;
  }

  getConfig(): HassConfig {
    return this.hass.config;
  }

  getEntities(): HassEntities {
    return this.hass.states;
  }

  getUser(): HassUser | null {
    return this.hass.user ?? null;
  }

  getConnection(): Connection {
    return {
      sendMessagePromise: (message: Record<string, unknown>) => this.hass.callWS(message),
      subscribeMessage: <Result>(
        callback: (result: Result) => void,
        subscribeMessage: MessageBase,
        options?: { resubscribe?: boolean; preCheck?: () => boolean | Promise<boolean> }
      ) => {
        if (this.hass.connection?.subscribeMessage) {
          return this.hass.connection.subscribeMessage(callback, subscribeMessage, options);
        }

        return Promise.reject(new Error('Home Assistant panel connection cannot subscribe'));
      },
    } as unknown as Connection;
  }

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
    const normalizedServiceData = { ...serviceData };

    if (target?.entity_id && normalizedServiceData.entity_id === undefined) {
      normalizedServiceData.entity_id = target.entity_id;
    }
    if (target?.area_id && normalizedServiceData.area_id === undefined) {
      normalizedServiceData.area_id = target.area_id;
    }
    if (target?.device_id && normalizedServiceData.device_id === undefined) {
      normalizedServiceData.device_id = target.device_id;
    }

    await this.hass.callService(domain, service, normalizedServiceData, target);
  }

  async callApi<T = unknown>(
    method: string,
    path: string,
    parameters?: Record<string, unknown>
  ): Promise<T> {
    const normalizedPath = path.replace(/^\/?api\//, '').replace(/^\//, '');
    if (this.hass.callApi) {
      return await this.hass.callApi<T>(method, normalizedPath, parameters);
    }

    const normalizedMethod = method.toUpperCase();
    const hasBody =
      parameters !== undefined && normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';
    const response = await fetch(`/api/${normalizedPath}`, {
      method: normalizedMethod,
      credentials: 'same-origin',
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      ...(hasBody ? { body: JSON.stringify(parameters) } : {}),
    });

    if (!response.ok) {
      throw new Error(`Home Assistant API request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async saveAutomationConfig(configKey: string, config: Record<string, unknown>): Promise<void> {
    await this.callApi('POST', `config/automation/config/${encodeURIComponent(configKey)}`, config);
  }

  async loadRegistries(): Promise<{
    areas: HomeAssistantAreaRegistryEntry[];
    devices: HomeAssistantDeviceRegistryEntry[];
    entities: HomeAssistantEntityRegistryEntry[];
  }> {
    const [areas, devices, entities] = await Promise.all([
      this.hass.callWS<HomeAssistantAreaRegistryEntry[]>({ type: 'config/area_registry/list' }),
      this.hass.callWS<HomeAssistantDeviceRegistryEntry[]>({ type: 'config/device_registry/list' }),
      this.hass.callWS<HomeAssistantEntityRegistryEntry[]>({ type: 'config/entity_registry/list' }),
    ]);

    return { areas, devices, entities };
  }
}
