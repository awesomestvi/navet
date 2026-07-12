import { DashboardEmptyState } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import {
  getMediaEntityTypeKey,
  type MediaEntityTypeKey,
} from '@navet/app/features/media/components/media-card/get-media-entity-type-key';
import { MediaDashboard } from '@navet/app/features/media/components/media-dashboard/media-dashboard';
import {
  useDeviceCollectionsByKeys,
  useEditMode,
  useI18n,
  useMediaQuery,
  usePersistedState,
  useTheme,
} from '@navet/app/hooks';
import type { MediaDevice } from '@navet/app/types/device.types';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import { Plus, Tv } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { EntityGrid } from './entity-grid';
import { SectionCustomizeShell } from './section-customize-shell';

const AddEntityDialog = lazy(async () => {
  const module = await import('@navet/app/features/dashboard/components/add-entity-dialog');
  return { default: module.AddEntityDialog };
});

type MediaSectionDevice = MediaDevice & { type: 'media' };

type MediaSectionGroup = {
  key: string;
  title: string;
  singularLabel: string;
  pluralLabel: string;
  devices: MediaSectionDevice[];
};

type MediaSectionLabels = {
  audioTitle: string;
  audioSingular: string;
  audioPlural: string;
  tvTitle: string;
  tvSingular: string;
  tvPlural: string;
  typeLabels: Record<MediaEntityTypeKey, string>;
};

const AUDIO_MEDIA_TYPE_KEYS = new Set<MediaEntityTypeKey>([
  'media.type.player',
  'media.type.speaker',
  'media.type.receiver',
  'media.type.soundbar',
]);

function isActiveAudioDevice(device: MediaSectionDevice) {
  if (device.state !== 'playing' && device.state !== 'paused') {
    return false;
  }

  return AUDIO_MEDIA_TYPE_KEYS.has(getMediaEntityTypeKey(device.entityType, device.deviceClass));
}

function isSpotifyAccountDevice(device: MediaSectionDevice) {
  return (
    device.id.toLowerCase().includes('spotify') || device.name.toLowerCase().includes('spotify')
  );
}

export function collapseSameRoomMediaGroups(mediaDevices: MediaSectionDevice[]) {
  const groupKey = (entityId: string, providerId: MediaSectionDevice['providerId']) =>
    `${providerId ?? 'unscoped'}:${getProviderNativeId(entityId)}`;
  const devicesByNativeId = new Map(
    mediaDevices.map((device) => [groupKey(device.id, device.providerId), device] as const)
  );
  const hiddenIds = new Set<string>();
  const stackedIds = new Set<string>();

  for (const device of mediaDevices) {
    if (hiddenIds.has(device.id) || (device.groupMembers?.length ?? 0) < 2) continue;

    const matchedMembers = [device.id, ...(device.groupMembers ?? [])]
      .map((entityId) => devicesByNativeId.get(groupKey(entityId, device.providerId)))
      .filter((member): member is MediaSectionDevice => Boolean(member))
      .filter(
        (member, index, members) => members.findIndex(({ id }) => id === member.id) === index
      );
    if (matchedMembers.length < 2) continue;

    const rooms = new Set(
      matchedMembers.map((member) => member.room.trim().toLowerCase()).filter(Boolean)
    );
    if (rooms.size !== 1) continue;

    const representative = matchedMembers[0];
    if (!representative) continue;
    stackedIds.add(representative.id);
    for (const member of matchedMembers.slice(1)) hiddenIds.add(member.id);
  }

  return {
    devices: mediaDevices.filter((device) => !hiddenIds.has(device.id)),
    cardVariantById: new Map([...stackedIds].map((id) => [id, 'media-stack'] as const)),
  };
}

