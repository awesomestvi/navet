import { DashboardEmptyState, DashboardGroupingNavigation } from '@navet/app/components/patterns';
import { CardEditActionButton } from '@navet/app/components/shared/card-edit-action-button';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  DashboardCardEditBackdrop,
  DashboardCardEditDock,
} from '@navet/app/features/dashboard/components/dashboard-card-item';
import { DashboardResizeTrigger } from '@navet/app/features/dashboard/components/dashboard-edit-actions';
import { MediaStackWidget } from '@navet/app/features/dashboard/components/widgets/media-stack-widget';
import { useDashboardEntitiesStore } from '@navet/app/features/dashboard/stores/dashboard-entities-store';
import type { MediaDialogMediaStackSettings } from '@navet/app/features/media/components/media/media-dialog.types';
import {
  getMediaEntityTypeKey,
  type MediaEntityTypeKey,
} from '@navet/app/features/media/components/media-card/get-media-entity-type-key';
import { MediaDashboard } from '@navet/app/features/media/components/media-dashboard/media-dashboard';
import {
  useDeviceCollectionsByKeys,
  useEditMode,
  useI18n,
  usePersistedState,
  useTheme,
} from '@navet/app/hooks';
import type { MediaDevice } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { getProviderNativeId } from '@navet/app/utils/provider-ids';
import { Settings2, Tv, X } from 'lucide-react';
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { EntityGrid } from './entity-grid';
import {
  getAvailableMediaDisplayGroupEntityIds,
  getMediaDisplayGroupAnchorId,
  getMediaDisplayGroupMemberIds,
  isMediaDisplayGroupVisible,
  type MediaDisplayGroup,
  normalizeMediaDisplayGroups,
} from './media-display-groups';
import { SectionCustomizeShell } from './section-customize-shell';

const AddEntityDialog = lazy(async () => {
  const module = await import('@navet/app/features/dashboard/components/add-entity-dialog');
  return { default: module.AddEntityDialog };
});

type MediaSectionDevice = MediaDevice & { type: 'media' };
type MediaGroupingMode = 'type' | 'room';

function getMediaStackCardSize(size: CardSize): CardSize {
  return size === 'small' || size === 'large' ? size : 'medium';
}

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

export function buildMediaRoomSections(
  mediaDevices: MediaSectionDevice[],
  singularLabel: string,
  pluralLabel: string
): MediaSectionGroup[] {
  const devicesByRoom = new Map<string, MediaSectionDevice[]>();

  for (const device of mediaDevices) {
    const room = getDeviceRoomLabel(device);
    const roomDevices = devicesByRoom.get(room);
    if (roomDevices) {
      roomDevices.push(device);
    } else {
      devicesByRoom.set(room, [device]);
    }
  }

  return [...devicesByRoom.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([room, roomDevices]) => ({
      key: `room-${encodeURIComponent(room)}`,
      title: room,
      singularLabel,
      pluralLabel,
      devices: roomDevices,
    }));
}

export function excludePromotedMediaDevices(
  mediaDevices: MediaSectionDevice[],
  promotedEntityIds: string[],
  identityDevices: MediaSectionDevice[] = mediaDevices
) {
  const promotedEntityIdSet = new Set(promotedEntityIds);
  const promotedDeviceNameSet = new Set(
    identityDevices
      .filter((device) => promotedEntityIdSet.has(device.id))
      .map((device) => device.name.trim().toLowerCase())
      .filter(Boolean)
  );

  return mediaDevices.filter(
    (device) =>
      !promotedEntityIdSet.has(device.id) &&
      !promotedDeviceNameSet.has(device.name.trim().toLowerCase())
  );
}

