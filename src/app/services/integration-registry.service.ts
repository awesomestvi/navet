import type {
  NavetActionIntent,
  NavetProviderContract,
  NavetProviderSnapshot,
  NavetResourceResolveRequest,
} from '@/app/core/navet';
import {
  buildHomeAssistantNavetRooms,
  buildHomeyNavetRooms,
  mapHomeAssistantEntitiesToNavetDevices,
  mapHomeySnapshotToNavetDevices,
} from '@/app/core/navet-mappers';
import type {
  PlatformCameraStream,
  PlatformCameraStreamType,
} from '@/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { IntegrationProviderDefinition, IntegrationProviderId } from '../types/provider';
import { INTEGRATION_PROVIDERS } from '../types/provider';
import { homeAssistantService } from './home-assistant.service';
import { homeyService } from './homey.service';

export interface IntegrationServiceTarget {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
}

export interface IntegrationProviderCapabilities {
  serviceActions: boolean;
  pathSigning: boolean;
  cameraStreams: boolean;
}

export type IntegrationProviderCapability = keyof IntegrationProviderCapabilities;

export interface IntegrationProviderFeatureMatrix {
  rooms: boolean;
  lighting: boolean;
  sensors: boolean;
  climate: boolean;
  mediaControls: boolean;
  mediaBrowse: boolean;
  mediaArtwork: boolean;
  cameraSnapshot: boolean;
  cameraStreams: boolean;
  energyNow: boolean;
  calendar: boolean;
  weather: boolean;
  notifications: boolean;
}

export type IntegrationProviderFeature = keyof IntegrationProviderFeatureMatrix;

export type IntegrationProviderImplementationStatus = 'implemented' | 'planned';

export interface IntegrationProviderAdapter {
  contract: NavetProviderContract;
  provider: IntegrationProviderDefinition;
  implementationStatus: IntegrationProviderImplementationStatus;
  capabilities: IntegrationProviderCapabilities;
  featureMatrix: IntegrationProviderFeatureMatrix;
  callService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: IntegrationServiceTarget
  ) => Promise<void>;
  signPath?: (path: string, expiresSeconds?: number) => Promise<string>;
  getCameraStream?: (
    entityId: string,
    format: PlatformCameraStreamType
  ) => Promise<PlatformCameraStream>;
}

