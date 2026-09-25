import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { EMPTY_NAVET_MEDIA_CAPABILITIES } from '@navet/app/core/navet-device-state';
import { MediaCard } from '@navet/app/features/media';
import type { MediaDialogMediaStackSettings } from '@navet/app/features/media/components/media/media-dialog.types';
import { useAreaRooms, useDeviceCollectionsByKeys, useI18n, useTheme } from '@navet/app/hooks';
import { useDashboardWidgetRoomOptions } from '@navet/app/hooks/use-dashboard-widget-room-options';
import type { MediaDevice } from '@navet/app/types/device.types';
import { Radio } from 'lucide-react';
import {
  lazy,
  memo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type MediaStackWidgetData,
  normalizeMediaStackWidgetData,
  selectMediaStackDevice,
} from './media-stack-widget-data';

export interface MediaStackPlayerOption {
  id: string;
  name: string;
  room: string;
  subtitle: string;
}

interface MediaStackWidgetProps {
  size?: CardSize;
  data?: MediaStackWidgetData;
  onUpdate?: (data: MediaStackWidgetUpdate) => void;
  room?: string;
  onRoomChange?: (room: string) => void;
  openSettingsRequestKey?: number;
  availableEntityIds?: readonly string[];
  anchorEntityId?: string;
}

type MediaStackWidgetUpdate = Parameters<MediaDialogMediaStackSettings['onUpdate']>[0];

function sortPlayers(left: MediaDevice, right: MediaDevice) {
  const roomComparison = left.room.localeCompare(right.room);
  if (roomComparison !== 0) {
    return roomComparison;
  }

  return left.name.localeCompare(right.name);
}

const noopCardSizeChange = () => {};
const noop = () => {};
const MediaDialog = lazy(async () => {
  const module = await import('@navet/app/features/media/components/media/media-dialog');
  return { default: module.MediaDialog };
});

function createWidgetUpdatePayload(next: MediaStackWidgetUpdate): MediaStackWidgetUpdate {
  return {
    entityIds: next.entityIds,
    priorityOrder: next.priorityOrder,
    idleBehavior: next.idleBehavior,
  };
}

