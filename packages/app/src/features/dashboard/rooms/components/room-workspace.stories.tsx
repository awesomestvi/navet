import { IconButton } from '@navet/app/components/primitives';
import { navetIconSizeTokens } from '@navet/app/components/system/tokens';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { RoomsWorkspace } from './room-workspace';
import type {
  RoomWorkspaceActions,
  RoomWorkspaceLabels,
  RoomWorkspaceLayout,
  RoomWorkspaceViewModel,
} from './room-workspace.types';
import { RoomDeviceSelectionSheet } from './room-workspace-overlays';

export const roomWorkspaceEnglishLabels: RoomWorkspaceLabels = {
  title: 'Rooms',
  description: 'Browse your home or make deliberate changes without losing context.',
  browseMode: 'Done editing',
  manageMode: 'Edit rooms',
  searchLabel: 'Search rooms or groups',
  searchPlaceholder: 'Search rooms or groups',
  clearSearch: 'Clear search',
  roomsRegion: 'Rooms and groups',
  workspaceRegion: 'Room workspace',
  contextRegion: 'Room context',
  roomDetailsTitle: 'Room settings',
  roomDetailsDescription: 'Keep identity and everyday visibility easy to understand.',
  devicesTitle: 'Devices',
  devicesDescription: 'Review assigned devices or add another device.',
  dashboardDevices: 'On dashboard',
  hiddenDevices: 'Hidden',
  impactTitle: 'Review impact',
  impactDescription: 'Check every pending move and removal before it changes the home.',
  addRoom: 'Add room',
  addRoomToGroup: 'Add room to group',
  addGroup: 'Add group',
  moreActions: 'More actions',
  renameGroup: 'Rename group',
  deleteGroup: 'Delete group',
  mergeRoom: 'Merge room',
  mergeRoomDescription: 'Choose another room and combine their devices and dashboard content.',
  splitRoom: 'Split room',
  splitRoomDescription: 'Create a new room from a selected set of devices.',
  manageDevices: 'Add devices',
  addDevice: 'Add',
  deviceActions: 'Actions',
  hideDevice: 'Hide',
  showDevice: 'Show',
  moveDevice: 'Move',
  removeDevice: 'Remove',
  notInRoom: 'Not in a room',
  deviceSearchPlaceholder: 'Search devices',
  saveChanges: 'Save changes',
  discardChanges: 'Discard changes',
  back: 'Back',
  retry: 'Try again',
  roomNameLabel: 'Room name',
  roomNamePlaceholder: 'Enter a room name',
  groupLabel: 'Group',
  ungroupedGroup: 'No group',
  visibilityLabel: 'Show in navigation',
  visibilityDescription: 'Keep this room available in the everyday room switcher.',
  favoriteLabel: 'Favorite room',
  favoriteDescription: 'Keep this room close in large homes and shared collections.',
  appearanceLabel: 'Room appearance',
  appearanceDescription: 'Use a familiar symbol and wallpaper that still works across themes.',
  chooseAppearance: 'Choose appearance',
  deleteRoom: 'Delete room',
  deleteRoomDescription: 'Review device moves before removing this room.',
  dragRoom: (roomName) => `Reorder room ${roomName}`,
  moveEarlier: 'Move earlier',
  moveLater: 'Move later',
  selectRoom: 'Open room',
  collapseGroup: 'Collapse group',
  expandGroup: 'Expand group',
  noRoomsFoundTitle: 'No rooms found',
  noRoomsFoundDescription: 'Try another search or clear the current filter.',
  selectRoomTitle: 'Choose a room',
  selectRoomDescription: 'Select a room from the home outline to see its devices and status.',
  noDevicesTitle: 'No devices found',
  noDevicesDescription: 'Try another search or leave this room ready for devices later.',
  noDashboardDevicesTitle: 'No dashboard devices',
  noDashboardDevicesDescription: 'Devices assigned to this room are not shown on the dashboard.',
  noHiddenDevicesTitle: 'No hidden devices',
  noHiddenDevicesDescription: 'Every device in this room is shown on the dashboard.',
  noChangesTitle: 'Everything is settled',
  noChangesDescription: 'There are no pending room changes to review.',
  currentRoomTitle: 'Current room',
  roomActionsTitle: 'Room actions',
  pendingChangesTitle: 'Pending changes',
  unsavedChanges: (count) => `${count} unsaved ${count === 1 ? 'change' : 'changes'}`,
  allChangesSaved: 'All room changes are saved.',
  closeSheet: 'Close room management',
};

