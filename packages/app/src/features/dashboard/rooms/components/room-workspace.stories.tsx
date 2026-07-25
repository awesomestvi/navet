import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { RoomsWorkspace } from './room-workspace';
import type {
  RoomWorkspaceActions,
  RoomWorkspaceLabels,
  RoomWorkspaceLayout,
  RoomWorkspaceViewModel,
} from './room-workspace.types';

export const roomWorkspaceEnglishLabels: RoomWorkspaceLabels = {
  title: 'Rooms',
  description: 'Browse your home or make deliberate changes without losing context.',
  browseMode: 'Browse',
  manageMode: 'Manage',
  searchLabel: 'Search rooms and devices',
  searchPlaceholder: 'Search rooms and devices',
  clearSearch: 'Clear search',
  roomsRegion: 'Home outline',
  workspaceRegion: 'Room workspace',
  contextRegion: 'Room context',
  structureTitle: 'Home structure',
  structureDescription: 'Set the order people see while moving through the home.',
  roomDetailsTitle: 'Room details',
  roomDetailsDescription: 'Keep identity and everyday visibility easy to understand.',
  devicesTitle: 'Devices',
  devicesDescription: 'Choose what belongs in this room. Unavailable devices stay identifiable.',
  impactTitle: 'Review impact',
  impactDescription: 'Check every pending move and removal before it changes the home.',
  addRoom: 'Add room',
  addRoomToGroup: 'Add room to group',
  addGroup: 'Add group',
  moreActions: 'More actions',
  renameGroup: 'Rename group',
  deleteGroup: 'Delete group',
  editRoom: 'Edit room',
  mergeRoom: 'Merge room',
  mergeRoomDescription: 'Choose another room and combine their devices and dashboard content.',
  splitRoom: 'Split room',
  splitRoomDescription: 'Create a new room from a selected set of devices.',
  manageDevices: 'Manage devices',
  reviewChanges: 'Review changes',
  saveChanges: 'Save changes',
  cancel: 'Cancel',
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
  selectAll: 'Select all',
  clearSelection: 'Clear selection',
  selected: 'selected',
  unavailable: 'Unavailable',
  noRoomsFoundTitle: 'No rooms found',
  noRoomsFoundDescription: 'Try another search or clear the current filter.',
  selectRoomTitle: 'Choose a room',
  selectRoomDescription: 'Select a room from the home outline to see its devices and status.',
  noDevicesTitle: 'No devices found',
  noDevicesDescription: 'Try another search or leave this room ready for devices later.',
  noChangesTitle: 'Everything is settled',
  noChangesDescription: 'There are no pending room changes to review.',
  currentRoomTitle: 'Current room',
  roomActivityTitle: 'Attention',
  roomActionsTitle: 'Room actions',
  pendingChangesTitle: 'Pending changes',
  unsavedChanges: 'Changes stay local until you save.',
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
    description: 'The shared center of the home.',
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
    description: 'Lighting · Living Room',
    stateLabel: 'On · 42%',
    roomId: 'living-room',
  },
  {
    id: 'living-speaker',
    name: 'Living room speaker',
    description: 'Media · Living Room',
    stateLabel: 'Playing',
    roomId: 'living-room',
  },
  {
    id: 'living-climate',
    name: 'Main thermostat',
    description: 'Climate · Living Room',
    stateLabel: '21.4°',
    roomId: 'living-room',
  },
  {
    id: 'window-sensor',
    name: 'West window sensor',
    description: 'Security · Living Room',
    stateLabel: 'Unavailable',
    roomId: 'living-room',
    isUnavailable: true,
  },
  {
    id: 'kitchen-pendants',
    name: 'Kitchen pendants',
    description: 'Lighting · Kitchen',
    stateLabel: 'Off',
    roomId: 'kitchen',
  },
  {
    id: 'office-speakers',
    name: 'Studio monitors',
    description: 'Media · Office and Music Studio',
    stateLabel: 'Idle',
    roomId: 'office',
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
      onRequestRoomRename: (roomId) =>
        setModel((current) => ({
          ...current,
          changes: [
            ...current.changes,
            {
              id: `rename-${roomId}`,
              title: 'Room rename requested',
              description: 'The production surface opens the controlled rename dialog.',
            },
          ],
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
      onMoveRoom: (roomId, direction) =>
        setModel((current) => {
          const nextRooms = [...current.rooms];
          const index = nextRooms.findIndex((room) => room.id === roomId);
          const target = direction === 'earlier' ? index - 1 : index + 1;
          if (index < 0 || target < 0 || target >= nextRooms.length) {
            return current;
          }
          [nextRooms[index], nextRooms[target]] = [nextRooms[target], nextRooms[index]];
          return { ...current, rooms: nextRooms, hasUnsavedChanges: true };
        }),
      onToggleGroup: (groupId, isCollapsed) =>
        setModel((current) => ({
          ...current,
          groups: current.groups.map((group) =>
            group.id === groupId ? { ...group, isCollapsed } : group
          ),
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
      onVisibleDeviceSelectionChange: (deviceIds, selected) =>
        setModel((current) => ({
          ...current,
          selectedDeviceIds: selected ? [...deviceIds] : [],
          selectionSummary: selected ? 'All visible devices selected' : 'Selection cleared',
          hasUnsavedChanges: true,
        })),
      onCancel: () => setModel(initialViewModel),
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
    resultSummary: normalizedQuery
      ? `${visibleRooms.length} matching room${visibleRooms.length === 1 ? '' : 's'}`
      : undefined,
  };

  return (
    <div className={phoneFrame ? 'mx-auto w-full max-w-[430px]' : 'w-full'}>
      <RoomsWorkspace
        viewModel={filteredModel}
        labels={roomWorkspaceEnglishLabels}
        actions={actions}
        layout={layout}
      />
    </div>
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

export const BrowseDesktop: Story = {};

export const ManageStructure: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'structure',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Home structure' })).toBeInTheDocument();
    await expect(canvas.getAllByRole('button', { name: 'Add room' })[0]).toHaveClass('min-h-11');
    const dragHandle = canvas.getByRole('button', { name: 'Reorder room Living Room' });
    dragHandle.focus();
    await userEvent.keyboard('[Space][ArrowDown][Space]');
    const workspace = within(canvas.getByRole('region', { name: 'Room workspace' }));
    await expect(workspace.getByRole('button', { name: 'Review changes' })).toBeEnabled();
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
    await expect(canvas.getByRole('button', { name: 'Move later: Living Room' })).toBeDisabled();
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
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Group' }), 'upper-floor');
    await expect(canvas.getByRole('combobox', { name: 'Group' })).toHaveValue('upper-floor');
    const roomDetails = within(canvas.getByRole('region', { name: 'Room details' }));
    await expect(roomDetails.getByRole('button', { name: 'Review changes' })).toBeEnabled();
  },
};

export const DeviceSelection: Story = {
  args: {
    initialViewModel: {
      ...roomWorkspaceBaseViewModel,
      mode: 'manage',
      stage: 'device-selection',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('checkbox', { name: /Kitchen pendants/ }));
    await expect(canvas.getByText('Device added to selection')).toBeInTheDocument();
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

export const PhoneManageStructure: Story = {
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
    const workspace = within(canvas.getByRole('region', { name: 'Room workspace' }));
    await expect(workspace.getByRole('button', { name: 'Reorder room Living Room' })).toHaveClass(
      'min-h-11',
      'min-w-11'
    );
    await expect(workspace.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(workspace.getByRole('button', { name: 'Review changes' })).toBeDisabled();
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