function payloadBoolean(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function resolveActionProviderPayload(intent: NavetActionIntent) {
  const payload = intent.payload ?? {};

  return {
    domain: typeof payload.domain === 'string' ? payload.domain : null,
    service: typeof payload.service === 'string' ? payload.service : null,
    target: payload.target as IntegrationServiceTarget | undefined,
    serviceData:
      payload.serviceData && typeof payload.serviceData === 'object'
        ? (payload.serviceData as Record<string, unknown>)
        : payload,
  };
}

function getHomeAssistantSnapshot(): NavetProviderSnapshot {
  return {
    providerId: 'home_assistant',
    connected: homeAssistantService.isConnected(),
    devices: mapHomeAssistantEntitiesToNavetDevices({
      entities: homeAssistantService.getEntities(),
      areas: homeAssistantService.getAreas(),
      deviceRegistry: homeAssistantService.getDeviceRegistry(),
      entityRegistry: homeAssistantService.getEntityRegistry(),
    }),
    rooms: buildHomeAssistantNavetRooms({
      entities: homeAssistantService.getEntities(),
      areas: homeAssistantService.getAreas(),
      deviceRegistry: homeAssistantService.getDeviceRegistry(),
      entityRegistry: homeAssistantService.getEntityRegistry(),
    }),
  };
}

function getHomeySnapshot(): NavetProviderSnapshot {
  const snapshot = homeyService.getSnapshot();

  return {
    providerId: 'homey',
    connected: snapshot.connected,
    devices: mapHomeySnapshotToNavetDevices(snapshot),
    rooms: buildHomeyNavetRooms(snapshot),
  };
}

async function dispatchHomeAssistantAction(intent: NavetActionIntent) {
  const entityId = intent.targetId.replace(/^home_assistant:/, '');
  const entityDomain = entityId.split('.', 1)[0] || 'homeassistant';
  const payload = intent.payload ?? {};

  switch (intent.actionId) {
    case 'toggle':
      await homeAssistantService.callService(
        entityDomain,
        payloadBoolean(payload, 'state') ? 'turn_on' : 'turn_off',
        {},
        { entity_id: entityId }
      );
      return;
    case 'brightness':
      await homeAssistantService.callService(
        'light',
        'turn_on',
        { brightness_pct: payload.value },
        { entity_id: entityId }
      );
      return;
    case 'color_temperature':
      await homeAssistantService.callService(
        'light',
        'turn_on',
        { kelvin: payload.value },
        { entity_id: entityId }
      );
      return;
    case 'fan_speed':
      await homeAssistantService.callService(
        'fan',
        'set_percentage',
        { percentage: payload.value },
        { entity_id: entityId }
      );
      return;
    case 'service': {
      const { domain, service, target, serviceData } = resolveActionProviderPayload(intent);
      if (!domain || !service) {
        throw new Error('Legacy service actions require domain and service');
      }
      await homeAssistantService.callService(domain, service, serviceData, target);
      return;
    }
    default:
      throw new Error(`Unsupported Home Assistant action: ${intent.actionId}`);
  }
}

async function resolveHomeAssistantResource(
  request: NavetResourceResolveRequest
): Promise<ResolvedPlatformResource> {
  if (request.kind !== 'media_artwork') {
    return {
      id: request.deviceId,
      kind: 'unavailable',
      cacheKey: request.deviceId,
      authStrategy: 'none',
    };
  }

  const { mediaArtworkService } = await import(
    '@/app/infrastructure/home-assistant/home-assistant-infrastructure'
  );

  return mediaArtworkService.resolveArtwork(
    request.deviceId.replace(/^home_assistant:/, ''),
    request.attrs ?? {},
    request.fallbackPicture
  );
}

const CAPABILITY_MESSAGES: Record<IntegrationProviderCapability, string> = {
  serviceActions: 'Service actions are not implemented yet',
  pathSigning: 'Path signing is not implemented yet',
  cameraStreams: 'Camera streams are not implemented yet',
};

const FEATURE_MESSAGES: Record<IntegrationProviderFeature, string> = {
  rooms: 'Room aggregation is not implemented yet',
  lighting: 'Lighting support is not implemented yet',
  sensors: 'Sensor support is not implemented yet',
  climate: 'Climate support is not implemented yet',
  mediaControls: 'Media controls are not implemented yet',
  mediaBrowse: 'Media browsing is not implemented yet',
  mediaArtwork: 'Media artwork is not implemented yet',
  cameraSnapshot: 'Camera snapshots are not implemented yet',
  cameraStreams: 'Camera streams are not implemented yet',
  energyNow: 'Energy dashboards are not implemented yet',
  calendar: 'Calendar support is not implemented yet',
  weather: 'Weather support is not implemented yet',
  notifications: 'Notifications are not implemented yet',
};

function createUnsupportedProviderAdapter(
  providerId: Exclude<IntegrationProviderId, 'home_assistant'>
): IntegrationProviderAdapter {
  const provider = INTEGRATION_PROVIDERS[providerId];

  return {
    contract: {
      providerId,
      getSnapshot: () => ({
        providerId,
        connected: false,
        devices: [],
        rooms: [],
      }),
      dispatchAction: async () => {
        throw new Error(`${provider.label} actions are not implemented yet`);
      },
    },
    provider,
    implementationStatus: 'planned',
    capabilities: {
      serviceActions: false,
      pathSigning: false,
      cameraStreams: false,
    },
    featureMatrix: {
      rooms: false,
      lighting: false,
      sensors: false,
      climate: false,
      mediaControls: false,
      mediaBrowse: false,
      mediaArtwork: false,
      cameraSnapshot: false,
      cameraStreams: false,
      energyNow: false,
      calendar: false,
      weather: false,
      notifications: false,
    },
  };
}

const ADAPTERS: Record<IntegrationProviderId, IntegrationProviderAdapter> = {
  home_assistant: {
    contract: {
      providerId: 'home_assistant',
      getSnapshot: getHomeAssistantSnapshot,
      subscribeSnapshot: (listener) => {
        const unsubscribers = [
          homeAssistantService.addListener('entities', listener),
          homeAssistantService.addListener('registries', listener),
          homeAssistantService.addListener('connection', listener),
        ];

        return () => {
          for (const unsubscribe of unsubscribers) {
            unsubscribe();
          }
        };
      },
      dispatchAction: dispatchHomeAssistantAction,
      resolveResource: resolveHomeAssistantResource,
    },
    provider: INTEGRATION_PROVIDERS.home_assistant,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
      pathSigning: true,
      cameraStreams: true,
    },
    featureMatrix: {
      rooms: true,
      lighting: true,
      sensors: true,
      climate: true,
      mediaControls: true,
      mediaBrowse: true,
      mediaArtwork: true,
      cameraSnapshot: true,
      cameraStreams: true,
      energyNow: true,
      calendar: true,
      weather: true,
      notifications: true,
    },
    callService: async (domain, service, serviceData = {}, target) =>
      homeAssistantService.callService(domain, service, serviceData, target),
    signPath: async (path, expiresSeconds) => {
      const signed = await homeAssistantService.signPath(path, expiresSeconds);
      return signed.path;
    },
    getCameraStream: async (entityId, format) =>
      await homeAssistantService.getCameraStreamUrl(entityId, format),
  },
  homey: {
    contract: {
      providerId: 'homey',
      getSnapshot: getHomeySnapshot,
      subscribeSnapshot: (listener) => homeyService.subscribe(() => listener()),
      dispatchAction: async (intent) => {
        const entityId = intent.targetId.replace(/^homey:/, '');
        const target = { entity_id: entityId };
        const payload = intent.payload ?? {};

        switch (intent.actionId) {
          case 'toggle':
            await homeyService.callService(
              'switch',
              payloadBoolean(payload, 'state') ? 'turn_on' : 'turn_off',
              {},
              target
            );
            return;
          case 'brightness':
            await homeyService.callService(
              'light',
              'turn_on',
              { brightness_pct: payload.value },
              target
            );
            return;
          case 'color_temperature':
            await homeyService.callService('light', 'turn_on', { kelvin: payload.value }, target);
            return;
          case 'fan_speed':
            await homeyService.callService(
              'fan',
              'set_percentage',
              { percentage: payload.value },
              target
            );
            return;
          case 'service': {
            const {
              domain,
              service,
              target: legacyTarget,
              serviceData,
            } = resolveActionProviderPayload(intent);
            if (!domain || !service) {
              throw new Error('Legacy service actions require domain and service');
            }
            await homeyService.callService(domain, service, serviceData, legacyTarget);
            return;
          }
          default:
            throw new Error(`Unsupported Homey action: ${intent.actionId}`);
        }
      },
      resolveResource: (request) => ({
        id: request.deviceId,
        kind: 'unavailable',
        cacheKey: request.deviceId,
        authStrategy: 'none',
      }),
    },
    provider: INTEGRATION_PROVIDERS.homey,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
      pathSigning: false,
      cameraStreams: false,
    },
    featureMatrix: {
      rooms: true,
      lighting: true,
      sensors: true,
      climate: false,
      mediaControls: false,
      mediaBrowse: false,
      mediaArtwork: false,
      cameraSnapshot: false,
      cameraStreams: false,
      energyNow: false,
      calendar: false,
      weather: false,
      notifications: false,
    },
    callService: async (domain, service, serviceData = {}, target) =>
      await homeyService.callService(domain, service, serviceData, target),
  },
  openhab: createUnsupportedProviderAdapter('openhab'),
};

