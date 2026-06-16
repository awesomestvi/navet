import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import { createHomeAssistantProviderPackageRegistration } from '@navet/provider-homeassistant';
import { createHomeyProviderPackageRegistration } from '@navet/provider-homey';
import { createHubitatProviderPackageRegistration } from '@navet/provider-hubitat';
import { createOpenHABProviderPackageRegistration } from '@navet/provider-openhab';
import { createSmartThingsProviderPackageRegistration } from '@navet/provider-smartthings';
import type { IntegrationProviderRuntimeRegistration } from './provider-runtime-types';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from './services/home-assistant.service';
import { homeAssistantService } from './services/home-assistant.service';
import { homeyService } from './services/homey.service';
import { ensureHomeyApiClientConfigured } from './services/homey-api-client.service';
import { homeyEntityRuntimeService } from './services/homey-entity-runtime.service';
import { homeAssistantStore } from './stores/home-assistant-store';
import type { IntegrationProviderId } from './types/provider';
import { resolveHomeAssistantProxyUrl } from './utils/home-assistant-url';

function getProviderSession(providerId: IntegrationProviderId) {
  return integrationSessionRuntime.getSnapshot().sessions[providerId];
}

const providerPackageRegistrationFactories: Record<
  IntegrationProviderId,
  () => ProviderPackageRegistration
> = {
  home_assistant: () =>
    createHomeAssistantProviderPackageRegistration({
      dependencies: {
        homeAssistantService: {
          callService: async (domain, service, serviceData, target) =>
            homeAssistantService.callService(domain, service, serviceData, target as never),
          signPath: (path, expiresSeconds) => homeAssistantService.signPath(path, expiresSeconds),
          getCameraStreamUrl: (entityId, format) =>
            homeAssistantService.getCameraStreamUrl(entityId, format),
          getCameraStreamPaths: async (entityId) => {
            const paths = await homeAssistantService.getCameraStreamPaths(entityId);
            return {
              ...(paths.hls_path ? { hls_path: paths.hls_path } : {}),
              ...(paths.mjpeg_path ? { mjpeg_path: paths.mjpeg_path } : {}),
            };
          },
          addListener: (event, listener) => homeAssistantService.addListener(event, listener),
          isConnected: () => homeAssistantService.isConnected(),
          getPanelHass: () => homeAssistantService.getPanelHass(),
          getConnection: () => homeAssistantService.getConnection(),
          getEntities: () => homeAssistantService.getEntities(),
          getEntityRegistry: () => homeAssistantService.getEntityRegistry(),
          getConfig: () => homeAssistantService.getConfig(),
          updateLight: (entityId, options) => homeAssistantService.updateLight(entityId, options),
          playMedia: (entityId, media) => homeAssistantService.playMedia(entityId, media),
          browseMediaPlayer: (entityId, media) =>
            homeAssistantService.browseMediaPlayer(entityId, media),
          searchMediaPlayer: (entityId, query, media) =>
            homeAssistantService.searchMediaPlayer(entityId, query, media),
          selectMediaPlayerSource: (entityId, source) =>
            homeAssistantService.selectMediaPlayerSource(entityId, source),
          selectMediaPlayerSoundMode: (entityId, soundMode) =>
            homeAssistantService.selectMediaPlayerSoundMode(entityId, soundMode),
          seekMediaPlayer: (entityId, seekPosition) =>
            homeAssistantService.seekMediaPlayer(entityId, seekPosition),
          clearMediaPlayerPlaylist: (entityId) =>
            homeAssistantService.clearMediaPlayerPlaylist(entityId),
          updateMediaPlayerPower: (entityId, state) =>
            homeAssistantService.updateMediaPlayerPower(entityId, state),
          sendRemoteCommand: (entityId, command) =>
            homeAssistantService.sendRemoteCommand(entityId, command),
          browseMediaSource: (mediaContentId) =>
            homeAssistantService.browseMediaSource(mediaContentId),
          resolveMediaSource: (mediaContentId) =>
            homeAssistantService.resolveMediaSource(mediaContentId),
          getAutomationConfig: (entityId) => homeAssistantService.getAutomationConfig(entityId),
          getCameraCapabilities: async (entityId) =>
            (await homeAssistantService.getCameraCapabilities(entityId)) as Record<string, unknown>,
          enableCameraMotionDetection: (entityId) =>
            homeAssistantService.enableCameraMotionDetection(entityId),
          disableCameraMotionDetection: (entityId) =>
            homeAssistantService.disableCameraMotionDetection(entityId),
          getWebRtcClientConfiguration: async (entityId) =>
            (await homeAssistantService.getWebRtcClientConfiguration(
              entityId
            )) as unknown as Record<string, unknown>,
          subscribeCameraWebRtcOffer: async (entityId, offer, listener) =>
            homeAssistantService.subscribeCameraWebRtcOffer(entityId, offer, (event) => {
              if (
                'answer' in event &&
                typeof event.answer === 'string' &&
                'session_id' in event &&
                typeof event.session_id === 'string'
              ) {
                listener({ answer: event.answer, session_id: event.session_id });
              }
            }),
          addCameraWebRtcCandidate: (entityId, sessionId, candidate) =>
            homeAssistantService.addCameraWebRtcCandidate(entityId, sessionId, candidate),
          createArea: (name) => homeAssistantService.createArea(name),
          updateEntityArea: (entityId, areaId) =>
            homeAssistantService.updateEntityArea(entityId, areaId ?? ''),
          updateEntityName: (entityId, name) =>
            homeAssistantService.updateEntityName(entityId, name ?? ''),
          deleteArea: (areaId) => homeAssistantService.deleteArea(areaId),
        },
        homeAssistantStore: {
          getState: () => {
            const state = homeAssistantStore.getState();
            return {
              connected: state.connected,
              config: state.config,
              entities: state.entities,
              areas: state.areas as HomeAssistantAreaRegistryEntry[],
              deviceRegistry: state.deviceRegistry as HomeAssistantDeviceRegistryEntry[],
              entityRegistry: state.entityRegistry as HomeAssistantEntityRegistryEntry[],
              connect: async (session) => {
                await state.connect(session as never);
              },
              disconnect: async () => {
                state.disconnect();
              },
              syncPanelHass: (bridge) => {
                state.syncPanelHass(bridge as never);
              },
            };
          },
          subscribe: (listener) => homeAssistantStore.subscribe(listener),
        },
        mediaArtworkService: {
          resolveArtwork: async (entityId, attrs, fallbackPicture) =>
            (
              await import('./infrastructure/home-assistant/home-assistant-shared-infrastructure')
            ).mediaArtworkService.resolveArtwork(entityId, attrs ?? {}, fallbackPicture),
        },
        resolveProxyUrl: resolveHomeAssistantProxyUrl,
        cameraMediaService: {
          getPlaybackPlan: async (request) =>
            (
              await import('./infrastructure/home-assistant/home-assistant-camera-infrastructure')
            ).cameraMediaService.getPlaybackPlan(request as never),
        },
        homeAssistantResourceResolver: {
          resolve: async (request) =>
            (
              await import('./infrastructure/home-assistant/home-assistant-shared-infrastructure')
            ).homeAssistantResourceResolver.resolve(request),
        },
      },
      getSession: () => getProviderSession('home_assistant'),
    }),
  homey: () =>
    createHomeyProviderPackageRegistration({
      dependencies: {
        ensureHomeyApiClientConfigured,
        homeyService,
        entityRuntimeService: homeyEntityRuntimeService,
      },
      getSession: () => getProviderSession('homey'),
    }),
  openhab: () =>
    createOpenHABProviderPackageRegistration({
      getSession: () => getProviderSession('openhab'),
    }),
  hubitat: () =>
    createHubitatProviderPackageRegistration({
      getSession: () => getProviderSession('hubitat'),
    }),
  smartthings: () =>
    createSmartThingsProviderPackageRegistration({
      getSession: () => getProviderSession('smartthings'),
    }),
};

