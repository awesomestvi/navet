import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import type { SmartHomeProviderAdapter } from '@navet/core/provider-contract';
import {
  createHomeAssistantContractAdapter,
  createHomeAssistantProviderContract,
} from '@navet/provider-homeassistant/homeassistant-adapter';
import { configureHomeAssistantServiceBridge } from '@navet/provider-homeassistant/homeassistant-service-bridge';
import {
  createHomeyContractAdapter,
  createHomeyProviderContract,
} from '@navet/provider-homey/homey-adapter';
import { configureHomeyBridge } from '@navet/provider-homey/homey-bridge';
import {
  createHubitatContractAdapter,
  createHubitatProviderContract,
} from '@navet/provider-hubitat/hubitat-adapter';
import {
  createOpenHABContractAdapter,
  createOpenHABProviderContract,
} from '@navet/provider-openhab/openhab-adapter';
import {
  createSmartThingsContractAdapter,
  createSmartThingsProviderContract,
} from '@navet/provider-smartthings/smartthings-adapter';
import {
  cameraMediaService,
  homeAssistantResourceResolver,
  mediaArtworkService,
} from './infrastructure/home-assistant/home-assistant-infrastructure';
import type { NavetProviderContract } from './provider-contract';
import { homeAssistantService } from './services/home-assistant.service';
import { homeyService } from './services/homey.service';
import { ensureHomeyApiClientConfigured } from './services/homey-api-client.service';
import { homeyEntityRuntimeService } from './services/homey-entity-runtime.service';
import { homeAssistantStore } from './stores/home-assistant-store';
import type { IntegrationProviderId } from './types/provider';
import { resolveHomeAssistantProxyUrl } from './utils/home-assistant-url';

interface HomeAssistantBrowseNode {
  title?: string;
  media_class?: string;
  media_content_id?: string;
  media_content_type?: string;
  children?: HomeAssistantBrowseNode[];
  can_expand?: boolean;
  can_play?: boolean;
  thumbnail?: string | null;
}

function mapHomeAssistantBrowseResult(result: HomeAssistantBrowseNode): {
  title: string;
  mediaClass?: string;
  mediaContentId?: string;
  mediaContentType?: string;
  children?: ReturnType<typeof mapHomeAssistantBrowseResult>[];
  canExpand?: boolean;
  canPlay?: boolean;
  thumbnail?: string | null;
} {
  return {
    title: result.title ?? '',
    mediaClass: result.media_class,
    mediaContentId: result.media_content_id,
    mediaContentType: result.media_content_type,
    children: result.children?.map(mapHomeAssistantBrowseResult),
    canExpand: result.can_expand,
    canPlay: result.can_play,
    thumbnail: result.thumbnail ?? null,
  };
}

function getProviderSession(providerId: IntegrationProviderId) {
  return integrationSessionRuntime.getSnapshot().sessions[providerId];
}