export function getIntegrationProviderAdapter(
  providerId: IntegrationProviderId
): IntegrationProviderAdapter {
  return ADAPTERS[providerId];
}

export function getIntegrationProviderContract(
  providerId: IntegrationProviderId
): NavetProviderContract {
  return getIntegrationProviderAdapter(providerId).contract;
}

export function createMissingIntegrationCapabilityError(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): Error {
  return new Error(`${CAPABILITY_MESSAGES[capability]} for provider ${adapter.provider.label}`);
}

export function hasIntegrationProviderCapability(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): boolean {
  return adapter.capabilities[capability];
}

export function createMissingIntegrationFeatureError(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): Error {
  return new Error(`${FEATURE_MESSAGES[feature]} for provider ${adapter.provider.label}`);
}

export function hasIntegrationProviderFeature(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): boolean {
  return adapter.featureMatrix[feature];
}

export function requireIntegrationProviderCapability(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): void {
  if (!hasIntegrationProviderCapability(adapter, capability)) {
    throw createMissingIntegrationCapabilityError(adapter, capability);
  }
}

export function requireIntegrationProviderFeature(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): void {
  if (!hasIntegrationProviderFeature(adapter, feature)) {
    throw createMissingIntegrationFeatureError(adapter, feature);
  }
}

export function getIntegrationProviderFeatureMatrix(
  providerId: IntegrationProviderId
): IntegrationProviderFeatureMatrix {
  return getIntegrationProviderAdapter(providerId).featureMatrix;
}

export function listAvailableIntegrationProviders(): IntegrationProviderDefinition[] {
  return listIntegrationProviderAdapters().map((adapter) => adapter.provider);
}

export function listImplementedIntegrationProviders(): IntegrationProviderDefinition[] {
  return listIntegrationProviderAdapters()
    .filter((adapter) => adapter.implementationStatus === 'implemented')
    .map((adapter) => adapter.provider);
}

export function listIntegrationProviderAdapters(): IntegrationProviderAdapter[] {
  return Object.values(ADAPTERS);
}