var providerPackageRegistrationOverrides:
  | Partial<Record<IntegrationProviderId, ProviderPackageRegistration | null>>
  | undefined;

var providerPackageRegistrations:
  | Partial<Record<IntegrationProviderId, ProviderPackageRegistration>>
  | undefined;

export function getProviderPackageRegistration(
  providerId: IntegrationProviderId
): ProviderPackageRegistration {
  const override = providerPackageRegistrationOverrides?.[providerId];
  if (override) {
    return override;
  }

  if (!providerPackageRegistrations) {
    providerPackageRegistrations = {};
  }

  const existing = providerPackageRegistrations[providerId];
  if (existing) {
    return existing;
  }

  const registration = providerPackageRegistrationFactories[providerId]();
  providerPackageRegistrations[providerId] = registration;
  return registration;
}

export function setProviderPackageRegistrationOverride(
  providerId: IntegrationProviderId,
  registration: ProviderPackageRegistration | null
) {
  if (!providerPackageRegistrationOverrides) {
    providerPackageRegistrationOverrides = {};
  }

  providerPackageRegistrationOverrides[providerId] = registration;

  if (providerPackageRegistrations) {
    delete providerPackageRegistrations[providerId];
  }
}

export function getProviderContractRegistration(
  providerId: IntegrationProviderId
): ProviderContractRegistration {
  return getProviderPackageRegistration(providerId);
}

export function getProviderRuntimeRegistrationEntry(
  providerId: IntegrationProviderId
): IntegrationProviderRuntimeRegistration {
  return getProviderPackageRegistration(providerId).runtimeRegistration;
}
