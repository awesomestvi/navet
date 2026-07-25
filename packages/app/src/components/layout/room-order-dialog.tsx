import {
  RoomAppearanceDialog,
  RoomDeleteImpactDialog,
  RoomNameDialog,
  type RoomSymbolChoice,
  RoomsWorkspaceDialog,
  RoomTargetDialog,
  type RoomTargetDialogCandidate,
  type RoomWorkspaceLabels,
} from '@navet/app/features/dashboard/rooms/components';
import {
  type RoomWorkspacePendingOperation,
  useRoomWorkspaceController,
} from '@navet/app/features/dashboard/rooms/use-room-workspace-controller';
import { useI18n } from '@navet/app/hooks';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface RoomOrderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: string[];
  hiddenRoomNames?: string[];
  manageableRooms: PlatformManageableRoomReference[];
  roomHiddenItemCounts: Map<string, number>;
  roomEntityCounts: Map<string, number>;
  onRoomOrderChange?: (rooms: string[]) => void;
  onHiddenRoomsChange?: (rooms: string[]) => void;
}

const ROOM_SYMBOLS = ['⌂', '◫', '⌁', '☾', '◌', '◇', '✦', '▱', '△', '○', '≈', '□'] as const;

function getProviderLabel(providerId: PlatformManageableRoomReference['providerId']): string {
  switch (providerId) {
    case 'home_assistant':
      return 'Home Assistant';
    case 'homey':
      return 'Homey';
    case 'openhab':
      return 'openHAB';
    case 'hubitat':
      return 'Hubitat';
    case 'smartthings':
      return 'SmartThings';
  }
}

