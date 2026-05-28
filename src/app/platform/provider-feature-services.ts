import type { Connection } from 'home-assistant-js-websocket';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantAutomationConfig,
} from '@/app/services/home-assistant.service';
import type { IntegrationStore } from '@/app/stores/integration-store';
import type {
  PlatformCalendarEvent,
  PlatformCameraCapabilities,
  PlatformCameraStream,
  PlatformCameraStreamType,
  PlatformMediaBrowseResult,
  PlatformNotificationSnapshot,
  PlatformPersistentNotificationEvent,
  PlatformResolvedMediaSource,
  PlatformWeatherForecastEntry,
  PlatformWebRtcClientConfiguration,
  PlatformWebRtcOfferEvent,
} from './provider-feature-models';

export interface ProviderMediaFeatureService {
  playMedia: (
    entityId: string,
    media: {
      mediaContentId: string;
      mediaContentType: string;
      enqueue?: 'play' | 'next' | 'add' | 'replace';
      announce?: boolean;
    }
  ) => Promise<void>;
  browseMediaPlayer: (
    entityId: string,
    media?: { mediaContentId?: string; mediaContentType?: string }
  ) => Promise<PlatformMediaBrowseResult>;
  searchMediaPlayer: (
    entityId: string,
    query: string,
    media?: { mediaContentId?: string; mediaContentType?: string }
  ) => Promise<PlatformMediaBrowseResult>;
  selectMediaPlayerSource: (entityId: string, source: string) => Promise<void>;
  selectMediaPlayerSoundMode: (entityId: string, soundMode: string) => Promise<void>;
  seekMediaPlayer: (entityId: string, seekPosition: number) => Promise<void>;
  clearMediaPlayerPlaylist: (entityId: string) => Promise<void>;
  browseMediaSource: (mediaContentId: string) => Promise<PlatformMediaBrowseResult>;
  resolveMediaSource: (mediaContentId: string) => Promise<PlatformResolvedMediaSource>;
  fetchMediaThumbnailDataUrl: (
    entityId: string,
    connection?: Connection | null
  ) => Promise<string | null>;
}

export interface ProviderCameraFeatureService {
  getCameraCapabilities: (entityId: string) => Promise<PlatformCameraCapabilities>;
  getCameraStreamUrl: (
    entityId: string,
    format?: PlatformCameraStreamType
  ) => Promise<PlatformCameraStream>;
  getWebRtcClientConfiguration: (entityId: string) => Promise<PlatformWebRtcClientConfiguration>;
  subscribeCameraWebRtcOffer: (
    entityId: string,
    offer: string,
    callback: (event: PlatformWebRtcOfferEvent) => void
  ) => Promise<() => void>;
  addCameraWebRtcCandidate: (
    entityId: string,
    sessionId: string,
    candidate: RTCIceCandidateInit
  ) => Promise<void>;
  enableCameraMotionDetection: (entityId: string) => Promise<void>;
  disableCameraMotionDetection: (entityId: string) => Promise<void>;
}

export interface ProviderAdminFeatureService {
  createArea: (name: string) => Promise<HomeAssistantAreaRegistryEntry>;
  updateEntityArea: (entityId: string, areaId: string | null) => Promise<void>;
  deleteArea: (areaId: string) => Promise<void>;
}

export interface ProviderHistoryFeatureService {
  getActiveConnection: () => Connection | null;
}

export interface ProviderCalendarFeatureService {
  getEvents: (
    entityId: string,
    options?: {
      connection?: Connection | null;
      startDateTime?: string;
      endDateTime?: string;
    }
  ) => Promise<PlatformCalendarEvent[]>;
}

export interface ProviderWeatherFeatureService {
  getForecast: (
    entityId: string,
    type: 'daily' | 'hourly',
    options?: { connection?: Connection | null }
  ) => Promise<PlatformWeatherForecastEntry[]>;
}

export interface ProviderNotificationFeatureService {
  getSnapshot: (options?: {
    connection?: Connection | null;
  }) => Promise<PlatformNotificationSnapshot>;
  subscribePersistentNotifications: (
    callback: (event: PlatformPersistentNotificationEvent) => void,
    options?: { connection?: Connection | null }
  ) => Promise<() => void>;
}

export interface ProviderTaskFeatureService {
  selectTaskRuntimeSnapshot: (
    state: IntegrationStore
  ) => Pick<IntegrationStore, 'entities' | 'areas' | 'deviceRegistry' | 'entityRegistry'>;
  getAutomationConfig: (entityId: string) => Promise<HomeAssistantAutomationConfig>;
}