export function buildMediaSections(
  mediaDevices: MediaSectionDevice[],
  labels: MediaSectionLabels
): MediaSectionGroup[] {
  const audioDevices: MediaSectionDevice[] = [];
  const tvDevices: MediaSectionDevice[] = [];
  const otherGroups = new Map<MediaEntityTypeKey, MediaSectionDevice[]>();

  for (const device of mediaDevices) {
    const mediaTypeKey = getMediaEntityTypeKey(device.entityType, device.deviceClass);

    if (AUDIO_MEDIA_TYPE_KEYS.has(mediaTypeKey)) {
      audioDevices.push(device);
      continue;
    }

    if (mediaTypeKey === 'media.type.tv') {
      tvDevices.push(device);
      continue;
    }

    const existing = otherGroups.get(mediaTypeKey);
    if (existing) {
      existing.push(device);
    } else {
      otherGroups.set(mediaTypeKey, [device]);
    }
  }

  const groupedSections: MediaSectionGroup[] = [];

  if (audioDevices.length > 0) {
    groupedSections.push({
      key: 'audio',
      title: labels.audioTitle,
      singularLabel: labels.audioSingular,
      pluralLabel: labels.audioPlural,
      devices: audioDevices,
    });
  }

  if (tvDevices.length > 0) {
    groupedSections.push({
      key: 'tv',
      title: labels.tvTitle,
      singularLabel: labels.tvSingular,
      pluralLabel: labels.tvPlural,
      devices: tvDevices,
    });
  }

  for (const [mediaTypeKey, groupedDevices] of otherGroups) {
    const singularLabel = labels.typeLabels[mediaTypeKey];
    const pluralLabel = groupedDevices.length > 1 ? `${singularLabel}s` : singularLabel;

    groupedSections.push({
      key: mediaTypeKey,
      title: pluralLabel,
      singularLabel,
      pluralLabel,
      devices: groupedDevices,
    });
  }

  return groupedSections;
}