function buildRoomWorkspaceLabels(t: ReturnType<typeof useI18n>['t']): RoomWorkspaceLabels {
  return {
    title: t('dashboard.roomsWorkspace.title'),
    description: t('dashboard.roomsWorkspace.description'),
    browseMode: t('dashboard.roomsWorkspace.browseMode'),
    manageMode: t('dashboard.roomsWorkspace.manageMode'),
    searchLabel: t('dashboard.roomsWorkspace.searchLabel'),
    searchPlaceholder: t('dashboard.roomsWorkspace.searchPlaceholder'),
    clearSearch: t('dashboard.roomsWorkspace.clearSearch'),
    roomsRegion: t('dashboard.roomsWorkspace.roomsRegion'),
    workspaceRegion: t('dashboard.roomsWorkspace.workspaceRegion'),
    contextRegion: t('dashboard.roomsWorkspace.contextRegion'),
    structureTitle: t('dashboard.roomsWorkspace.structureTitle'),
    structureDescription: t('dashboard.roomsWorkspace.structureDescription'),
    roomDetailsTitle: t('dashboard.roomsWorkspace.roomDetailsTitle'),
    roomDetailsDescription: t('dashboard.roomsWorkspace.roomDetailsDescription'),
    devicesTitle: t('dashboard.roomsWorkspace.devicesTitle'),
    devicesDescription: t('dashboard.roomsWorkspace.devicesDescription'),
    impactTitle: t('dashboard.roomsWorkspace.impactTitle'),
    impactDescription: t('dashboard.roomsWorkspace.impactDescription'),
    addRoom: t('dashboard.roomsWorkspace.addRoom'),
    addRoomToGroup: t('dashboard.roomsWorkspace.addRoomToGroup'),
    addGroup: t('dashboard.roomsWorkspace.addGroup'),
    moreActions: t('dashboard.roomsWorkspace.moreActions'),
    renameGroup: t('dashboard.roomsWorkspace.renameGroup'),
    deleteGroup: t('dashboard.roomsWorkspace.deleteGroup'),
    editRoom: t('dashboard.roomsWorkspace.editRoom'),
    mergeRoom: t('dashboard.roomsWorkspace.mergeRoom'),
    mergeRoomDescription: t('dashboard.roomsWorkspace.mergeRoomDescription'),
    splitRoom: t('dashboard.roomsWorkspace.splitRoom'),
    splitRoomDescription: t('dashboard.roomsWorkspace.splitRoomDescription'),
    manageDevices: t('dashboard.roomsWorkspace.manageDevices'),
    reviewChanges: t('dashboard.roomsWorkspace.reviewChanges'),
    saveChanges: t('dashboard.roomsWorkspace.saveChanges'),
    cancel: t('dashboard.roomsWorkspace.cancel'),
    back: t('dashboard.roomsWorkspace.back'),
    retry: t('dashboard.roomsWorkspace.retry'),
    roomNameLabel: t('dashboard.roomsWorkspace.roomNameLabel'),
    roomNamePlaceholder: t('dashboard.roomsWorkspace.roomNamePlaceholder'),
    groupLabel: t('dashboard.roomsWorkspace.createRoom.groupLabel'),
    ungroupedGroup: t('dashboard.roomsWorkspace.createRoom.ungrouped'),
    visibilityLabel: t('dashboard.roomsWorkspace.visibilityLabel'),
    visibilityDescription: t('dashboard.roomsWorkspace.visibilityDescription'),
    favoriteLabel: t('dashboard.roomsWorkspace.favoriteLabel'),
    favoriteDescription: t('dashboard.roomsWorkspace.favoriteDescription'),
    appearanceLabel: t('dashboard.roomsWorkspace.appearanceLabel'),
    appearanceDescription: t('dashboard.roomsWorkspace.appearanceDescription'),
    chooseAppearance: t('dashboard.roomsWorkspace.chooseAppearance'),
    deleteRoom: t('dashboard.roomsWorkspace.deleteRoom'),
    deleteRoomDescription: t('dashboard.roomsWorkspace.deleteRoomDescription'),
    dragRoom: (roomName) =>
      t('dashboard.roomNav.reorderDialog.dragRoom', {
        room: roomName,
      }),
    moveEarlier: t('dashboard.roomsWorkspace.moveEarlier'),
    moveLater: t('dashboard.roomsWorkspace.moveLater'),
    selectRoom: t('dashboard.roomsWorkspace.selectRoom'),
    collapseGroup: t('dashboard.roomsWorkspace.collapseGroup'),
    expandGroup: t('dashboard.roomsWorkspace.expandGroup'),
    selectAll: t('dashboard.roomsWorkspace.selectAll'),
    clearSelection: t('dashboard.roomsWorkspace.clearSelection'),
    selected: t('dashboard.roomsWorkspace.selected'),
    unavailable: t('dashboard.roomsWorkspace.unavailable'),
    noRoomsFoundTitle: t('dashboard.roomsWorkspace.noRoomsFoundTitle'),
    noRoomsFoundDescription: t('dashboard.roomsWorkspace.noRoomsFoundDescription'),
    selectRoomTitle: t('dashboard.roomsWorkspace.selectRoomTitle'),
    selectRoomDescription: t('dashboard.roomsWorkspace.selectRoomDescription'),
    noDevicesTitle: t('dashboard.roomsWorkspace.noDevicesTitle'),
    noDevicesDescription: t('dashboard.roomsWorkspace.noDevicesDescription'),
    noChangesTitle: t('dashboard.roomsWorkspace.noChangesTitle'),
    noChangesDescription: t('dashboard.roomsWorkspace.noChangesDescription'),
    currentRoomTitle: t('dashboard.roomsWorkspace.currentRoomTitle'),
    roomActivityTitle: t('dashboard.roomsWorkspace.roomActivityTitle'),
    roomActionsTitle: t('dashboard.roomsWorkspace.roomActionsTitle'),
    pendingChangesTitle: t('dashboard.roomsWorkspace.pendingChangesTitle'),
    unsavedChanges: t('dashboard.roomsWorkspace.unsavedChanges'),
    allChangesSaved: t('dashboard.roomsWorkspace.allChangesSaved'),
    closeSheet: t('dashboard.roomsWorkspace.closeSheet'),
  };
}