export function MediaSection({ addEntityRequestKey = 0 }: { addEntityRequestKey?: number }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const devices = useDeviceCollectionsByKeys(['media']);
  const { isEditMode, toggleEditMode } = useEditMode();
  const [isAddEntityDialogOpen, setIsAddEntityDialogOpen] = useState(false);
  const previousAddEntityRequestKey = useRef(addEntityRequestKey);
  useEffect(() => {
    if (addEntityRequestKey > previousAddEntityRequestKey.current && isEditMode) {
      setIsAddEntityDialogOpen(true);
    }
    previousAddEntityRequestKey.current = addEntityRequestKey;
  }, [addEntityRequestKey, isEditMode]);
  const [promotedMediaEntityIds, setPromotedMediaEntityIds] = useState<string[]>([]);
  const [groupingMode, setGroupingMode] = useState<MediaGroupingMode>('type');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Record<MediaGroupingMode, string>>({
    type: '',
    room: '',
  });
  const [storedDisplayGroups, setStoredDisplayGroups] = usePersistedState<MediaDisplayGroup[]>(
    STORAGE_KEYS.mediaDisplayGroups,
    []
  );
  const [displayGroupSettingsRequests, setDisplayGroupSettingsRequests] = useState<
    Record<string, number>
  >({});
  const displayGroups = useMemo(
    () => normalizeMediaDisplayGroups(storedDisplayGroups),
    [storedDisplayGroups]
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
  const visibleMediaEntityIds = useMemo(
    () => mediaDevices.map((device) => device.id),
    [mediaDevices]
  );
  const visibleDisplayGroups = useMemo(
    () =>
      isEditMode
        ? displayGroups
        : displayGroups.filter((group) => isMediaDisplayGroupVisible(group, mediaDevices)),
    [displayGroups, isEditMode, mediaDevices]
  );
  const groupedMediaEntityIds = useMemo(
    () => getMediaDisplayGroupMemberIds(visibleDisplayGroups),
    [visibleDisplayGroups]
  );
  const stackAnchorEntityIds = useMemo(
    () =>
      new Set(
        visibleDisplayGroups
          .map(getMediaDisplayGroupAnchorId)
          .filter((entityId): entityId is string => Boolean(entityId))
      ),
    [visibleDisplayGroups]
  );
  const stackedSecondaryEntityIds = useMemo(
    () =>
      new Set([...groupedMediaEntityIds].filter((entityId) => !stackAnchorEntityIds.has(entityId))),
    [groupedMediaEntityIds, stackAnchorEntityIds]
  );
  const removeDisplayGroup = useCallback(
    (groupId: string) => {
      if (!window.confirm(t('widgets.deleteConfirm'))) return;
      setStoredDisplayGroups((current) =>
        normalizeMediaDisplayGroups(current).filter((group) => group.id !== groupId)
      );
    },
    [setStoredDisplayGroups, t]
  );
  const updateDisplayGroupSize = useCallback(
    (groupId: string, size: CardSize) => {
      setStoredDisplayGroups((current) =>
        normalizeMediaDisplayGroups(current).map((group) =>
          group.id === groupId ? { ...group, size } : group
        )
      );
    },
    [setStoredDisplayGroups]
  );
  const updateMediaCardStack = useCallback(
    (
      anchorDevice: MediaSectionDevice,
      next: Parameters<MediaDialogMediaStackSettings['onUpdate']>[0]
    ) => {
      setStoredDisplayGroups((current) => {
        const groups = normalizeMediaDisplayGroups(current);
        const existingGroup = groups.find(
          (group) => getMediaDisplayGroupAnchorId(group) === anchorDevice.id
        );
        const availableIds = new Set(
          getAvailableMediaDisplayGroupEntityIds(
            existingGroup?.id ?? '',
            groups,
            visibleMediaEntityIds
          )
        );
        availableIds.add(anchorDevice.id);
        const entityIds = [
          anchorDevice.id,
          ...next.entityIds.filter((entityId) => entityId !== anchorDevice.id),
        ].filter(
          (entityId, index, ids) => availableIds.has(entityId) && ids.indexOf(entityId) === index
        );

        if (entityIds.length < 2) {
          return existingGroup ? groups.filter((group) => group.id !== existingGroup.id) : groups;
        }

        const priorityOrder = [
          ...next.priorityOrder.filter((entityId) => entityIds.includes(entityId)),
          ...entityIds.filter((entityId) => !next.priorityOrder.includes(entityId)),
        ];
        const data = { ...next, entityIds, priorityOrder };

        if (existingGroup) {
          return groups.map((group) =>
            group.id === existingGroup.id
              ? { ...group, anchorEntityId: anchorDevice.id, data }
              : group
          );
        }

        return [
          ...groups,
          {
            id: `media-group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            anchorEntityId: anchorDevice.id,
            size: getMediaStackCardSize(anchorDevice.size),
            data,
          },
        ];
      });
    },
    [setStoredDisplayGroups, visibleMediaEntityIds]
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
  const mediaStackSettingsById = useMemo(() => {
    const settings = new Map<string, MediaDialogMediaStackSettings>();

    for (const device of mediaDevices) {
      const group = displayGroups.find(
        (candidate) => getMediaDisplayGroupAnchorId(candidate) === device.id
      );
      const availableIds = new Set(
        getAvailableMediaDisplayGroupEntityIds(
          group?.id ?? '',
          displayGroups,
          visibleMediaEntityIds
        )
      );
      availableIds.add(device.id);
      const entityIds = group?.data.entityIds?.filter((entityId) => availableIds.has(entityId)) ?? [
        device.id,
      ];
      const priorityOrder = group?.data.priorityOrder?.filter((entityId) =>
        entityIds.includes(entityId)
      ) ?? [device.id];

      settings.set(device.id, {
        entityIds: entityIds.includes(device.id) ? entityIds : [device.id, ...entityIds],
        requiredEntityIds: [device.id],
        priorityOrder: priorityOrder.includes(device.id)
          ? priorityOrder
          : [device.id, ...priorityOrder],
        idleBehavior: group?.data.idleBehavior ?? 'compact',
        playerOptions: mediaDevices
          .filter((candidate) => availableIds.has(candidate.id))
          .map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            room: candidate.room,
            subtitle: candidate.entityType ?? t('media.type.player'),
          })),
        onUpdate: (next) => updateMediaCardStack(device, next),
      });
    }

    return settings;
  }, [displayGroups, mediaDevices, t, updateMediaCardStack, visibleMediaEntityIds]);

  const groupedMediaPresentation = useMemo(
    () =>
      isEditMode
        ? { devices: mediaDevices, cardVariantById: new Map<string, 'media-stack'>() }
        : collapseSameRoomMediaGroups(mediaDevices),
    [isEditMode, mediaDevices]
  );
  const handlePromotedEntitiesChange = useCallback((entityIds: string[]) => {
    setPromotedMediaEntityIds((current) =>
      current.length === entityIds.length && current.every((id, index) => id === entityIds[index])
        ? current
        : entityIds
    );
  }, []);
  const featuredMediaDevice = useMemo(
    () =>
      mediaDevices.find((device) => device.state === 'playing' && isActiveAudioDevice(device)) ??
      mediaDevices.find(isActiveAudioDevice),
    [mediaDevices]
  );
  const promotedEntityIdsForSections = useMemo(
    () =>
      promotedMediaEntityIds.length > 0
        ? promotedMediaEntityIds
        : featuredMediaDevice
          ? [featuredMediaDevice.id]
          : [],
    [featuredMediaDevice, promotedMediaEntityIds]
  );

  const sectionDevices = useMemo(() => {
    const availableCards = groupedMediaPresentation.devices.filter(
      (device) => !stackedSecondaryEntityIds.has(device.id)
    );
    if (isEditMode) return availableCards;

    return excludePromotedMediaDevices(
      availableCards.filter((device) => !isSpotifyAccountDevice(device)),
      promotedEntityIdsForSections.filter((entityId) => !stackAnchorEntityIds.has(entityId)),
      mediaDevices
    );
  }, [
    groupedMediaPresentation.devices,
    isEditMode,
    mediaDevices,
    promotedEntityIdsForSections,
    stackAnchorEntityIds,
    stackedSecondaryEntityIds,
  ]);
  const typeSections = useMemo(
    () =>
      buildMediaSections(sectionDevices, {
        audioTitle,
        audioSingular,
        audioPlural,
        tvTitle,
        tvSingular,
        tvPlural,
        typeLabels,
      }),
    [
      audioPlural,
      audioSingular,
      audioTitle,
      sectionDevices,
      tvPlural,
      tvSingular,
      tvTitle,
      typeLabels,
    ]
  );
  const roomSections = useMemo(
    () =>
      buildMediaRoomSections(
        sectionDevices,
        t('sections.media.singular'),
        t('sections.media.plural')
      ),
    [sectionDevices, t]
  );
  const sections = groupingMode === 'type' ? typeSections : roomSections;
  const requestedGroupId = selectedGroupIds[groupingMode];
  const selectedSection =
    sections.find((section) => section.key === requestedGroupId) ?? sections[0] ?? null;
  const handleGroupChange = useCallback(
    (groupId: string) => {
      setSelectedGroupIds((current) => ({ ...current, [groupingMode]: groupId }));
    },
    [groupingMode]
  );
  const stackCardReplacementById = new Map<string, { size: CardSize; node: ReactNode }>();
  for (const group of visibleDisplayGroups) {
    const anchorEntityId = getMediaDisplayGroupAnchorId(group);
    const anchorDevice = anchorEntityId ? allMediaDeviceMap.get(anchorEntityId) : undefined;
    if (!anchorEntityId || !anchorDevice) continue;

    stackCardReplacementById.set(anchorEntityId, {
      size: group.size,
      node: (
        <div className="relative h-full min-w-0">
          {isEditMode ? (
            <>
              <DashboardCardEditBackdrop size={group.size} />
              <DashboardCardEditDock cardSize={group.size}>
                <CardEditActionButton
                  cardSize={group.size}
                  Icon={X}
                  inline
                  theme={theme}
                  variant="destructive"
                  aria-label={t('widgets.delete')}
                  onClick={() => removeDisplayGroup(group.id)}
                />
                <DashboardResizeTrigger
                  cardSize={group.size}
                  allowedSizes={['small', 'medium', 'large']}
                  onSizeChange={(size) => updateDisplayGroupSize(group.id, size)}
                  inline
                />
                <CardEditActionButton
                  cardSize={group.size}
                  Icon={Settings2}
                  inline
                  theme={theme}
                  variant="accent"
                  aria-label={t('widgets.mediaStack.settings.title')}
                  onClick={() =>
                    setDisplayGroupSettingsRequests((current) => ({
                      ...current,
                      [group.id]: (current[group.id] ?? 0) + 1,
                    }))
                  }
                />
              </DashboardCardEditDock>
            </>
          ) : null}
          <div
            inert={isEditMode || undefined}
            className={isEditMode ? 'pointer-events-none h-full' : 'h-full'}
          >
            <MediaStackWidget
              size={group.size}
              data={group.data}
              anchorEntityId={anchorEntityId}
              openSettingsRequestKey={displayGroupSettingsRequests[group.id] ?? 0}
              availableEntityIds={getAvailableMediaDisplayGroupEntityIds(
                group.id,
                displayGroups,
                visibleMediaEntityIds
              )}
              onUpdate={(data) => updateMediaCardStack(anchorDevice, data)}
            />
          </div>
        </div>
      ),
    });
  }
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

  return (
    <SectionCustomizeShell
      isEditMode={isEditMode}
      onToggle={toggleEditMode}
      className="relative space-y-6 md:space-y-7"
      actions={null}
      showCustomizeButton={false}
    >
      {!isEditMode ? (
        <MediaDashboard
          devices={mediaDevices}
          initialDeviceId={featuredMediaDevice?.id}
          onPromotedEntitiesChange={handlePromotedEntitiesChange}
        />
      ) : null}

      {selectedSection || visibleDisplayGroups.length > 0 ? (
        <div className="space-y-4">
          {selectedSection ? (
            <DashboardGroupingNavigation
              ariaLabel={t('sections.media.title')}
              groupingLabel={t('dashboard.roomNav.grouping.label')}
              idPrefix="media-group"
              items={sections.map((section) => ({ id: section.key, label: section.title }))}
              modes={[
                { id: 'type', label: t('dashboard.roomNav.grouping.type') },
                { id: 'room', label: t('dashboard.roomNav.grouping.room') },
              ]}
              selectedItemId={selectedSection.key}
              selectedModeId={groupingMode}
              onModeChange={(modeId) => {
                if (modeId === 'type' || modeId === 'room') setGroupingMode(modeId);
              }}
              onItemChange={handleGroupChange}
            />
          ) : null}
          <div
            role="tabpanel"
            id={`media-group-panel-${selectedSection?.key ?? 'stacks'}`}
            aria-labelledby={selectedSection ? `media-group-tab-${selectedSection.key}` : undefined}
          >
            <EntityGrid
              devices={selectedSection?.devices ?? []}
              rawDevices={devices}
              title={selectedSection?.title ?? t('dashboard.addCard.templates.mediaStack.name')}
              singularLabel={selectedSection?.singularLabel ?? t('sections.media.singular')}
              pluralLabel={selectedSection?.pluralLabel ?? t('sections.media.plural')}
              isEditMode={isEditMode}
              cardSizeStorageKey="mediaSectionCardSizes"
              onRemoveEntity={handleRemoveEntity}
              allowEntityRemoval
              usesHideAction
              cardVariantById={groupedMediaPresentation.cardVariantById}
              cardReplacementById={stackCardReplacementById}
              mediaStackSettingsById={mediaStackSettingsById}
              sectionId={selectedSection?.key ?? 'stacks'}
              showHeader={false}
            />
          </div>
        </div>
      ) : isEditMode ? (
        <div className="flex h-full items-center justify-center p-6 pt-14">
          <DashboardEmptyState
            icon={Tv}
            title={t('sections.media.emptyTitle')}
            description={t('dashboard.addEntity.descriptionWithHidden')}
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