function configureProviderBridges() {
  configureHomeAssistantServiceBridge({
    callService: (domain, service, serviceData, target) =>
      homeAssistantService.callService(domain, service, serviceData, target),
    signPath: (path, expiresSeconds) => homeAssistantService.signPath(path, expiresSeconds),
    getCameraStreamUrl: (entityId, format) =>
      homeAssistantService.getCameraStreamUrl(entityId, format),
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
      homeAssistantService
        .browseMediaPlayer(entityId, media)
        .then((result) => mapHomeAssistantBrowseResult(result)),
    searchMediaPlayer: (entityId, query, media) =>
      homeAssistantService
        .searchMediaPlayer(entityId, query, media)
        .then((result) => mapHomeAssistantBrowseResult(result)),
    selectMediaPlayerSource: (entityId, source) =>
      homeAssistantService.selectMediaPlayerSource(entityId, source),
    selectMediaPlayerSoundMode: (entityId, soundMode) =>
      homeAssistantService.selectMediaPlayerSoundMode(entityId, soundMode),
    seekMediaPlayer: (entityId, seekPosition) =>
      homeAssistantService.seekMediaPlayer(entityId, seekPosition),
    clearMediaPlayerPlaylist: (entityId) => homeAssistantService.clearMediaPlayerPlaylist(entityId),
    updateMediaPlayerPower: (entityId, state) =>
      homeAssistantService.updateMediaPlayerPower(entityId, state),
    sendRemoteCommand: (entityId, command) =>
      homeAssistantService.sendRemoteCommand(entityId, command),
    browseMediaSource: (mediaContentId) =>
      homeAssistantService.browseMediaSource(mediaContentId ?? ''),
    resolveMediaSource: (mediaContentId) => homeAssistantService.resolveMediaSource(mediaContentId),
    getAutomationConfig: (entityId) => homeAssistantService.getAutomationConfig(entityId),
    getCameraCapabilities: (entityId) =>
      homeAssistantService.getCameraCapabilities(entityId) as Promise<Record<string, unknown>>,
    enableCameraMotionDetection: (entityId) =>
      homeAssistantService.enableCameraMotionDetection(entityId),
    disableCameraMotionDetection: (entityId) =>
      homeAssistantService.disableCameraMotionDetection(entityId),
    getWebRtcClientConfiguration: (entityId) =>
      homeAssistantService.getWebRtcClientConfiguration(entityId) as unknown as Promise<
        Record<string, unknown>
      >,
    subscribeCameraWebRtcOffer: (entityId, offer, listener) =>
      homeAssistantService.subscribeCameraWebRtcOffer(
        entityId,
        offer,
        listener as (event: {
          type: 'session' | 'answer' | 'candidate' | 'error';
          answer?: string;
          session_id?: string;
          candidate?: RTCIceCandidateInit;
          code?: string;
          message?: string;
        }) => void
      ),
    addCameraWebRtcCandidate: (entityId, sessionId, candidate) =>
      homeAssistantService.addCameraWebRtcCandidate(entityId, sessionId, candidate),
    createArea: (name) => homeAssistantService.createArea(name),
    updateEntityArea: (entityId, areaId) => homeAssistantService.updateEntityArea(entityId, areaId),
    updateEntityName: (entityId, name) =>
      homeAssistantService.updateEntityName(entityId, name ?? ''),
    deleteArea: (areaId) => homeAssistantService.deleteArea(areaId),
    resolveArtwork: (entityId, attrs, fallbackPicture) =>
      mediaArtworkService.resolveArtwork(entityId, attrs ?? {}, fallbackPicture),
    resolveProxyUrl: (resourceUrl, hassUrl, options) =>
      resolveHomeAssistantProxyUrl(resourceUrl, hassUrl, options),
    getCameraPlaybackPlan: (request) =>
      cameraMediaService.getPlaybackPlan(
        request as Parameters<typeof cameraMediaService.getPlaybackPlan>[0]
      ),
    resolveCameraStreamResource: (entityId, stream, rawPath) =>
      homeAssistantResourceResolver.resolve({
        kind: 'camera_stream',
        entityId,
        stream,
        rawPath,
      }),
    getStoreState: () => ({
      ...homeAssistantStore.getState(),
      disconnect: async () => {
        homeAssistantStore.getState().disconnect();
      },
    }),
    subscribeStore: (listener) => homeAssistantStore.subscribe(listener),
  });

  configureHomeyBridge({
    ensureConfigured: ensureHomeyApiClientConfigured,
    getSnapshot: () => homeyService.getSnapshot(),
    loadSnapshot: () => homeyService.loadSnapshot(),
    replaceSnapshot: (snapshot) => homeyService.replaceSnapshot(snapshot),
    resetSnapshot: () => homeyService.resetSnapshot(),
    subscribe: (listener) => homeyService.subscribe(() => listener()),
    callService: (domain, service, serviceData, target) =>
      homeyService.callService(domain, service, serviceData, target),
    entityRuntimeService: homeyEntityRuntimeService,
  });
}

const providerContractRegistrationFactories: Record<
  IntegrationProviderId,
  () => ProviderContractRegistration
> = {
  home_assistant: () => {
    configureProviderBridges();
    const contract = createHomeAssistantProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeAssistantContractAdapter(contract, {
        getSession: () => getProviderSession('home_assistant'),
      }),
    };
  },
  homey: () => {
    configureProviderBridges();
    const contract = createHomeyProviderContract();

    return {
      contract,
      providerContractAdapter: createHomeyContractAdapter(contract, {
        getSession: () => getProviderSession('homey'),
      }),
    };
  },
  openhab: () => {
    const contract = createOpenHABProviderContract();

    return {
      contract,
      providerContractAdapter: createOpenHABContractAdapter(contract, {
        getSession: () => getProviderSession('openhab'),
      }),
    };
  },
  hubitat: () => {
    const contract = createHubitatProviderContract();

    return {
      contract,
      providerContractAdapter: createHubitatContractAdapter(contract, {
        getSession: () => getProviderSession('hubitat'),
      }),
    };
  },
  smartthings: () => {
    const contract = createSmartThingsProviderContract();

    return {
      contract,
      providerContractAdapter: createSmartThingsContractAdapter(contract, {
        getSession: () => getProviderSession('smartthings'),
      }),
    };
  },
};

var providerContractRegistrations:
  | Partial<Record<IntegrationProviderId, ProviderContractRegistration>>
  | undefined;

export function getProviderContractRegistration(
  providerId: IntegrationProviderId
): ProviderContractRegistration {
  if (!providerContractRegistrations) {
    providerContractRegistrations = {};
  }

  const existing = providerContractRegistrations[providerId];
  if (existing) {
    return existing;
  }

  const registration = providerContractRegistrationFactories[providerId]();
  providerContractRegistrations[providerId] = registration;
  return registration;
}

export function getRegisteredProviderContract(
  providerId: IntegrationProviderId
): NavetProviderContract {
  return getProviderContractRegistration(providerId).contract;
}

export function getRegisteredSmartHomeProviderAdapter(
  providerId: IntegrationProviderId
): SmartHomeProviderAdapter {
  return getProviderContractRegistration(providerId).providerContractAdapter;
}