function resolveNameDialogCopy(
  operation: RoomWorkspacePendingOperation,
  t: ReturnType<typeof useI18n>['t']
) {
  switch (operation.kind) {
    case 'create-room':
      return {
        title: t('dashboard.roomsWorkspace.createRoom.title'),
        description: t('dashboard.roomsWorkspace.createRoom.description'),
        label: t('dashboard.roomsWorkspace.createRoom.nameLabel'),
        placeholder: t('dashboard.roomsWorkspace.createRoom.namePlaceholder'),
        confirm: t('dashboard.roomsWorkspace.createRoom.action'),
      };
    case 'create-group':
      return {
        title: t('dashboard.roomsWorkspace.createGroup.title'),
        description: t('dashboard.roomsWorkspace.createGroup.description'),
        label: t('dashboard.roomsWorkspace.createGroup.nameLabel'),
        placeholder: t('dashboard.roomsWorkspace.createGroup.namePlaceholder'),
        confirm: t('dashboard.roomsWorkspace.createGroup.action'),
      };
    case 'rename-group':
      return {
        title: t('dashboard.roomsWorkspace.renameGroup.title'),
        description: t('dashboard.roomsWorkspace.renameGroup.description'),
        label: t('dashboard.roomsWorkspace.renameGroup.nameLabel'),
        placeholder: t('dashboard.roomsWorkspace.createGroup.namePlaceholder'),
        confirm: t('dashboard.roomsWorkspace.renameGroup.action'),
      };
    case 'rename-room':
      return {
        title: t('dashboard.roomsWorkspace.editRoom'),
        description: t('dashboard.roomsWorkspace.roomDetailsDescription'),
        label: t('dashboard.roomsWorkspace.roomNameLabel'),
        placeholder: t('dashboard.roomsWorkspace.roomNamePlaceholder'),
        confirm: t('dashboard.roomsWorkspace.editRoom'),
      };
    case 'split-room':
      return {
        title: t('dashboard.roomsWorkspace.split.title'),
        description: t('dashboard.roomsWorkspace.split.description'),
        label: t('dashboard.roomsWorkspace.split.nameLabel'),
        placeholder: t('dashboard.roomsWorkspace.split.namePlaceholder'),
        confirm: t('dashboard.roomsWorkspace.split.action'),
      };
    default:
      return null;
  }
}

function getOperationRoomId(operation: RoomWorkspacePendingOperation | null): string | null {
  if (!operation) {
    return null;
  }
  switch (operation.kind) {
    case 'appearance':
    case 'delete-room':
    case 'rename-room':
      return operation.roomId;
    case 'merge-room':
    case 'split-room':
      return operation.sourceRoomId;
    default:
      return null;
  }
}

