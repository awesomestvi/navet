import { BaseCardDialog } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@navet/app/components/ui/dropdown-menu';
import { useEntityProviderFeatureMatrix, useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type {
  PlatformCameraState,
  PlatformCameraTransport,
} from '@navet/app/platform/provider-feature-models';
import type { ResolvedPlatformResource } from '@navet/app/platform/resources';
import type {
  CameraFitMode,
  CameraStreamPreference,
  CameraViewMode,
  CameraWebRtcStreamSource,
} from '@navet/app/stores/settings-store';
import { isDirectCameraStreamSource } from '@navet/app/stores/settings-store';
import { Camera, ChevronDown, RefreshCw, Scaling, Settings2, Video, X } from 'lucide-react';
import { type ElementType, useCallback, useEffect, useMemo, useState } from 'react';
import {
  normalizeCameraDirectStreamUrl,
  useCameraPlaybackPlan,
} from '../../hooks/use-camera-playback-plan';
import {
  CAMERA_FIT_MODE_OPTIONS,
  CAMERA_STREAM_PREFERENCE_OPTIONS,
  CAMERA_VIEW_MODE_OPTIONS,
} from './camera-control-options';
import { CameraSnapshotImage } from './camera-snapshot-image';
import { CameraStreamPlayer } from './camera-stream-player';
import type { CameraImageSourceKind } from './camera-view-mode';
import { isOpaqueGo2RtcStreamResource } from './go2rtc-viewer-presentation';
import type { CameraCardImageSource } from './types';

interface CameraLiveViewerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  name: string;
  room: string;
  cameraState: PlatformCameraState;
  snapshotUrl: string | undefined;
  snapshotSources?: readonly CameraCardImageSource[];
  cameraViewMode: CameraViewMode;
  preferredTransport: CameraStreamPreference;
  webRtcStreamSource?: CameraWebRtcStreamSource;
  directStreamUrl?: string;
  cameraFitMode?: CameraFitMode;
  isStreamCapable: boolean;
  motionDetectionEnabled: boolean | null;
  initialStreamResource: ResolvedPlatformResource | null;
  onRefresh: () => void;
  onOpenSettings?: () => void;
  onCameraViewModeChange: (mode: CameraViewMode) => void;
  onPreferredTransportChange: (transport: CameraStreamPreference) => void;
  onCameraFitModeChange: (mode: CameraFitMode) => void;
}

const CAMERA_VIEWER_ACTION_BUTTON_CLASS_NAME =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-black/45 text-white backdrop-blur-xl transition-colors hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