const rooms: RoomWorkspaceViewModel['rooms'] = [
  {
    id: 'living-room',
    name: 'Living Room',
    groupId: 'ground-floor',
    symbol: '⌂',
    image: 'builtin:aurora-haze-01',
    description: 'Home Assistant',
    deviceSummary: '14 devices',
    attentionSummary: '2 devices need attention',
    statusLabel: 'Active',
    statusTone: 'positive',
    isVisible: true,
    isFavorite: true,
    canDelete: true,
    canMerge: true,
    canSplit: true,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    groupId: 'ground-floor',
    symbol: 'K',
    description: 'Lighting, air quality, and everyday appliances.',
    deviceSummary: '11 devices',
    statusLabel: 'Active',
    statusTone: 'positive',
    isVisible: true,
    isFavorite: true,
    canDelete: true,
    canMerge: true,
    canSplit: true,
  },
  {
    id: 'dining-room',
    name: 'Dining Room',
    groupId: 'ground-floor',
    symbol: 'D',
    deviceSummary: '6 devices',
    isVisible: true,
    isFavorite: false,
    canDelete: true,
    canMerge: true,
    canSplit: false,
  },
  {
    id: 'primary-bedroom',
    name: 'Primary Bedroom',
    groupId: 'upper-floor',
    symbol: 'P',
    deviceSummary: '9 devices',
    statusLabel: 'Quiet',
    statusTone: 'neutral',
    isVisible: true,
    isFavorite: false,
    canDelete: true,
    canMerge: true,
    canSplit: true,
  },
  {
    id: 'office',
    name: 'Office and Music Studio',
    groupId: 'upper-floor',
    symbol: 'O',
    deviceSummary: '18 devices',
    attentionSummary: '1 device unavailable',
    statusLabel: 'Attention',
    statusTone: 'warning',
    isVisible: true,
    isFavorite: true,
    canDelete: true,
    canMerge: true,
    canSplit: true,
  },
  {
    id: 'garden',
    name: 'Garden',
    groupId: 'outside',
    symbol: 'G',
    deviceSummary: '8 devices',
    isVisible: false,
    isFavorite: false,
    canDelete: true,
    canMerge: false,
    canSplit: true,
  },
] as const;

const groups: RoomWorkspaceViewModel['groups'] = [
  {
    id: 'ground-floor',
    name: 'Ground floor',
    summary: '3 rooms',
    roomIds: ['living-room', 'kitchen', 'dining-room'],
    canRename: true,
    canDelete: false,
  },
  {
    id: 'upper-floor',
    name: 'Upper floor',
    summary: '2 rooms',
    roomIds: ['primary-bedroom', 'office'],
    canRename: true,
    canDelete: true,
  },
  {
    id: 'outside',
    name: 'Outside',
    summary: '1 room',
    roomIds: ['garden'],
    canRename: true,
    canDelete: true,
  },
] as const;

const devices: RoomWorkspaceViewModel['devices'] = [
  {
    id: 'living-lights',
    name: 'Ceiling lights',
    entityType: 'light',
    description: 'Lighting · Living Room',
    stateLabel: 'On · 42%',
    roomId: 'living-room',
    roomName: 'Living Room',
    isDashboardDevice: true,
    isShownOnDashboard: true,
  },
  {
    id: 'living-speaker',
    name: 'Living room speaker',
    entityType: 'media_player',
    deviceClass: 'speaker',
    description: 'Media · Living Room',
    stateLabel: 'Playing',
    roomId: 'living-room',
    roomName: 'Living Room',
    isDashboardDevice: true,
    isShownOnDashboard: true,
  },
  {
    id: 'living-climate',
    name: 'Main thermostat',
    entityType: 'climate',
    description: 'Climate · Living Room',
    stateLabel: '21.4°',
    roomId: 'living-room',
    roomName: 'Living Room',
    isDashboardDevice: true,
    isShownOnDashboard: true,
  },
  {
    id: 'window-sensor',
    name: 'West window sensor',
    entityType: 'binary_sensor',
    deviceClass: 'window',
    description: 'Security · Living Room',
    stateLabel: 'Unavailable',
    roomId: 'living-room',
    roomName: 'Living Room',
    isUnavailable: true,
    isDashboardDevice: true,
    isShownOnDashboard: false,
  },
  {
    id: 'living-raw-child',
    name: 'Raw provider child',
    entityType: 'sensor',
    description: 'Sensor · Living Room',
    stateLabel: 'Idle',
    roomId: 'living-room',
    roomName: 'Living Room',
    isDashboardDevice: false,
    isShownOnDashboard: false,
  },
  {
    id: 'kitchen-pendants',
    name: 'Kitchen pendants',
    entityType: 'light',
    description: 'Lighting · Kitchen',
    stateLabel: 'Off',
    roomId: 'kitchen',
    roomName: 'Kitchen',
    isDashboardDevice: true,
    isShownOnDashboard: true,
  },
  {
    id: 'office-speakers',
    name: 'Studio monitors',
    entityType: 'media_player',
    deviceClass: 'speaker',
    description: 'Media · Office and Music Studio',
    stateLabel: 'Idle',
    roomId: 'office',
    roomName: 'Office and Music Studio',
    isDashboardDevice: true,
    isShownOnDashboard: true,
  },
] as const;

