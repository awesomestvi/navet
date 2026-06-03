import { configureHomeAssistantServiceBridge } from '@navet/provider-homeassistant/homeassistant-service-bridge';
import { configureHomeyBridge } from '@navet/provider-homey/homey-bridge';
import { homeAssistantService } from '../services/home-assistant.service';
import { homeyService } from '../services/homey.service';
import { ensureHomeyApiClientConfigured } from '../services/homey-api-client.service';
import { homeyEntityRuntimeService } from '../services/homey-entity-runtime.service';
import { homeAssistantStore } from '../stores/home-assistant-store';
import { resolveHomeAssistantProxyUrl } from '../utils/home-assistant-url';
import {
  cameraMediaService,
  homeAssistantResourceResolver,
  mediaArtworkService,
} from './home-assistant/home-assistant-infrastructure';

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

function toHomeAssistantTarget(target?: {
  entityId?: string | string[];
  areaId?: string | string[];
  deviceId?: string | string[];
}) {
  if (!target) {
    return undefined;
  }

  return {
    ...(target.entityId !== undefined ? { entity_id: target.entityId } : {}),
    ...(target.areaId !== undefined ? { area_id: target.areaId } : {}),
    ...(target.deviceId !== undefined ? { device_id: target.deviceId } : {}),
  };
}

export function configureAppProviderBridges() {
  configureHomeAssistantServiceBridge({
    callService: (domain, service, serviceData, target) =>
      homeAssistantService.callService(domain, service, serviceData, toHomeAssistantTarget(target)),
    signPath: (path, expiresSeconds) => homeAssistantService.signPath(path, expiresSeconds),
    getCameraStreamUrl: (entityId, format) =>
      homeAssistantService.getCameraStreamUrl(entityId, format),
    getCameraStreamPaths: async (entityId) => {
      const paths = await homeAssistantService.getCameraStreamPaths(entityId);
      return {
        ...(paths.hls_path ? { hls: paths.hls_path } : {}),
        ...(paths.mjpeg_path ? { mjpeg: paths.mjpeg_path } : {}),
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
