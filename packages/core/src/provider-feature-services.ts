import type { EnergySourceConfig } from './energy-types';
import type {
  PlatformAutomationDetails,
  PlatformCalendarEvent,
  PlatformCalendarRequestOptions,
  PlatformCameraCapabilities,
  PlatformCameraLiveState,
  PlatformCameraStream,
  PlatformCameraStreamType,
  PlatformEnergyEntityMap,
  PlatformEnergyEntityRegistryEntry,
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
  PlatformMediaBrowseResult,
  PlatformMessageClient,
  PlatformNotificationRequestOptions,
  PlatformNotificationSnapshot,
  PlatformPersistentNotificationEvent,
  PlatformResolvedMediaSource,
  PlatformRoomReference,
  PlatformTaskRuntimeSnapshot,
  PlatformWeatherForecastEntry,
  PlatformWeatherRequestOptions,
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
  updateMediaPlayerPower: (entityId: string, state: 'on' | 'off') => Promise<void>;
  sendRemoteCommand: (entityId: string, command: string) => Promise<void>;
  browseMediaSource: (mediaContentId: string) => Promise<PlatformMediaBrowseResult>;
  resolveMediaSource: (mediaContentId: string) => Promise<PlatformResolvedMediaSource>;
  fetchMediaThumbnailDataUrl: (
    entityId: string,
    messageClient?: PlatformMessageClient | null
  ) => Promise<string | null>;
}

export interface ProviderLightUpdateOptions {
  state?: 'on' | 'off';
  brightnessPct?: number;
  kelvin?: number;
  rgbColor?: [number, number, number];
  hsColor?: [number, number];
  xyColor?: [number, number];
  effect?: string;
}

export interface ProviderLightFeatureService {
  updateLight: (entityId: string, options: ProviderLightUpdateOptions) => Promise<void>;
}

export interface ProviderCameraFeatureService {
  getCameraCapabilities: (entityId: string) => Promise<PlatformCameraCapabilities>;
  getCameraLiveState?: (entityId: string) => Promise<PlatformCameraLiveState>;
  refreshCameraSnapshot?: (entityId: string) => Promise<void>;
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
  toggleCameraAccessory: (entityId: string, state: 'on' | 'off') => Promise<void>;
  selectCameraAccessoryOption: (entityId: string, option: string) => Promise<void>;
  setCameraAccessoryValue: (entityId: string, value: number) => Promise<void>;
  enableCameraMotionDetection: (entityId: string) => Promise<void>;
  disableCameraMotionDetection: (entityId: string) => Promise<void>;
}

export interface ProviderSecurityFeatureService {
  lockEntity: (entityId: string) => Promise<void>;
  unlockEntity: (entityId: string) => Promise<void>;
  openCover: (entityId: string, mode?: 'position' | 'tilt') => Promise<void>;
  closeCover: (entityId: string, mode?: 'position' | 'tilt') => Promise<void>;
  stopCover: (entityId: string, mode?: 'position' | 'tilt') => Promise<void>;
  setCoverPosition: (
    entityId: string,
    position: number,
    mode?: 'position' | 'tilt'
  ) => Promise<void>;
}

export interface ProviderClimateTemperatureUpdate {
  serviceDomain?: 'climate' | 'water_heater';
  temperature?: number;
  targetTemperatureLow?: number;
  targetTemperatureHigh?: number;
}

export interface ProviderClimateFeatureService {
  setTargetTemperature: (
    entityId: string,
    update: ProviderClimateTemperatureUpdate
  ) => Promise<void>;
}

export interface ProviderAdminFeatureService {
  createRoom: (name: string) => Promise<PlatformRoomReference>;
  updateEntityRoom: (entityId: string, roomId: string | null) => Promise<void>;
  updateEntityName: (entityId: string, name: string) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
}

export interface ProviderHistoryFeatureService {
  getMessageClient: () => PlatformMessageClient | null;
  supportsStatisticsHistory?: (entityId: string) => boolean;
  supportsEnergyStatistics?: (entityId: string) => boolean;
}

export interface ProviderEnergyFeatureService {
  getSourceConfig: (messageClient: PlatformMessageClient) => Promise<EnergySourceConfig>;
  augmentSourceConfig: (
    config: EnergySourceConfig,
    entities: PlatformEnergyEntityMap,
    entityRegistry?: PlatformEnergyEntityRegistryEntry[]
  ) => EnergySourceConfig;
}

export interface ProviderEntityRuntimeService {
  getEntitySnapshots: () => PlatformEntitySnapshotMap | null;
  subscribeEntitySnapshots: (listener: () => void) => () => void;
  getEntityRegistryEntries: () => PlatformEntityRegistryEntry[];
  subscribeEntityRegistryEntries: (listener: () => void) => () => void;
  getConfig: () => unknown | null;
  subscribeConfig: (listener: () => void) => () => void;
}

export interface ProviderCalendarFeatureService {
  getEvents: (
    entityId: string,
    options?: PlatformCalendarRequestOptions
  ) => Promise<PlatformCalendarEvent[]>;
}

export interface ProviderWeatherFeatureService {
  getForecast: (
    entityId: string,
    type: 'daily' | 'hourly',
    options?: PlatformWeatherRequestOptions
  ) => Promise<PlatformWeatherForecastEntry[]>;
}

export interface ProviderNotificationFeatureService {
  getSnapshot: (
    options?: PlatformNotificationRequestOptions
  ) => Promise<PlatformNotificationSnapshot>;
  subscribePersistentNotifications: (
    callback: (event: PlatformPersistentNotificationEvent) => void,
    options?: PlatformNotificationRequestOptions
  ) => Promise<() => void>;
  dismissPersistentNotification: (notificationId: string) => Promise<void>;
  installUpdate: (entityId: string) => Promise<void>;
  restartSystem: () => Promise<void>;
}

export interface ProviderTaskFeatureService {
  getTaskRuntimeSnapshot: () => PlatformTaskRuntimeSnapshot;
  subscribeTaskRuntimeSnapshot: (listener: () => void) => () => void;
  getAutomationDetails: (entityId: string) => Promise<PlatformAutomationDetails>;
  triggerAutomation: (entityId: string) => Promise<void>;
}