export const roomWorkspaceBaseViewModel: RoomWorkspaceViewModel = {
  status: { kind: 'ready' },
  mode: 'browse',
  stage: 'structure',
  query: '',
  deviceQuery: '',
  inventorySummary: '6 rooms across 3 groups',
  groups,
  rooms,
  selectedRoomId: 'living-room',
  devices,
  selectedDeviceIds: ['living-lights', 'living-speaker', 'living-climate'],
  selectionSummary: '3 devices selected',
  changes: [],
  unsavedChangeCount: 0,
  hasUnsavedChanges: false,
  isSaving: false,
};

interface WorkspaceStoryProps {
  layout: RoomWorkspaceLayout;
  initialViewModel: RoomWorkspaceViewModel;
  phoneFrame?: boolean;
}

function WorkspaceStory({ layout, initialViewModel, phoneFrame = false }: WorkspaceStoryProps) {
  const [model, setModel] = useState(initialViewModel);
  const sourceRooms = model.rooms;
  const sourceGroups = model.groups;
  const normalizedQuery = model.query.trim().toLocaleLowerCase();
  const visibleRooms = normalizedQuery
    ? sourceRooms.filter(
        (room) =>
          room.name.toLocaleLowerCase().includes(normalizedQuery) ||
          room.description?.toLocaleLowerCase().includes(normalizedQuery)
      )
    : sourceRooms;
  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));
  const visibleGroups = sourceGroups
    .map((group) => ({
      ...group,
      roomIds: group.roomIds.filter((roomId) => visibleRoomIds.has(roomId)),
    }))
    .filter((group) => group.roomIds.length > 0);

  const actions = useMemo<RoomWorkspaceActions>(
    () => ({
      onModeChange: (mode) =>
        setModel((current) => ({
          ...current,
          mode,
          stage: mode === 'manage' ? 'structure' : current.stage,
        })),
      onStageChange: (stage) => setModel((current) => ({ ...current, stage })),
      onQueryChange: (query) => setModel((current) => ({ ...current, query })),
      onDeviceQueryChange: (deviceQuery) => setModel((current) => ({ ...current, deviceQuery })),
      onSelectRoom: (selectedRoomId) => setModel((current) => ({ ...current, selectedRoomId })),
      onAddRoom: (groupId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `add-room-${current.changes.length}`,
              title: 'New room ready to name',
              description: groupId
                ? 'The room will be added to the selected group.'
                : 'The room will be added at the end of the home outline.',
            },
          ],
          hasUnsavedChanges: true,
        })),
      onAddGroup: () =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `add-group-${current.changes.length}`,
              title: 'New group',
              description: 'A new group will be added to the home outline.',
            },
          ],
          hasUnsavedChanges: true,
        })),
      onMoveGroup: (groupId, direction) =>
        setModel((current) => {
          const nextGroups = [...current.groups];
          const index = nextGroups.findIndex((group) => group.id === groupId);
          const target = direction === 'earlier' ? index - 1 : index + 1;
          if (index < 0 || target < 0 || target >= nextGroups.length) {
            return current;
          }
          [nextGroups[index], nextGroups[target]] = [nextGroups[target], nextGroups[index]];
          return { ...current, groups: nextGroups, hasUnsavedChanges: true };
        }),
      onRenameGroup: (groupId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `rename-${groupId}`,
              title: 'Group name changed',
              description: 'The updated name will appear everywhere this group is shown.',
            },
          ],
          hasUnsavedChanges: true,
        })),
      onRequestGroupDeletion: (groupId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `delete-${groupId}`,
              title: 'Group will be removed',
              description: 'Rooms stay intact and move to the ungrouped section.',
              tone: 'warning',
            },
          ],
          hasUnsavedChanges: true,
          stage: 'impact-review',
        })),
      onRoomNameChange: (roomId, name) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes.filter((change) => change.id !== `rename-${roomId}`),
            {
              id: `rename-${roomId}`,
              title: 'Room name changes when saved',
              description: `The room will be renamed to ${name}.`,
            },
          ],
          rooms: current.rooms.map((room) =>
            room.id === roomId ? { ...room, name, nameDraft: name } : room
          ),
          hasUnsavedChanges: true,
        })),
      onRoomGroupChange: (roomId, groupId) =>
        setModel((current) => ({
          ...current,
          rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, groupId } : room)),
          groups: current.groups.map((group) => ({
            ...group,
            roomIds:
              group.id === groupId
                ? [...group.roomIds.filter((id) => id !== roomId), roomId]
                : group.roomIds.filter((id) => id !== roomId),
          })),
          hasUnsavedChanges: true,
        })),
      onRoomVisibilityChange: (roomId, isVisible) =>
        setModel((current) => ({
          ...current,
          rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, isVisible } : room)),
          hasUnsavedChanges: true,
        })),
      onRoomFavoriteChange: (roomId, isFavorite) =>
        setModel((current) => ({
          ...current,
          rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, isFavorite } : room)),
          hasUnsavedChanges: true,
        })),
      onChooseRoomAppearance: (roomId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `appearance-${roomId}`,
              title: 'Room appearance updated',
              description: 'The new symbol and wallpaper will be used across the dashboard.',
            },
          ],
          hasUnsavedChanges: true,
        })),
      onRequestRoomMerge: (roomId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `merge-${roomId}`,
              title: 'Rooms will be merged',
              description: 'Devices and dashboard content will move into the chosen destination.',
              tone: 'warning',
            },
          ],
          hasUnsavedChanges: true,
          stage: 'impact-review',
        })),
      onRequestRoomSplit: (roomId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `split-${roomId}`,
              title: 'Room will be split',
              description: 'Selected devices will move into a new room.',
            },
          ],
          hasUnsavedChanges: true,
          stage: 'device-selection',
        })),
      onRequestRoomDeletion: (roomId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `delete-${roomId}`,
              title: 'Room will be deleted',
              description: 'Its devices must move before the room is removed.',
              tone: 'critical',
            },
          ],
          hasUnsavedChanges: true,
          stage: 'impact-review',
        })),
      onDropRoom: (roomId, targetRoomId) =>
        setModel((current) => {
          const sourceIndex = current.rooms.findIndex((room) => room.id === roomId);
          const targetIndex = current.rooms.findIndex((room) => room.id === targetRoomId);
          const targetGroupId = current.rooms[targetIndex]?.groupId ?? null;
          if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
            return current;
          }

          const nextRooms = current.rooms.map((room) =>
            room.id === roomId ? { ...room, groupId: targetGroupId } : room
          );
          const [movedRoom] = nextRooms.splice(sourceIndex, 1);
          nextRooms.splice(targetIndex, 0, movedRoom);

          return {
            ...current,
            rooms: nextRooms,
            groups: current.groups.map((group) => ({
              ...group,
              roomIds: nextRooms.filter((room) => room.groupId === group.id).map((room) => room.id),
            })),
            hasUnsavedChanges: true,
          };
        }),
      onToggleGroup: (groupId, isCollapsed) =>
        setModel((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === groupId ? { ...group, isCollapsed } : group
          ),
        })),
      onDeviceVisibilityChange: (deviceId, visible) =>
        setModel((current) => ({
          ...current,
          devices: current.devices.map((device) =>
            device.id === deviceId ? { ...device, isShownOnDashboard: visible } : device
          ),
        })),
      onRequestDeviceMove: (deviceId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `move-${deviceId}`,
              title: 'Device will move',
              description: 'The selected device will move to another room.',
            },
          ],
          hasUnsavedChanges: true,
        })),
      onDeviceSelectionChange: (deviceId, selected) =>
        setModel((current) => ({
          ...current,
          selectedDeviceIds: selected
            ? [...current.selectedDeviceIds, deviceId]
            : current.selectedDeviceIds.filter((id) => id !== deviceId),
          selectionSummary: selected
            ? 'Device added to selection'
            : 'Device removed from selection',
          hasUnsavedChanges: true,
        })),
      onDiscard: () => setModel(initialViewModel),
      onSave: () =>
        setModel((current) => ({
          ...current,
          changes: [],
          hasUnsavedChanges: false,
          isSaving: false,
        })),
      onRetry: () => setModel(roomWorkspaceBaseViewModel),
    }),
    [initialViewModel]
  );

  const filteredModel: RoomWorkspaceViewModel = {
    ...model,
    rooms: visibleRooms,
    groups: visibleGroups,
    unsavedChangeCount: model.hasUnsavedChanges
      ? Math.max(model.unsavedChangeCount, model.changes.length, 1)
      : 0,
    resultSummary: normalizedQuery
      ? `${visibleRooms.length} matching room${visibleRooms.length === 1 ? '' : 's'}`
      : undefined,
  };

  return (
    <>
      <div className={phoneFrame ? 'mx-auto w-full max-w-[430px]' : 'w-full'}>
        <RoomsWorkspace
          viewModel={filteredModel}
          labels={roomWorkspaceEnglishLabels}
          actions={actions}
          layout={layout}
          headerTrailing={
            <IconButton
              variant="ghost"
              label={roomWorkspaceEnglishLabels.closeSheet}
              icon={<X className={navetIconSizeTokens.sm} aria-hidden="true" />}
              onClick={() => undefined}
              className="min-h-11 min-w-11 motion-reduce:transition-none"
            />
          }
        />
      </div>
      <RoomDeviceSelectionSheet
        isOpen={model.stage === 'device-selection'}
        onOpenChange={(open) => {
          if (!open) {
            setModel((current) => ({ ...current, deviceQuery: '', stage: 'room-details' }));
          }
        }}
        viewModel={filteredModel}
        labels={roomWorkspaceEnglishLabels}
        actions={actions}
      />
    </>
  );
}