export function RoomOrderDialog({
  isOpen,
  onOpenChange,
  manageableRooms,
  roomHiddenItemCounts,
  roomEntityCounts,
  onRoomOrderChange,
  onHiddenRoomsChange,
}: RoomOrderDialogProps) {
  const { t } = useI18n();
  const controller = useRoomWorkspaceController({
    isOpen,
    manageableRooms,
    roomHiddenItemCounts,
    roomEntityCounts,
    onRoomOrderChange,
    onHiddenRoomsChange,
  });
  const labels = useMemo(() => buildRoomWorkspaceLabels(t), [t]);
  const roomSymbolChoices = useMemo<readonly RoomSymbolChoice[]>(
    () =>
      ROOM_SYMBOLS.map((symbol, index) => ({
        value: symbol,
        glyph: symbol,
        label: `${t('dashboard.roomsWorkspace.appearance.iconLabel')} ${index + 1}`,
      })),
    [t]
  );
  const [operationName, setOperationName] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedDeleteDestinationId, setSelectedDeleteDestinationId] = useState<string | null>(
    null
  );
  const [appearanceSymbol, setAppearanceSymbol] = useState<string | null>(null);
  const [appearanceImage, setAppearanceImage] = useState<
    NonNullable<typeof controller.draftWorkspace>['rooms'][number]['metadata']['image'] | null
  >(null);
  const operation = controller.pendingOperation;
  const operationRoomId = getOperationRoomId(operation);
  const operationRoom = controller.draftWorkspace?.rooms.find(
    (room) => room.id === operationRoomId
  );
  const operationGroup =
    operation?.kind === 'rename-group' ||
    operation?.kind === 'appearance-group' ||
    operation?.kind === 'delete-group'
      ? controller.draftWorkspace?.groups.find((group) => group.id === operation.groupId)
      : null;

  useEffect(() => {
    if (!operation) {
      setOperationName('');
      setTargetQuery('');
      setSelectedTargetId(null);
      setSelectedDeleteDestinationId(null);
      return;
    }

    if (operation.kind === 'rename-group') {
      setOperationName(operationGroup?.displayName ?? '');
    } else if (operation.kind === 'rename-room') {
      setOperationName(operationRoom?.displayName ?? '');
    } else if (operation.kind === 'split-room') {
      setOperationName(
        operationRoom
          ? `${operationRoom.displayName} 2`
          : t('dashboard.roomsWorkspace.split.namePlaceholder')
      );
    } else {
      setOperationName('');
    }

    if (operation.kind === 'appearance' || operation.kind === 'appearance-group') {
      setAppearanceSymbol(
        operation.kind === 'appearance'
          ? (operationRoom?.metadata.symbol ?? null)
          : (operationGroup?.symbol ?? null)
      );
      setAppearanceImage(
        operation.kind === 'appearance' ? (operationRoom?.metadata.image ?? null) : null
      );
    }
    setTargetQuery('');
    setSelectedTargetId(null);
    setSelectedDeleteDestinationId(null);
  }, [operation, operationGroup?.displayName, operationGroup?.symbol, operationRoom, t]);

  useEffect(() => {
    switch (controller.saveOutcome.kind) {
      case 'saved':
        toast.success(t('dashboard.roomsWorkspace.save.success'));
        break;
      case 'partial':
        toast.warning(t('dashboard.roomsWorkspace.save.partial'));
        break;
      case 'error':
        toast.error(t('dashboard.roomsWorkspace.save.failure'));
        break;
      default:
        break;
    }
  }, [controller.saveOutcome, t]);

  useEffect(() => {
    if (!isOpen || !controller.viewModel.hasUnsavedChanges) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [controller.viewModel.hasUnsavedChanges, isOpen]);

  const roomNames = useMemo(
    () =>
      new Set(
        (controller.draftWorkspace?.rooms ?? [])
          .filter((room) => operation?.kind !== 'rename-room' || room.id !== operation.roomId)
          .map((room) => room.displayName.trim().toLocaleLowerCase())
      ),
    [controller.draftWorkspace, operation]
  );
  const groupNames = useMemo(
    () =>
      new Set(
        (controller.draftWorkspace?.groups ?? [])
          .filter((group) => group.id !== operationGroup?.id)
          .map((group) => group.displayName.trim().toLocaleLowerCase())
      ),
    [controller.draftWorkspace, operationGroup?.id]
  );
  const normalizedOperationName = operationName.trim().toLocaleLowerCase();
  const nameValidationMessage = !normalizedOperationName
    ? t('dashboard.roomsWorkspace.validation.nameRequired')
    : operation?.kind === 'create-group' || operation?.kind === 'rename-group'
      ? groupNames.has(normalizedOperationName)
        ? t('dashboard.roomsWorkspace.validation.duplicateGroup')
        : undefined
      : roomNames.has(normalizedOperationName)
        ? t('dashboard.roomsWorkspace.validation.duplicateRoom')
        : undefined;
  const nameDialogCopy = operation ? resolveNameDialogCopy(operation, t) : null;
  const mergeCandidates = useMemo<RoomTargetDialogCandidate[]>(
    () =>
      (controller.draftWorkspace?.rooms ?? [])
        .filter((room) => room.id !== operationRoomId)
        .sort((left, right) => left.metadata.order - right.metadata.order)
        .map((room) => ({
          id: room.id,
          name: room.displayName,
          groupName: controller.draftWorkspace?.groups.find(
            (group) => group.id === room.metadata.groupId
          )?.displayName,
          summary:
            controller.viewModel.rooms.find((viewRoom) => viewRoom.id === room.id)?.deviceSummary ??
            '',
        })),
    [controller.draftWorkspace, controller.viewModel.rooms, operationRoomId]
  );
  const affectedDeviceCount = operationRoomId
    ? (controller.roomDeviceCounts.get(operationRoomId) ?? 0)
    : 0;
  const affectedDeviceCountLabel = t(
    affectedDeviceCount === 1
      ? 'dashboard.roomsWorkspace.counts.devices.one'
      : 'dashboard.roomsWorkspace.counts.devices.other',
    { count: affectedDeviceCount }
  );
  const deleteDestinations = useMemo(
    () =>
      (controller.draftWorkspace?.rooms ?? [])
        .filter((room) => room.id !== operationRoomId)
        .sort((left, right) => left.metadata.order - right.metadata.order)
        .map((room) => ({ id: room.id, name: room.displayName })),
    [controller.draftWorkspace, operationRoomId]
  );
  const selectedDeleteDestination = deleteDestinations.find(
    (room) => room.id === selectedDeleteDestinationId
  );
  const providerDeletionSource =
    operation?.kind === 'delete-room' && operationRoom?.sourceRefs.length === 1
      ? operationRoom.sourceRefs[0]
      : null;
  const providerDeletionRoom = providerDeletionSource
    ? manageableRooms.find(
        (room) => room.id === providerDeletionSource.canonicalId && room.canDelete
      )
    : null;
  const providerDeletionLabel = providerDeletionSource
    ? getProviderLabel(providerDeletionSource.providerId)
    : '';
  const deleteDeviceAccessibleSummary = selectedDeleteDestination
    ? t('dashboard.roomsWorkspace.deleteConfirmation.deviceMoveSummary', {
        count: affectedDeviceCountLabel,
        room: selectedDeleteDestination.name,
      })
    : providerDeletionRoom
      ? t('dashboard.roomsWorkspace.deleteConfirmation.deviceUnassignSummary', {
          count: affectedDeviceCountLabel,
          provider: providerDeletionLabel,
        })
      : t('dashboard.roomsWorkspace.deleteConfirmation.deviceRestoreSummary', {
          count: affectedDeviceCountLabel,
        });
  const deleteDeviceSummary = deleteDeviceAccessibleSummary
    .replace(affectedDeviceCountLabel, '')
    .trim();

  const handleWorkspaceOpenChange = (open: boolean) => {
    if (!open && controller.viewModel.hasUnsavedChanges) {
      controller.actions.onModeChange('manage');
      controller.actions.onStageChange('impact-review');
      return;
    }
    onOpenChange(open);
  };

  return (
    <>
      <RoomsWorkspaceDialog
        isOpen={isOpen}
        onOpenChange={handleWorkspaceOpenChange}
        viewModel={controller.viewModel}
        labels={labels}
        actions={controller.actions}
      />

      {operation && nameDialogCopy ? (
        <RoomNameDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              controller.dismissOperation();
            }
          }}
          title={nameDialogCopy.title}
          description={nameDialogCopy.description}
          nameLabel={nameDialogCopy.label}
          namePlaceholder={nameDialogCopy.placeholder}
          value={operationName}
          onValueChange={setOperationName}
          validationMessage={nameValidationMessage}
          cancelLabel={t('common.cancel')}
          confirmLabel={nameDialogCopy.confirm}
          onConfirm={() => controller.confirmNameOperation(operationName)}
        />
      ) : null}

      <RoomTargetDialog
        isOpen={operation?.kind === 'merge-room'}
        onOpenChange={(open) => {
          if (!open) {
            controller.dismissOperation();
          }
        }}
        title={t('dashboard.roomsWorkspace.merge.title')}
        description={t('dashboard.roomsWorkspace.merge.description')}
        searchLabel={t('dashboard.roomsWorkspace.merge.searchLabel')}
        searchPlaceholder={t('dashboard.roomsWorkspace.merge.searchPlaceholder')}
        targetLabel={t('dashboard.roomsWorkspace.merge.targetLabel')}
        resultSummary={t(
          mergeCandidates.length === 1
            ? 'dashboard.roomsWorkspace.counts.rooms.one'
            : 'dashboard.roomsWorkspace.counts.rooms.other',
          { count: mergeCandidates.length }
        )}
        emptyTitle={t('dashboard.roomsWorkspace.merge.emptyTitle')}
        emptyDescription={t('dashboard.roomsWorkspace.merge.emptyDescription')}
        candidates={mergeCandidates}
        query={targetQuery}
        onQueryChange={setTargetQuery}
        selectedTargetId={selectedTargetId}
        onTargetChange={setSelectedTargetId}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('dashboard.roomsWorkspace.merge.action')}
        onConfirm={() => {
          if (selectedTargetId) {
            controller.confirmMerge(selectedTargetId);
          }
        }}
      />

      <RoomAppearanceDialog
        isOpen={operation?.kind === 'appearance' || operation?.kind === 'appearance-group'}
        onOpenChange={(open) => {
          if (!open) {
            controller.dismissOperation();
          }
        }}
        title={t('dashboard.roomsWorkspace.appearance.title')}
        description={t('dashboard.roomsWorkspace.appearance.description')}
        symbolLabel={t('dashboard.roomsWorkspace.appearance.iconLabel')}
        symbolDescription={t('dashboard.roomsWorkspace.appearance.iconDescription')}
        wallpaperLabel={t('dashboard.roomsWorkspace.appearance.wallpaperLabel')}
        wallpaperDescription={t('dashboard.roomsWorkspace.appearance.wallpaperDescription')}
        imagePreviewAlt={t('dashboard.roomsWorkspace.appearance.previewAlt')}
        wallpaperOptionLabel={(wallpaperId) =>
          t('dashboard.roomsWorkspace.appearance.wallpaperOptionAria', {
            id: wallpaperId,
          })
        }
        urlLabel={t('dashboard.roomsWorkspace.appearance.urlLabel')}
        urlPlaceholder={t('dashboard.roomsWorkspace.appearance.urlPlaceholder')}
        invalidUrlMessage={t('dashboard.roomsWorkspace.validation.invalidImageUrl')}
        removeImageLabel={t('dashboard.roomsWorkspace.appearance.remove')}
        resetLabel={t('common.reset')}
        cancelLabel={t('common.cancel')}
        confirmLabel={t('dashboard.roomsWorkspace.appearance.apply')}
        symbolChoices={roomSymbolChoices}
        symbol={appearanceSymbol}
        onSymbolChange={setAppearanceSymbol}
        image={appearanceImage ?? null}
        onImageChange={setAppearanceImage}
        onReset={() => {
          setAppearanceSymbol(null);
          setAppearanceImage(null);
        }}
        onConfirm={() =>
          controller.confirmAppearance({
            symbol: appearanceSymbol,
            image: appearanceImage ?? null,
          })
        }
        showWallpaper={operation?.kind !== 'appearance-group'}
      />

      <RoomDeleteImpactDialog
        isOpen={operation?.kind === 'delete-room' || operation?.kind === 'delete-group'}
        onOpenChange={(open) => {
          if (!open) {
            controller.dismissOperation();
          }
        }}
        title={
          operation?.kind === 'delete-group'
            ? t('dashboard.roomsWorkspace.deleteGroup.title')
            : t('dashboard.roomsWorkspace.deleteConfirmation.title')
        }
        description={
          operation?.kind === 'delete-group'
            ? t('dashboard.roomsWorkspace.deleteGroup.description')
            : t('dashboard.roomsWorkspace.deleteConfirmation.description')
        }
        roomLabel={t('dashboard.roomsWorkspace.deleteConfirmation.roomLabel')}
        roomName={operationGroup?.displayName ?? operationRoom?.displayName ?? ''}
        affectedDevicesLabel={
          operation?.kind === 'delete-group'
            ? t('dashboard.roomsWorkspace.roomsRegion')
            : t('dashboard.roomsWorkspace.deleteConfirmation.devicesLabel')
        }
        affectedDeviceCount={
          operation?.kind === 'delete-group'
            ? (controller.draftWorkspace?.rooms.filter(
                (room) => room.metadata.groupId === operation.groupId
              ).length ?? 0)
            : affectedDeviceCount
        }
        affectedDeviceSummary={
          operation?.kind === 'delete-group'
            ? t('dashboard.roomsWorkspace.deleteGroup.description')
            : deleteDeviceSummary
        }
        affectedDeviceAccessibleSummary={
          operation?.kind === 'delete-room' ? deleteDeviceAccessibleSummary : undefined
        }
        destinationLabel={
          operation?.kind === 'delete-room'
            ? t('dashboard.roomsWorkspace.deleteConfirmation.destinationLabel')
            : undefined
        }
        destinationRoomId={selectedDeleteDestinationId}
        destinationFallbackLabel={
          providerDeletionRoom
            ? t('dashboard.roomsWorkspace.deleteConfirmation.destinationUnassigned')
            : t('dashboard.roomsWorkspace.deleteConfirmation.destinationConnected')
        }
        destinations={deleteDestinations}
        onDestinationChange={setSelectedDeleteDestinationId}
        providerSourcesLabel={t('dashboard.roomsWorkspace.deleteConfirmation.providersLabel')}
        noProviderSourcesLabel={t('dashboard.roomsWorkspace.deleteConfirmation.noProviders')}
        providerSources={(operationRoom?.sourceRefs ?? []).map((sourceRef) => ({
          id: sourceRef.canonicalId,
          name: getProviderLabel(sourceRef.providerId),
          summary: providerDeletionRoom
            ? t('dashboard.roomsWorkspace.deleteConfirmation.providerDeleteSummary', {
                room: providerDeletionRoom.name,
                provider: providerDeletionLabel,
              })
            : t('dashboard.roomsWorkspace.impact.providerDescription'),
        }))}
        warningMessage={
          operation?.kind === 'delete-group'
            ? undefined
            : providerDeletionRoom
              ? t('dashboard.roomsWorkspace.deleteConfirmation.providerDeleteWarning', {
                  room: providerDeletionRoom.name,
                  provider: providerDeletionLabel,
                })
              : undefined
        }
        cancelLabel={t('common.cancel')}
        confirmLabel={
          operation?.kind === 'delete-group'
            ? t('dashboard.roomsWorkspace.deleteGroup.action')
            : t('dashboard.roomsWorkspace.deleteConfirmation.action')
        }
        onConfirm={() => controller.confirmDelete(selectedDeleteDestinationId)}
      />
    </>
  );
}