export const MediaStackWidget = memo(function MediaStackWidget({
  size = 'medium',
  data,
  onUpdate,
  room,
  onRoomChange,
  openSettingsRequestKey = 0,
  availableEntityIds,
  anchorEntityId,
}: MediaStackWidgetProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const [backgroundByPlayer, setBackgroundByPlayer] = useState<Record<string, string>>({});
  const [dragOffset, setDragOffset] = useState(0);
  const [dragDirection, setDragDirection] = useState<-1 | 1 | null>(null);
  const [isDragSettling, setIsDragSettling] = useState(false);
  const [isFallbackSettingsOpen, setIsFallbackSettingsOpen] = useState(false);
  const [forwardedSettingsRequestKey, setForwardedSettingsRequestKey] = useState(0);
  const touchStart = useRef<{ x: number; y: number; captured: boolean } | null>(null);
  const pointerStart = useRef<{ id: number; x: number; y: number; captured: boolean } | null>(null);
  const stackViewport = useRef<HTMLDivElement | null>(null);
  const settleTimeout = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);
  const previousSettingsRequestKey = useRef(openSettingsRequestKey);
  const rooms = useAreaRooms();
  const devices = useDeviceCollectionsByKeys(['media']);
  const normalizedData = useMemo(
    () => normalizeMediaStackWidgetData(data as Record<string, unknown> | undefined),
    [data]
  );
  const mediaDevices = useMemo(() => {
    const allowedIds = availableEntityIds ? new Set(availableEntityIds) : null;
    return devices.media
      .filter((device) => !allowedIds || allowedIds.has(device.id))
      .sort(sortPlayers);
  }, [availableEntityIds, devices.media]);
  const playerOptions = useMemo<MediaStackPlayerOption[]>(
    () =>
      mediaDevices.map((device) => ({
        id: device.id,
        name: device.name,
        room: device.room,
        subtitle: device.entityType ?? t('media.type.player'),
      })),
    [mediaDevices, t]
  );
  const configuredEntityIds = normalizedData?.entityIds ?? [];
  const configuredEntityIdSet = useMemo(() => new Set(configuredEntityIds), [configuredEntityIds]);
  const selectedDevices = useMemo(
    () => mediaDevices.filter((device) => configuredEntityIdSet.has(device.id)),
    [configuredEntityIdSet, mediaDevices]
  );
  const selection = useMemo(
    () => selectMediaStackDevice(selectedDevices, normalizedData),
    [normalizedData, selectedDevices]
  );
  const orderedDevices = useMemo(() => {
    const priority = normalizedData?.priorityOrder ?? [];
    return [...selectedDevices].sort(
      (left, right) => priority.indexOf(left.id) - priority.indexOf(right.id)
    );
  }, [normalizedData?.priorityOrder, selectedDevices]);
  const displayedDevice =
    orderedDevices.find((device) => device.id === manualSelectedId) ?? selection?.device;
  const shouldRenderPlayerCard = Boolean(
    displayedDevice &&
      selection &&
      !(selection.isFallback && !manualSelectedId && normalizedData?.idleBehavior === 'compact')
  );
  const activeBackground = displayedDevice ? backgroundByPlayer[displayedDevice.id] : undefined;
  const handleDerivedBackgroundChange = useCallback((entityId: string, backgroundColor: string) => {
    setBackgroundByPlayer((current) =>
      current[entityId] === backgroundColor ? current : { ...current, [entityId]: backgroundColor }
    );
  }, []);
  useEffect(() => setManualSelectedId(null), [selection?.device.id]);
  const showPlayer = (direction: -1 | 1) => {
    if (orderedDevices.length < 2) return;
    const currentIndex = orderedDevices.findIndex((device) => device.id === displayedDevice?.id);
    const nextIndex = (currentIndex + direction + orderedDevices.length) % orderedDevices.length;
    setManualSelectedId(orderedDevices[nextIndex]?.id ?? null);
  };
  const activePlayerIndex = orderedDevices.findIndex((device) => device.id === displayedDevice?.id);
  const swipeDirection = dragDirection;
  const previewPlayerIndex =
    swipeDirection === null || activePlayerIndex < 0
      ? -1
      : (activePlayerIndex + swipeDirection + orderedDevices.length) % orderedDevices.length;
  const previewDevice = previewPlayerIndex >= 0 ? orderedDevices[previewPlayerIndex] : undefined;

  useEffect(
    () => () => {
      if (settleTimeout.current !== null) window.clearTimeout(settleTimeout.current);
    },
    []
  );

  const constrainDragOffset = (offset: number) => {
    const height = stackViewport.current?.clientHeight || 180;
    return Math.max(-height, Math.min(height, offset));
  };

  const trackDrag = (offset: number) => {
    const constrainedOffset = constrainDragOffset(offset);
    if (constrainedOffset !== 0) setDragDirection(constrainedOffset < 0 ? 1 : -1);
    setDragOffset(constrainedOffset);
  };

  const settleDrag = (offset: number) => {
    const height = stackViewport.current?.clientHeight || 180;
    const direction: -1 | 1 = offset === 0 ? (dragDirection ?? 1) : offset < 0 ? 1 : -1;
    const shouldChangePlayer = Math.abs(offset) >= Math.min(56, height * 0.24);
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (shouldChangePlayer) showPlayer(direction);
      setDragOffset(0);
      setDragDirection(null);
      setIsDragSettling(false);
      return;
    }

    setIsDragSettling(true);
    setDragOffset(shouldChangePlayer ? (direction === 1 ? -height : height) : 0);
    if (settleTimeout.current !== null) window.clearTimeout(settleTimeout.current);
    settleTimeout.current = window.setTimeout(() => {
      if (shouldChangePlayer) showPlayer(direction);
      setIsDragSettling(false);
      setDragOffset(0);
      setDragDirection(null);
      settleTimeout.current = null;
    }, 220);
  };

  const renderPlayerCard = (
    device: MediaDevice,
    stackSettings?: MediaDialogMediaStackSettings,
    settingsRequestKey = 0
  ) => (
    <MediaCard
      key={device.id}
      id={device.id}
      name={device.name}
      room={device.room}
      title={device.title}
      artist={device.artist}
      entityType={device.entityType}
      deviceClass={device.deviceClass}
      source={device.source}
      sourceList={device.sourceList}
      entityPicture={device.entityPicture}
      state={device.state}
      volume={device.volume}
      isMuted={device.isMuted}
      elapsedSeconds={device.elapsedSeconds}
      durationSeconds={device.durationSeconds}
      positionUpdatedAt={device.positionUpdatedAt}
      mediaCapabilities={device.mediaCapabilities}
      supportsGrouping={device.supportsGrouping}
      supportsPreviousTrack={device.supportsPreviousTrack}
      supportsNextTrack={device.supportsNextTrack}
      groupMembers={device.groupMembers}
      size={size}
      onSizeChange={noopCardSizeChange}
      isEditMode={false}
      onDerivedBackgroundChange={handleDerivedBackgroundChange}
      mediaStackSettings={stackSettings}
      openSettingsRequestKey={settingsRequestKey}
    />
  );

  const withStackControls = (card: ReactNode) => (
    <>
      <section
        data-media-stack
        className="relative h-full min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        tabIndex={orderedDevices.length > 1 ? 0 : undefined}
        aria-label={
          orderedDevices.length > 1
            ? `${t('dashboard.addCard.templates.mediaStack.name')}: ${displayedDevice?.name ?? ''}`
            : undefined
        }
        style={{ touchAction: orderedDevices.length > 1 ? 'pan-x' : undefined }}
        onClickCapture={(event) => {
          if (Date.now() >= suppressClickUntil.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClickUntil.current = 0;
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            showPlayer(event.key === 'ArrowDown' ? 1 : -1);
          }
        }}
        onPointerDown={(event) => {
          if (
            orderedDevices.length < 2 ||
            isDragSettling ||
            event.pointerType === 'touch' ||
            event.button > 0 ||
            event.isPrimary === false
          ) {
            return;
          }
          if (
            event.target instanceof Element &&
            event.target.closest('[role="slider"], input[type="range"]')
          ) {
            return;
          }
          pointerStart.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            captured: false,
          };
        }}
        onPointerMove={(event) => {
          const start = pointerStart.current;
          if (!start || start.id !== event.pointerId) return;
          const deltaX = event.clientX - start.x;
          const deltaY = event.clientY - start.y;
          if (
            !start.captured &&
            Math.abs(deltaY) > 12 &&
            Math.abs(deltaY) > Math.abs(deltaX) * 1.2
          ) {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            start.captured = true;
          }
          if (start.captured) trackDrag(deltaY);
        }}
        onPointerUp={(event) => {
          if (!pointerStart.current || pointerStart.current.id !== event.pointerId) return;
          const deltaX = event.clientX - pointerStart.current.x;
          const deltaY = event.clientY - pointerStart.current.y;
          const wasCaptured = pointerStart.current.captured;
          pointerStart.current = null;
          if (wasCaptured && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
            suppressClickUntil.current = Date.now() + 350;
            settleDrag(constrainDragOffset(deltaY));
          } else {
            setDragOffset(0);
            setDragDirection(null);
          }
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          settleDrag(dragOffset);
        }}
        onTouchStart={(event) => {
          if (orderedDevices.length < 2 || isDragSettling || event.touches.length !== 1) return;
          touchStart.current = {
            x: event.touches[0]?.clientX ?? 0,
            y: event.touches[0]?.clientY ?? 0,
            captured: false,
          };
        }}
        onTouchMove={(event) => {
          const start = touchStart.current;
          if (!start || event.touches.length !== 1) return;
          const deltaX = (event.touches[0]?.clientX ?? 0) - start.x;
          const deltaY = (event.touches[0]?.clientY ?? 0) - start.y;
          if (
            !start.captured &&
            Math.abs(deltaY) > 12 &&
            Math.abs(deltaY) > Math.abs(deltaX) * 1.2
          ) {
            start.captured = true;
          }
          if (start.captured) trackDrag(deltaY);
        }}
        onTouchEnd={(event) => {
          if (!touchStart.current || orderedDevices.length < 2) return;
          const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current.x;
          const deltaY = (event.changedTouches[0]?.clientY ?? 0) - touchStart.current.y;
          const wasCaptured = touchStart.current.captured;
          touchStart.current = null;
          if (wasCaptured && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
            suppressClickUntil.current = Date.now() + 350;
            settleDrag(constrainDragOffset(deltaY));
          } else {
            setDragOffset(0);
            setDragDirection(null);
          }
        }}
        onTouchCancel={() => {
          touchStart.current = null;
          settleDrag(dragOffset);
        }}
      >
        <div ref={stackViewport} className="relative h-full min-w-0 overflow-hidden">
          <div
            data-media-stack-card
            className={`h-full min-w-0 will-change-transform ${
              isDragSettling
                ? 'motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-out'
                : ''
            }`}
            style={{ transform: `translate3d(0, ${dragOffset}px, 0)` }}
          >
            {card}
          </div>
          {previewDevice && swipeDirection !== null ? (
            <div
              aria-hidden="true"
              data-media-stack-preview
              inert
              className={`pointer-events-none absolute inset-0 h-full min-w-0 will-change-transform ${
                isDragSettling
                  ? 'motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-out'
                  : ''
              }`}
              style={{
                transform: `translate3d(0, calc(${swipeDirection === 1 ? '100%' : '-100%'} + ${dragOffset}px), 0)`,
              }}
            >
              {renderPlayerCard(previewDevice)}
            </div>
          ) : null}
        </div>
        {orderedDevices.length > 1 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 top-1/2 z-20 flex max-h-[80%] -translate-y-1/2 flex-col items-center gap-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {orderedDevices.map((device, index) => (
              <span
                key={device.id}
                data-active={index === activePlayerIndex ? 'true' : undefined}
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  index === activePlayerIndex ? '' : surface.textMuted
                }`}
                style={{
                  backgroundColor:
                    index === activePlayerIndex
                      ? (activeBackground ?? accentColor)
                      : 'currentColor',
                }}
              />
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const mediaStackSettings = useMemo(
    () => ({
      entityIds: normalizedData?.entityIds ?? [],
      requiredEntityIds: anchorEntityId ? [anchorEntityId] : undefined,
      priorityOrder: normalizedData?.priorityOrder ?? [],
      idleBehavior: normalizedData?.idleBehavior ?? 'compact',
      playerOptions,
      roomValue,
      roomLabel,
      roomOptions,
      onRoomChange,
      onUpdate: (next: MediaStackWidgetUpdate) => {
        onUpdate?.(createWidgetUpdatePayload(next));
      },
    }),
    [
      anchorEntityId,
      normalizedData,
      onRoomChange,
      onUpdate,
      playerOptions,
      roomLabel,
      roomOptions,
      roomValue,
    ]
  );

  useEffect(() => {
    if (openSettingsRequestKey > previousSettingsRequestKey.current) {
      if (shouldRenderPlayerCard) {
        setForwardedSettingsRequestKey(openSettingsRequestKey);
      } else if (onUpdate) {
        setIsFallbackSettingsOpen(true);
      }
    }
    previousSettingsRequestKey.current = openSettingsRequestKey;
  }, [onUpdate, openSettingsRequestKey, shouldRenderPlayerCard]);

  useEffect(() => {
    if (forwardedSettingsRequestKey === 0) return;
    const frame = window.requestAnimationFrame(() => setForwardedSettingsRequestKey(0));
    return () => window.cancelAnimationFrame(frame);
  }, [forwardedSettingsRequestKey]);

  const fallbackSettingsDialog = isFallbackSettingsOpen ? (
    <Suspense fallback={null}>
      <MediaDialog
        entityId={anchorEntityId ?? 'media-stack'}
        entityName={t('dashboard.addCard.templates.mediaStack.name')}
        entityType={t('widgets.common.widget')}
        title={t('widgets.mediaStack.settings.title')}
        artist=""
        isPlaying={false}
        volume={0}
        isMuted={false}
        elapsedSeconds={0}
        durationSeconds={0}
        supportsGrouping={false}
        groupMembers={[]}
        availableGroupingPlayers={[]}
        onPrevious={noop}
        canPreviousTrack={false}
        onTogglePlay={noop}
        onNext={noop}
        canNextTrack={false}
        shuffleEnabled={false}
        repeatMode="off"
        onToggleShuffle={noop}
        onCycleRepeat={noop}
        capabilities={EMPTY_NAVET_MEDIA_CAPABILITIES}
        sourceList={[]}
        onSelectSource={noop}
        soundModeList={[]}
        onSelectSoundMode={noop}
        onSeek={noop}
        onClearPlaylist={noop}
        onToggleMute={noop}
        onVolumeChange={noop}
        onVolumeInteractionStart={noop}
        onVolumeInteractionEnd={noop}
        onAttachGroupMember={noop}
        onDetachGroupMember={noop}
        isOpen={isFallbackSettingsOpen}
        onOpenChange={setIsFallbackSettingsOpen}
        mediaStackSettings={mediaStackSettings}
        initialTab="stack"
      />
    </Suspense>
  ) : null;
  const withFallbackSettings = (card: ReactNode) => (
    <>
      {withStackControls(card)}
      {fallbackSettingsDialog}
    </>
  );

  if (mediaDevices.length === 0) {
    return withFallbackSettings(
      <BaseCard size={size} fullBleed contentClassName="h-full">
        <div className="h-full p-4">
          <CardEmptyState
            title={t('dashboard.addCard.templates.mediaStack.name')}
            description={t('widgets.mediaStack.settings.noneAvailable')}
            icon={Radio}
          />
        </div>
      </BaseCard>
    );
  }

  if (configuredEntityIds.length === 0) {
    return withFallbackSettings(
      <BaseCard size={size} fullBleed contentClassName="h-full">
        <div className="h-full p-4">
          <CardEmptyState
            title={t('widgets.mediaStack.empty.title')}
            description={t('widgets.mediaStack.empty.description')}
            icon={Radio}
          />
        </div>
      </BaseCard>
    );
  }

  if (!selection) {
    return withFallbackSettings(
      <BaseCard size={size} fullBleed contentClassName="h-full">
        <div className="h-full p-4">
          <CardEmptyState
            title={t('widgets.mediaStack.empty.unavailableTitle')}
            description={t('widgets.mediaStack.empty.unavailableDescription')}
            icon={Radio}
          />
        </div>
      </BaseCard>
    );
  }

  if (selection.isFallback && !manualSelectedId && normalizedData?.idleBehavior === 'compact') {
    return withFallbackSettings(
      <BaseCard size={size} fullBleed contentClassName="h-full">
        <div className="h-full p-4">
          <CardEmptyState
            title={selection.device.name}
            description={t('media.nothingPlaying')}
            icon={Radio}
            size={size}
          />
        </div>
      </BaseCard>
    );
  }

  if (!displayedDevice) return withFallbackSettings(null);

  return withFallbackSettings(
    renderPlayerCard(displayedDevice, mediaStackSettings, forwardedSettingsRequestKey)
  );
});