const meta = {
  title: 'Pages/Rooms/Workspace',
  component: WorkspaceStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {},
    },
  },
  args: {
    layout: 'desktop',
    initialViewModel: roomWorkspaceBaseViewModel,
    phoneFrame: false,
  },
} satisfies Meta<typeof WorkspaceStory>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);
meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters.docs,
    description: {
      ...meta.parameters.docs.description,
      component: richComponentDocsDescription,
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const BrowseDesktop: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Current room')).toBeNull();
    await expect(
      canvas.queryByRole('complementary', { name: 'Room context' })
    ).not.toBeInTheDocument();
    await expect(
      canvas
        .getByRole('searchbox', { name: 'Search rooms or groups' })
        .closest('[data-room-workspace-outline-content]')
    ).not.toBeNull();
    await expect(canvas.queryByRole('heading', { name: 'Devices' })).toBeNull();
    await expect(canvas.queryByText('Review assigned devices or add another device.')).toBeNull();
    await expect(canvas.getByRole('button', { name: 'On dashboard 3' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(
      canvas
        .getByRole('button', { name: 'On dashboard 3' })
        .closest('[data-room-workspace-panel-content="browse"]')
    ).not.toBeNull();
    await expect(canvas.getByText('Ceiling lights')).toBeVisible();
    await expect(canvas.queryByText('West window sensor')).toBeNull();
    await expect(canvas.queryByText('Raw provider child')).toBeNull();

    const deviceSearch = canvas.getByRole('searchbox', { name: 'Search devices' });
    await userEvent.type(deviceSearch, 'speaker');
    await expect(canvas.getByText('Living room speaker')).toBeVisible();
    await expect(canvas.queryByText('Ceiling lights')).toBeNull();
    await userEvent.clear(deviceSearch);

    await userEvent.click(canvas.getByRole('button', { name: 'Hide: Ceiling lights' }));
    await expect(canvas.queryByText('Ceiling lights')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Hidden 2' }));
    await expect(canvas.getByText('West window sensor')).toBeVisible();
    await expect(canvas.getByText('Ceiling lights')).toBeVisible();
    await expect(canvas.queryByText('Raw provider child')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Show: Ceiling lights' }));
    await expect(canvas.queryByText('Ceiling lights')).toBeNull();
  },
};

export const UngroupedRooms: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      rooms: roomWorkspaceBaseViewModel.rooms.map((room) =>
        room.id === 'garden' ? { ...room, groupId: null } : room
      ),
      groups: roomWorkspaceBaseViewModel.groups.map((group) =>
        group.id === 'outside' ? { ...group, roomIds: [], summary: '0 rooms' } : group
      ),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const noGroupDisclosure = canvas.getByRole('button', { name: 'No group' });

    await expect(noGroupDisclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('Garden')).toBeVisible();
    await userEvent.click(noGroupDisclosure);
    await expect(noGroupDisclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText('Garden')).toBeNull();
  },
};

export const ManageRoomEditor: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'structure',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Living Room' })).toBeInTheDocument();
    await expect(
      canvas.queryByRole('complementary', { name: 'Room context' })
    ).not.toBeInTheDocument();
    await expect(canvas.getByText('All room changes are saved.')).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: 'Add room' })[0]).toHaveClass('min-h-11');
    const dragHandle = canvas.getByRole('button', { name: 'Reorder room Living Room' });
    dragHandle.focus();
    await userEvent.keyboard('[Space][ArrowDown][Space]');
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  },
};

