import type { CalendarDevice, WeatherDevice } from '@/app/types/device.types';

export interface PlatformMediaItem {
  title: string;
  mediaClass?: string;
  mediaContentId?: string;
  mediaContentType?: string;
  children?: PlatformMediaItem[];
  canExpand?: boolean;
  canPlay?: boolean;
  thumbnail?: string | null;
}

export interface PlatformMediaBrowseResult extends PlatformMediaItem {}

export interface PlatformResolvedMediaSource {
  url: string;
  mimeType?: string;
}

export type PlatformCameraStreamType = 'hls' | 'web_rtc';

export interface PlatformCameraCapabilities {
  streamTypes: PlatformCameraStreamType[];
}

export interface PlatformCameraStream {
  url: string;
}

export interface PlatformWebRtcClientConfiguration {
  configuration: RTCConfiguration;
  dataChannel?: string;
}

export type PlatformWebRtcOfferEvent =
  | { type: 'session'; session_id: string }
  | { type: 'answer'; answer: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }
  | { type: 'error'; code: string; message: string };

export type PlatformCalendarEvent = Record<string, unknown>;

export type PlatformWeatherForecastEntry = Record<string, unknown>;

export interface PlatformMessageClient {
  sendMessagePromise<TResponse = unknown>(message: unknown): Promise<TResponse>;
  subscribeMessage?<TEvent = unknown>(
    callback: (event: TEvent) => void,
    subscribeMessage: unknown
  ): Promise<() => void>;
}

export interface PlatformEntitySnapshot {
  entityId: string;
  state: string;
  attributes: Record<string, unknown>;
  lastChanged?: string;
  lastUpdated?: string;
}

export type PlatformEntitySnapshotMap = Record<string, PlatformEntitySnapshot>;

export interface PlatformEntityRegistryEntry {
  entityId: string;
  deviceId?: string | null;
  areaId?: string | null;
  name?: string | null;
  platform?: string | null;
}

export interface PlatformFeatureRequestOptions {
  messageClient?: PlatformMessageClient | null;
}

export interface PlatformTaskEntityState {
  entityId: string;
  state: string;
  name?: string;
  attributes: Record<string, unknown>;
}

export type PlatformTaskEntityMap = Record<string, PlatformTaskEntityState>;

export interface PlatformTaskRoomReference {
  id: string;
  name: string;
}

export interface PlatformTaskDeviceReference {
  id: string;
  roomId?: string | null;
}

export interface PlatformTaskEntityReference {
  entityId: string;
  roomId?: string | null;
  deviceId?: string | null;
}

export interface PlatformTaskRuntimeSnapshot {
  entities: PlatformTaskEntityMap | null;
  rooms: PlatformTaskRoomReference[];
  devices: PlatformTaskDeviceReference[];
  entityReferences: PlatformTaskEntityReference[];
}

export interface PlatformAutomationDetails {
  config: Record<string, unknown>;
}

export interface PlatformCalendarRequestOptions extends PlatformFeatureRequestOptions {
  startDateTime?: string;
  endDateTime?: string;
}

export interface PlatformWeatherRequestOptions extends PlatformFeatureRequestOptions {}

export interface PlatformNotificationRequestOptions extends PlatformFeatureRequestOptions {}

export interface PlatformRoomReference {
  id: string;
  name: string;
  providerId?: string;
}

export interface PlatformManageableRoomReference extends PlatformRoomReference {
  canAssign: boolean;
  canDelete: boolean;
  canOrder: boolean;
}

export interface PlatformPersistentNotification {
  notification_id?: string;
  title?: string;
  message?: string;
  created_at?: string;
  status?: string;
}

export interface PlatformRepairIssue {
  issue_id?: string;
  domain?: string;
  issue_domain?: string;
  translation_key?: string;
  severity?: string;
  breaks_in_ha_version?: string;
  learn_more_url?: string;
  title?: string;
  description?: string;
}

export interface PlatformPersistentNotificationEvent {
  update_type?: 'added' | 'removed' | 'updated' | 'current';
  notifications?: PlatformPersistentNotification[];
}

export interface PlatformNotificationSnapshot {
  persistentNotifications: PlatformPersistentNotification[];
  repairIssues: PlatformRepairIssue[];
}

export interface PlatformUpdateNotificationCandidate {
  entityId: string;
  state: string;
  friendlyName?: string;
  installedVersion?: string | null;
  latestVersion?: string | null;
  releaseSummary?: string | null;
  releaseNotes?: string | null;
  detailsUrl?: string | null;
  progress?: number | null;
  inProgress: boolean;
  lastChanged?: string;
  lastUpdated?: string;
}

export interface PlatformHistoryClientAccess {
  messageClient: PlatformMessageClient | null;
}

export type PlatformWeatherDevice = WeatherDevice;

export type PlatformCalendarDevice = CalendarDevice;

export interface PlatformNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  notificationId: string;
  source: 'persistent_notification' | 'update' | 'repair';
  isBusy?: boolean;
  progress?: number | null;
  statusLabel?: string;
  requiresRestart?: boolean;
  installedVersion?: string | null;
  latestVersion?: string | null;
  detailsUrl?: string | null;
}

export type PlatformCameraSourceKind = 'snapshot' | 'mjpeg' | 'hls' | 'web_rtc' | 'go2rtc';

export interface PlatformCameraPresentation {
  sourceUrl?: string;
  sourceKind: PlatformCameraSourceKind;
  isFallback: boolean;
  videoStreamKind: Extract<PlatformCameraSourceKind, 'hls' | 'web_rtc' | 'go2rtc'> | null;
  supportsStreaming: boolean;
  availableStreamTypes: string[];
}

export interface CameraPlaybackPlan {
  primary: import('./resources').ResolvedPlatformResource;
  fallbacks: import('./resources').ResolvedPlatformResource[];
  refreshPolicy: {
    snapshotRefreshMs?: number;
    retryDelaysMs: number[];
  };
}

export interface PlatformEnergySourceOption {
  id: string;
  name: string;
  currentPowerW: number;
  todayUsageKWh: number;
  trendEntityId?: string;
  group: 'home' | 'sources' | 'devices';
}

export interface PlatformEnergyNowSnapshot {
  isConnected: boolean;
  isConfigured: boolean;
  currentLoadStatisticId?: string;
  todayTotalUsageKWh: number;
  currentLoadW: number;
  solarW: number;
  solarTodayKWh: number;
  importW: number;
  importTodayKWh: number;
  sourceOptions: PlatformEnergySourceOption[];
}

export type PlatformEnergySourceDiagnosticStatus =
  | 'not_configured'
  | 'configured_idle'
  | 'configured_unavailable'
  | 'configured_numeric';

export interface PlatformEnergySourceDiagnostic {
  id: string;
  label: string;
  entityId?: string;
  liveEntityId?: string;
  status: PlatformEnergySourceDiagnosticStatus;
}

export interface PlatformEnergySnapshot extends PlatformEnergyNowSnapshot {
  hasLoaded: boolean;
  sourceDiagnostics: PlatformEnergySourceDiagnostic[];
}