function CameraViewerDropdown<T extends string>({
  icon: Icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: ElementType;
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${selectedLabel}`}
          className="pointer-events-auto relative flex h-11 min-w-0 max-w-48 cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-black/45 px-3 text-xs font-semibold text-white backdrop-blur-xl transition-colors before:absolute before:inset-0 before:content-[''] hover:bg-white/12 data-[state=open]:bg-white/14 [&>*]:pointer-events-none"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-white/72" />
          <span className="min-w-0 truncate">{selectedLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/58" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={8} className="min-w-44">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(nextValue as T)}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CameraLiveViewer({
  isOpen,
  onOpenChange,
  entityId,
  name,
  room,
  cameraState,
  snapshotUrl,
  snapshotSources,
  cameraViewMode,
  preferredTransport,
  webRtcStreamSource,
  directStreamUrl,
  cameraFitMode = 'contain',
  isStreamCapable,
  motionDetectionEnabled,
  initialStreamResource,
  onRefresh,
  onOpenSettings,
  onCameraViewModeChange,
  onPreferredTransportChange,
  onCameraFitModeChange,
}: CameraLiveViewerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const featureMatrix = useEntityProviderFeatureMatrix(entityId);
  const [failedStreamTypes, setFailedStreamTypes] = useState<PlatformCameraTransport[]>([]);
  const [directStreamFailed, setDirectStreamFailed] = useState(false);
  const [readyStreamIdentity, setReadyStreamIdentity] = useState<string | null>(null);
  const supportsCameraStreams = featureMatrix.cameraStreams;
  const supportsCameraSnapshot = featureMatrix.cameraSnapshot;
  const usesDirectStream = isDirectCameraStreamSource(webRtcStreamSource ?? 'provider');
  const hasConfiguredDirectStream =
    usesDirectStream && normalizeCameraDirectStreamUrl(directStreamUrl) !== null;
  const canUseCameraStreams = usesDirectStream ? hasConfiguredDirectStream : supportsCameraStreams;
  const playbackModel = useCameraPlaybackPlan({
    entityId,
    webRtcStreamSource,
    directStreamUrl,
    cameraState,
    preferredMode: canUseCameraStreams ? cameraViewMode : 'snapshot',
    preferredTransport,
    snapshotUrl: supportsCameraSnapshot ? snapshotUrl : undefined,
    isStreamCapable: usesDirectStream
      ? hasConfiguredDirectStream
      : supportsCameraStreams && isStreamCapable,
    motionDetectionEnabled,
    failedTransports: new Set(failedStreamTypes),
    directStreamFailed,
  });
  const selectedTransport = playbackModel?.selectedTransport ?? null;
  const snapshotSourceUrl = playbackModel?.snapshotResource?.url;
  const selectedStreamResource = playbackModel?.selectedStreamResource ?? null;
  const isDirectStreamResource =
    selectedStreamResource?.kind === 'webrtc_stream' &&
    selectedStreamResource.metadata?.source === 'direct_stream_url';

  useEffect(() => {
    setFailedStreamTypes([]);
    setDirectStreamFailed(false);
  }, [
    cameraState,
    cameraViewMode,
    directStreamUrl,
    isOpen,
    isStreamCapable,
    preferredTransport,
    webRtcStreamSource,
  ]);

  useEffect(() => {
    if (!isOpen || cameraState === 'unavailable' || !selectedTransport) {
      setReadyStreamIdentity(null);
    }
  }, [cameraState, isOpen, selectedTransport]);

  const handleStreamError = useCallback(
    (kind: CameraImageSourceKind) => {
      if (kind === 'snapshot') {
        return;
      }

      setReadyStreamIdentity(null);
      if (kind === 'web_rtc' && isDirectStreamResource) {
        setDirectStreamFailed(true);
        return;
      }
      setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));
    },
    [isDirectStreamResource]
  );
  const handleRefresh = useCallback(() => {
    setFailedStreamTypes([]);
    setDirectStreamFailed(false);
    setReadyStreamIdentity(null);
    onRefresh();
  }, [onRefresh]);

  const supportedModes = useMemo<CameraViewMode[]>(() => {
    const canStream = usesDirectStream
      ? hasConfiguredDirectStream
      : supportsCameraStreams && isStreamCapable;
    const canShowSnapshot = supportsCameraSnapshot && Boolean(snapshotUrl);
    const modes = CAMERA_VIEW_MODE_OPTIONS.filter((mode) =>
      mode === 'snapshot' ? canShowSnapshot : canStream
    );
    return modes.length > 0 ? modes : ['snapshot'];
  }, [
    hasConfiguredDirectStream,
    isStreamCapable,
    snapshotUrl,
    supportsCameraSnapshot,
    supportsCameraStreams,
    usesDirectStream,
  ]);
  const availableTransportPreferences = useMemo<CameraStreamPreference[]>(() => {
    const supportedTransports =
      playbackModel?.supportedTransports ?? playbackModel?.liveTransports ?? [];

    return CAMERA_STREAM_PREFERENCE_OPTIONS.filter(
      (preference) =>
        preference === 'auto' || supportedTransports.includes(preference as PlatformCameraTransport)
    );
  }, [playbackModel?.liveTransports, playbackModel?.supportedTransports]);
  const effectiveViewMode = supportedModes.includes(cameraViewMode)
    ? cameraViewMode
    : supportedModes[0];
  const effectivePreferredTransport = availableTransportPreferences.includes(preferredTransport)
    ? preferredTransport
    : 'auto';
  const viewModeOptions = supportedModes.map((mode) => ({
    value: mode,
    label: t(`camera.settings.viewMode.${mode}` as TranslationKey),
  }));
  const transportOptions = availableTransportPreferences.map((transport) => ({
    value: transport,
    label: t(`camera.settings.streamPreference.${transport}` as TranslationKey),
  }));
  const fitModeOptions = CAMERA_FIT_MODE_OPTIONS.map((mode) => ({
    value: mode,
    label: t(`camera.settings.fitMode.${mode}` as TranslationKey),
  }));

  const initialResourceMatchesSelectedTransport =
    initialStreamResource?.cacheKey === selectedStreamResource?.cacheKey;
  const activeStreamResource = initialResourceMatchesSelectedTransport
    ? initialStreamResource
    : selectedStreamResource;
  const activeStreamIdentity = selectedTransport
    ? `${selectedTransport}:${activeStreamResource?.cacheKey ?? entityId}`
    : null;
  const isStreamReady =
    activeStreamIdentity !== null && readyStreamIdentity === activeStreamIdentity;
  const handleStreamLoad = useCallback(() => {
    if (activeStreamIdentity) {
      setReadyStreamIdentity(activeStreamIdentity);
    }
  }, [activeStreamIdentity]);
  const isStreamReadinessOpaque = isOpaqueGo2RtcStreamResource(
    activeStreamResource,
    window.location.href
  );
  const isShowingSnapshot =
    !selectedTransport && Boolean(snapshotSourceUrl) && cameraState !== 'unavailable';
  const showNoSignal = !selectedTransport && !snapshotSourceUrl && cameraState !== 'unavailable';
  const isFeedRunning =
    Boolean(selectedTransport) &&
    cameraState !== 'unavailable' &&
    !isStreamReadinessOpaque &&
    isStreamReady;
  const isStreamPending =
    Boolean(selectedTransport) &&
    cameraState !== 'unavailable' &&
    !isStreamReadinessOpaque &&
    !isStreamReady;
  const streamTypeLabel = useMemo(() => {
    if (isStreamReadinessOpaque) {
      return t('camera.settings.webRtcStreamSource.direct');
    }
    if (!playbackModel) {
      return canUseCameraStreams
        ? t('camera.viewer.streamCapable')
        : t('camera.viewer.snapshotOnly');
    }
    if (playbackModel.isSnapshotFallback) {
      return t('camera.viewer.snapshotFallback');
    }
    if (
      selectedTransport === 'hls' ||
      selectedTransport === 'mse' ||
      selectedTransport === 'web_rtc' ||
      selectedTransport === 'mjpeg'
    ) {
      if (
        selectedTransport === 'web_rtc' &&
        selectedStreamResource?.metadata?.source === 'direct_stream_url'
      ) {
        return t('camera.settings.webRtcStreamSource.direct');
      }
      return selectedTransport === 'web_rtc' ? 'RTC' : selectedTransport.toUpperCase();
    }
    return playbackModel.supportsStreaming
      ? t('camera.viewer.streamCapable')
      : t('camera.viewer.snapshotOnly');
  }, [
    playbackModel,
    isStreamReadinessOpaque,
    selectedStreamResource?.metadata?.source,
    selectedTransport,
    canUseCameraStreams,
    t,
  ]);

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={name}
      description={t('camera.viewer.description')}
      theme={theme}
      disableOpenAutoFocus
      contentTitle={name}
      contentDescription={t('camera.viewer.description')}
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      shellBodyClassName="h-full"
    >
      <div className="relative isolate flex h-full min-h-0 flex-col bg-black text-white">
        <div className="absolute inset-0 z-0">
          {selectedTransport && cameraState !== 'unavailable' ? (
            <CameraStreamPlayer
              entityId={entityId}
              kind={selectedTransport}
              posterUrl={snapshotSourceUrl}
              streamResource={activeStreamResource}
              fitMode={cameraFitMode}
              loadingLabel={t('camera.loadingFeed')}
              webRtcTitle={t('camera.webRtcStreamTitle')}
              onLoad={handleStreamLoad}
              onError={handleStreamError}
            />
          ) : snapshotSourceUrl && cameraState !== 'unavailable' ? (
            <CameraSnapshotImage
              src={snapshotSourceUrl}
              sources={snapshotSources}
              alt={name}
              className={`h-full w-full ${
                cameraFitMode === 'cover' ? 'object-cover' : 'object-contain'
              }`}
              onError={() => undefined}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-zinc-950">
              <Camera className="h-12 w-12 text-white/35" />
              <span className="text-sm text-white/58">
                {cameraState === 'unavailable'
                  ? t('camera.status.unavailable')
                  : showNoSignal
                    ? t('camera.status.noSignal')
                    : t('common.off')}
              </span>
            </div>
          )}
        </div>

        <div
          data-testid="camera-viewer-top-controls"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/85 via-black/45 to-transparent pb-4 pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] md:pb-5 md:pl-[calc(env(safe-area-inset-left,0px)+1.25rem)] md:pr-[calc(env(safe-area-inset-right,0px)+1.25rem)] md:pt-[calc(env(safe-area-inset-top,0px)+1.25rem)]"
        >
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/76">
                <span>{room}</span>
                <span className="h-1 w-1 rounded-full bg-white/35" />
                <span>{streamTypeLabel}</span>
              </div>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight md:text-2xl">
                {name}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isFeedRunning
                      ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.68)]'
                      : 'bg-white/45'
                  }`}
                />
                <Video className="h-3.5 w-3.5 text-white/72" />
                <span>
                  {isStreamReadinessOpaque
                    ? t('camera.settings.webRtcStreamSource.direct')
                    : isFeedRunning
                      ? t('camera.status.live')
                      : isStreamPending
                        ? t('camera.loadingFeed')
                        : cameraState === 'off'
                          ? t('common.off')
                          : cameraState === 'unavailable'
                            ? t('camera.status.unavailable')
                            : t('common.on')}
                </span>
                {playbackModel?.isSnapshotFallback ? (
                  <span className="text-white/58">{t('camera.viewer.snapshotFallback')}</span>
                ) : null}
              </div>
              {isShowingSnapshot ? (
                <button
                  type="button"
                  onClick={handleRefresh}
                  className={CAMERA_VIEWER_ACTION_BUTTON_CLASS_NAME}
                  aria-label={t('camera.actions.refreshSnapshot')}
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              ) : null}
              {onOpenSettings ? (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={CAMERA_VIEWER_ACTION_BUTTON_CLASS_NAME}
                  aria-label={t('camera.actions.openSettings')}
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className={CAMERA_VIEWER_ACTION_BUTTON_CLASS_NAME}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          data-testid="camera-viewer-bottom-controls"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] md:pl-[calc(env(safe-area-inset-left,0px)+1.25rem)] md:pr-[calc(env(safe-area-inset-right,0px)+1.25rem)] md:pt-5 md:pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
        >
          <div className="flex flex-wrap justify-end gap-2">
            {!usesDirectStream && availableTransportPreferences.length > 1 ? (
              <CameraViewerDropdown
                icon={Video}
                label={t('camera.settings.streamPreference')}
                options={transportOptions}
                value={effectivePreferredTransport}
                onChange={onPreferredTransportChange}
              />
            ) : null}
            {!isStreamReadinessOpaque ? (
              <CameraViewerDropdown
                icon={Scaling}
                label={t('camera.settings.fitMode')}
                options={fitModeOptions}
                value={cameraFitMode}
                onChange={onCameraFitModeChange}
              />
            ) : null}
            <CameraViewerDropdown
              icon={Camera}
              label={t('camera.settings.viewMode')}
              options={viewModeOptions}
              value={effectiveViewMode}
              onChange={onCameraViewModeChange}
            />
          </div>
        </div>
      </div>
    </BaseCardDialog>
  );
}