export function MediaSection() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');
  const surface = getThemeSurfaceTokens(theme);
  const devices = useDeviceCollectionsByKeys(['media']);
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const [activeNowPlayingGroupIds, setActiveNowPlayingGroupIds] = useState<string[]>([]);
  const [collapsedSections, setCollapsedSections] = usePersistedState<Record<string, boolean>>(
    STORAGE_KEYS.mediaCollapsedSections,
    {}
  );
  const { hiddenEntityIds, hideEntity, showEntity } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      hideEntity: state.hideEntity,
      showEntity: state.showEntity,
    }))
  );
  const hiddenEntityIdSet = useMemo(() => new Set(hiddenEntityIds), [hiddenEntityIds]);
  const allMediaDevices = useMemo(
    () => devices.media.map((d) => ({ ...d, type: 'media' as const })),
    [devices.media]
  );
  const allMediaDeviceMap = useMemo(
    () => new Map(allMediaDevices.map((device) => [device.id, device])),
    [allMediaDevices]
  );
  const hiddenMediaEntityIds = useMemo(
    () =>
      allMediaDevices
        .filter((device) => hiddenEntityIdSet.has(device.id))
        .map((device) => device.id),
    [allMediaDevices, hiddenEntityIdSet]
  );
  const mediaDevices = useMemo(
    () => allMediaDevices.filter((device) => !hiddenEntityIdSet.has(device.id)),
    [allMediaDevices, hiddenEntityIdSet]
  );
  const handleRemoveEntity = useCallback(
    (entityId: string) => {
      hideEntity(entityId);
      toast.success(t('dashboard.feedback.entityRemoved'), {
        id: 'dashboard-entity-removed',
      });
    },
    [hideEntity, t]
  );
  const handleAddEntity = useCallback(
    (entityId: string) => {
      showEntity(entityId);
      toast.success(t('dashboard.feedback.entityAdded'));
    },
    [showEntity, t]
  );
  const openAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(true), []);
  const closeAddEntityDialog = useCallback(() => setIsAddEntityDialogOpen(false), []);

  const audioTitle = t('sections.media.audio.title');
  const audioSingular = t('sections.media.audio.singular');
  const audioPlural = t('sections.media.audio.plural');
  const tvTitle = t('sections.media.tv.title');
  const tvSingular = t('sections.media.tv.singular');
  const tvPlural = t('sections.media.tv.plural');
  const typeLabels = useMemo<MediaSectionLabels['typeLabels']>(
    () => ({
      'media.type.player': t('media.type.player'),
      'media.type.tv': t('media.type.tv'),
      'media.type.speaker': t('media.type.speaker'),
      'media.type.receiver': t('media.type.receiver'),
      'media.type.setTopBox': t('media.type.setTopBox'),
      'media.type.streamingBox': t('media.type.streamingBox'),
      'media.type.soundbar': t('media.type.soundbar'),
    }),
    [t]
  );

  const groupedMediaPresentation = useMemo(
    () =>
      isEditMode
        ? { devices: mediaDevices, cardVariantById: new Map<string, 'media-stack'>() }
        : collapseSameRoomMediaGroups(mediaDevices),
    [isEditMode, mediaDevices]
  );
  const activeNowPlayingGroupIdSet = useMemo(
    () => new Set(activeNowPlayingGroupIds),
    [activeNowPlayingGroupIds]
  );
  const activeNowPlayingGroupNameSet = useMemo(
    () =>
      new Set(
        mediaDevices
          .filter((device) => activeNowPlayingGroupIdSet.has(device.id))
          .map((device) => device.name.trim().toLowerCase())
          .filter(Boolean)
      ),
    [activeNowPlayingGroupIdSet, mediaDevices]
  );
  const handleActiveNowPlayingGroupChange = useCallback((entityIds: string[]) => {
    setActiveNowPlayingGroupIds((current) =>
      current.length === entityIds.length && current.every((id, index) => id === entityIds[index])
        ? current
        : entityIds
    );
  }, []);
  const toggleSectionCollapse = useCallback(
    (sectionId: string) => {
      setCollapsedSections((current) => ({
        ...current,
        [sectionId]: !current[sectionId],
      }));
    },
    [setCollapsedSections]
  );

  const sections = useMemo(() => {
    const sectionDevices = isEditMode
      ? groupedMediaPresentation.devices
      : groupedMediaPresentation.devices.filter(
          (device) =>
            !isSpotifyAccountDevice(device) &&
            !activeNowPlayingGroupIdSet.has(device.id) &&
            !activeNowPlayingGroupNameSet.has(device.name.trim().toLowerCase())
        );

    return buildMediaSections(sectionDevices, {
      audioTitle,
      audioSingular,
      audioPlural,
      tvTitle,
      tvSingular,
      tvPlural,
      typeLabels,
    });
  }, [
    audioPlural,
    audioSingular,
    audioTitle,
    activeNowPlayingGroupIdSet,
    activeNowPlayingGroupNameSet,
    isEditMode,
    groupedMediaPresentation.devices,
    tvPlural,
    tvSingular,
    tvTitle,
    typeLabels,
  ]);
  const featuredMediaDevice = useMemo(
    () =>
      mediaDevices.find((device) => device.state === 'playing' && isActiveAudioDevice(device)) ??
      mediaDevices.find(isActiveAudioDevice),
    [mediaDevices]
  );
  if (allMediaDevices.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <DashboardEmptyState
          icon={Tv}
          title={t('sections.media.emptyTitle')}
          description={t('sections.media.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const addHiddenEntityAction =
    isEditMode && hiddenMediaEntityIds.length > 0 ? (
      <InteractivePill
        intent="action"
        size="small"
        onClick={openAddEntityDialog}
        className={`${surface.subtleBg} ${surface.hoverBg}`}
      >
        <Plus className={`h-4 w-4 ${surface.textSecondary}`} />
        <span className={`hidden text-sm font-medium md:inline ${surface.textSecondary}`}>
          {t('dashboard.addEntity.title')}
        </span>
      </InteractivePill>
    ) : null;

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative space-y-8"
      actions={isMobileViewport ? null : addHiddenEntityAction}
      showCustomizeButton={false}
    >
      {!isEditMode ? (
        <MediaDashboard
          devices={mediaDevices}
          initialDeviceId={featuredMediaDevice?.id}
          onActiveGroupChange={handleActiveNowPlayingGroupChange}
        />
      ) : null}

      {sections.length > 0 ? (
        sections.map((section) => (
          <EntityGrid
            key={section.key}
            devices={section.devices}
            rawDevices={devices}
            title={section.title}
            singularLabel={section.singularLabel}
            pluralLabel={section.pluralLabel}
            isEditMode={isEditMode}
            cardSizeStorageKey="mediaSectionCardSizes"
            onRemoveEntity={handleRemoveEntity}
            allowEntityRemoval
            usesHideAction
            cardVariantById={groupedMediaPresentation.cardVariantById}
            sectionId={section.key}
            isCollapsed={
              section.key === 'audio' || section.key === 'tv'
                ? (collapsedSections[section.key] ?? false)
                : false
            }
            onToggleCollapse={
              section.key === 'audio' || section.key === 'tv'
                ? () => toggleSectionCollapse(section.key)
                : undefined
            }
          />
        ))
      ) : isEditMode ? (
        <div className="flex h-full items-center justify-center p-6 pt-14">
          <DashboardEmptyState
            icon={Tv}
            title={t('sections.media.emptyTitle')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionIcon={Plus}
            actionLabel={t('dashboard.addEntity.title')}
            onAction={openAddEntityDialog}
            className="w-full max-w-md"
          />
        </div>
      ) : null}

      {isAddEntityDialogOpen ? (
        <Suspense fallback={null}>
          <AddEntityDialog
            open={isAddEntityDialogOpen}
            onClose={closeAddEntityDialog}
            onAddEntity={handleAddEntity}
            currentRoom={ALL_ROOMS_ID}
            deviceMap={allMediaDeviceMap}
            addedEntityIds={[]}
            visibleEntityIds={hiddenMediaEntityIds}
            title={t('dashboard.addEntity.title')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
            actionLabel={t('dashboard.addEntity.action')}
          />
        </Suspense>
      ) : null}
    </SectionCustomizeShell>
  );
}