export const ReorderDisabledDuringSearch: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'structure',
      query: 'living',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Reorder room Living Room' })).toBeDisabled();
  },
};

export const RoomDetails: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'room-details',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    await expect(canvas.getByRole('button', { name: 'Devices' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(
      canvas
        .getByRole('button', { name: 'Devices' })
        .closest('[data-room-workspace-panel-content="manage"]')
    ).not.toBeNull();
    await expect(canvas.getByRole('button', { name: 'Add devices' })).toBeVisible();
    await expect(canvas.queryByRole('heading', { name: 'Devices' })).toBeNull();
    await expect(canvas.queryByText('Review assigned devices or add another device.')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Actions: Ceiling lights' }));
    await expect(page.getByRole('menuitem', { name: 'Hide' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Move' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Remove' })).toBeVisible();
    await userEvent.click(page.getByRole('menuitem', { name: 'Hide' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Actions: Ceiling lights' }));
    await expect(page.getByRole('menuitem', { name: 'Show' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(canvas.getByRole('button', { name: 'Room settings' }));
    await expect(canvas.queryByRole('button', { name: 'Add devices' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'More actions' })).toBeNull();
    await expect(canvas.getByRole('button', { name: /^Merge room/ })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /^Split room/ })).toBeVisible();
    await expect(canvas.getByRole('button', { name: /^Delete room/ })).toBeVisible();
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Group' }), 'upper-floor');
    await expect(canvas.getByRole('combobox', { name: 'Group' })).toHaveValue('upper-floor');
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  },
};

export const DeviceSelection: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'room-details',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await expect(canvas.getByRole('button', { name: 'Devices' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(canvas.queryByRole('combobox', { name: 'Group' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Add devices' }));
    await expect(await page.findByRole('dialog', { name: 'Add devices' })).toBeInTheDocument();
    await expect(page.getByRole('searchbox', { name: 'Search devices' })).toBeInTheDocument();
    await expect(page.queryByRole('button', { name: 'Add: West window sensor' })).toBeNull();

    await userEvent.click(page.getByRole('button', { name: 'Add: Kitchen pendants' }));
    await expect(page.queryByRole('button', { name: 'Add: Kitchen pendants' })).toBeNull();

    await userEvent.click(page.getByRole('button', { name: 'Close room management' }));
    await expect(page.queryByRole('dialog', { name: 'Add devices' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Devices' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  },
};

export const ImpactReview: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'impact-review',
      hasUnsavedChanges: true,
      changes: [
        {
          id: 'move-speakers',
          title: '2 devices move to Office and Music Studio',
          description: 'Living room speaker and Studio monitors will share the new room.',
        },
        {
          id: 'hide-garden',
          title: 'Garden leaves navigation',
          description: 'The room remains available from search and management.',
          tone: 'warning',
        },
      ],
    },
  },
};

export const PendingProviderChanges: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'impact-review',
      hasUnsavedChanges: true,
      unsavedChangeCount: 2,
      changes: [
        {
          id: 'provider-changes',
          title: 'In connected systems',
          description: '2 provider changes',
          details: [
            'Home Assistant · Kitchen → Kitchen & dining',
            'Home Assistant · Ceiling light: Kitchen → Office',
          ],
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Home Assistant · Kitchen → Kitchen & dining')).toBeVisible();
    await expect(
      canvas.getByText('Home Assistant · Ceiling light: Kitchen → Office')
    ).toBeVisible();
  },
};

export const TabletMasterDetail: Story = {
  args: {
    layout: 'tablet',
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'room-details',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByRole('region', { name: 'Rooms' });
    await expect(workspace).toHaveClass('min-h-0', 'max-h-full');
    await expect(workspace).not.toHaveClass('min-h-[38rem]');
  },
};

export const PhoneFullScreen: Story = {
  args: {
    layout: 'phone',
    phoneFrame: true,
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      selectedRoomId: null,
    },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = canvas.getByRole('region', { name: 'Rooms' });
    await expect(workspace).toHaveClass('min-h-0', 'max-h-full');
    await expect(workspace).not.toHaveClass('min-h-[36rem]');
  },
};

export const PhoneRoomEditor: Story = {
  args: {
    layout: 'phone',
    phoneFrame: true,
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'structure',
    },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const workspace = within(canvas.getByRole('navigation', { name: 'Rooms and groups' }));
    await expect(workspace.getByRole('button', { name: 'Reorder room Living Room' })).toHaveClass(
      'h-10',
      'w-10'
    );
    await userEvent.click(workspace.getByRole('button', { name: 'Open room: Living Room' }));
    await expect(canvas.getByRole('heading', { name: 'Living Room' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Room settings' }));
    const roomNameInput = canvas.getByRole('textbox', { name: 'Room name' });
    await expect(roomNameInput).toHaveValue('Living Room');
    await userEvent.clear(roomNameInput);
    await userEvent.type(roomNameInput, 'Lounge');
    await expect(roomNameInput).toHaveValue('Lounge');
    await expect(canvas.queryByRole('dialog', { name: 'Edit room' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  },
};

export const EmptyHome: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      status: {
        kind: 'empty',
        title: 'Build the shape of your home',
        description: 'Create the first room, then place devices where people expect to find them.',
        actionLabel: 'Create first room',
      },
      rooms: [],
      groups: [],
      selectedRoomId: null,
      devices: [],
      inventorySummary: 'No rooms yet',
    },
  },
};

export const LoadingHome: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      status: { kind: 'loading', message: 'Loading rooms and device assignments…' },
    },
  },
};

export const LoadError: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      status: {
        kind: 'error',
        title: 'Rooms could not be loaded',
        description:
          'Your current dashboard remains unchanged. Try loading the room workspace again.',
        actionLabel: 'Try again',
      },
    },
  },
};

const largeHomeRooms: RoomWorkspaceViewModel['rooms'] = Array.from({ length: 50 }, (_, index) => ({
  id: `room-${index + 1}`,
  name: `Room ${String(index + 1).padStart(2, '0')}`,
  groupId: `floor-${Math.floor(index / 10) + 1}`,
  symbol: String((index % 10) + 1),
  deviceSummary: `${(index % 12) + 1} devices`,
  isVisible: true,
  isFavorite: index < 4,
  canDelete: true,
  canMerge: true,
  canSplit: true,
}));

const largeHomeGroups: RoomWorkspaceViewModel['groups'] = Array.from({ length: 5 }, (_, index) => ({
  id: `floor-${index + 1}`,
  name: `Floor ${index + 1}`,
  summary: '10 rooms',
  roomIds: largeHomeRooms.slice(index * 10, index * 10 + 10).map((room) => room.id),
  canRename: true,
  canDelete: true,
}));

export const LargeHome: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      inventorySummary: '50 rooms across 5 floors',
      rooms: largeHomeRooms,
      groups: largeHomeGroups,
      selectedRoomId: 'room-1',
      devices: [],
    },
  },
};

export const SearchResults: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      query: 'office',
      selectedRoomId: 'office',
    },
  },
};
