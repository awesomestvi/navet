import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getMediaPlayerCapabilities } from '@navet/app/constants/media-player-features';
import { MediaCard } from '@navet/app/features/media';
import type { MediaStackIdleBehavior } from '@navet/app/features/media/components/media/media-dialog.types';
import { useAreaRooms, useDeviceCollectionsByKeys, useI18n } from '@navet/app/hooks';
import { useDashboardWidgetRoomOptions } from '@navet/app/hooks/use-dashboard-widget-room-options';
import type { MediaDevice } from '@navet/app/types/device.types';
import { Radio } from 'lucide-react';
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react';
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
  onUpdate?: (data: MediaStackWidgetData) => void;
  room?: string;
  onRoomChange?: (room: string) => void;
  openSettingsRequestKey?: number;
}

function sortPlayers(left: MediaDevice, right: MediaDevice) {
  const roomComparison = left.room.localeCompare(right.room);
  if (roomComparison !== 0) {
    return roomComparison;
  }

  return left.name.localeCompare(right.name);
}

const noopCardSizeChange = () => {};
const noop = () => {};
const EMPTY_CAPABILITIES = getMediaPlayerCapabilities(0);
const MediaDialog = lazy(async () => {
  const module = await import('@navet/app/features/media/components/media/media-dialog');
  return { default: module.MediaDialog };
});

function createWidgetUpdatePayload(next: {
  entityIds: string[];
  priorityOrder: string[];
  idleBehavior: MediaStackIdleBehavior;
}): MediaStackWidgetData {
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
}: MediaStackWidgetProps) {
  const { t } = useI18n();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const rooms = useAreaRooms();
  const devices = useDeviceCollectionsByKeys(['media']);
  const normalizedData = useMemo(
    () => normalizeMediaStackWidgetData(data as Record<string, unknown> | undefined),
    [data]
  );
  const mediaDevices = useMemo(() => [...devices.media].sort(sortPlayers), [devices.media]);
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
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const mediaStackSettings = useMemo(
    () => ({
      entityIds: normalizedData?.entityIds ?? [],
      priorityOrder: normalizedData?.priorityOrder ?? [],
      idleBehavior: normalizedData?.idleBehavior ?? 'compact',
      playerOptions,
      roomValue,
      roomLabel,
      roomOptions,
      onRoomChange,
      onUpdate: (next: {
        entityIds: string[];
        priorityOrder: string[];
        idleBehavior: MediaStackIdleBehavior;
      }) => onUpdate?.(createWidgetUpdatePayload(next)),
    }),
    [normalizedData, onRoomChange, onUpdate, playerOptions, roomLabel, roomOptions, roomValue]
  );

  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) {
      setIsDialogOpen(true);
    }
  }, [onUpdate, openSettingsRequestKey]);

  const emptyDialog = (
    <Suspense fallback={null}>
      <MediaDialog
        entityId="media-stack"
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
        capabilities={EMPTY_CAPABILITIES}
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
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mediaStackSettings={mediaStackSettings}
        initialTab="stack"
      />
    </Suspense>
  );

  if (mediaDevices.length === 0) {
    return (
      <>
        <BaseCard size={size} fullBleed contentClassName="h-full">
          <div className="h-full p-4">
            <CardEmptyState
              title={t('dashboard.addCard.templates.mediaStack.name')}
              description={t('widgets.mediaStack.settings.noneAvailable')}
              icon={Radio}
            />
          </div>
        </BaseCard>
        {emptyDialog}
      </>
    );
  }

  if (configuredEntityIds.length === 0) {
    return (
      <>
        <BaseCard size={size} fullBleed contentClassName="h-full">
          <div className="h-full p-4">
            <CardEmptyState
              title={t('widgets.mediaStack.empty.title')}
              description={t('widgets.mediaStack.empty.description')}
              icon={Radio}
              actionLabel={onUpdate ? t('widgets.mediaStack.settings.players') : undefined}
              onAction={onUpdate ? () => setIsDialogOpen(true) : undefined}
            />
          </div>
        </BaseCard>
        {emptyDialog}
      </>
    );
  }

  if (!selection) {
    return (
      <>
        <BaseCard size={size} fullBleed contentClassName="h-full">
          <div className="h-full p-4">
            <CardEmptyState
              title={t('widgets.mediaStack.empty.unavailableTitle')}
              description={t('widgets.mediaStack.empty.unavailableDescription')}
              icon={Radio}
              actionLabel={onUpdate ? t('widgets.mediaStack.settings.players') : undefined}
              onAction={onUpdate ? () => setIsDialogOpen(true) : undefined}
            />
          </div>
        </BaseCard>
        {emptyDialog}
      </>
    );
  }

  return (
    <MediaCard
      id={selection.device.id}
      name={selection.device.name}
      room={selection.device.room}
      title={selection.device.title}
      artist={selection.device.artist}
      entityType={selection.device.entityType}
      deviceClass={selection.device.deviceClass}
      source={selection.device.source}
      sourceList={selection.device.sourceList}
      entityPicture={selection.device.entityPicture}
      state={selection.device.state}
      volume={selection.device.volume}
      isMuted={selection.device.isMuted}
      elapsedSeconds={selection.device.elapsedSeconds}
      durationSeconds={selection.device.durationSeconds}
      positionUpdatedAt={selection.device.positionUpdatedAt}
      mediaCapabilities={selection.device.mediaCapabilities}
      supportsGrouping={selection.device.supportsGrouping}
      supportsPreviousTrack={selection.device.supportsPreviousTrack}
      supportsNextTrack={selection.device.supportsNextTrack}
      supportedFeatures={selection.device.supportedFeatures}
      groupMembers={selection.device.groupMembers}
      size={size}
      onSizeChange={noopCardSizeChange}
      isEditMode={false}
      mediaStackAppearance
      mediaStackSettings={mediaStackSettings}
      openSettingsRequestKey={openSettingsRequestKey}
    />
  );
});
