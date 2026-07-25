export type RoomWorkspaceMode = 'browse' | 'manage';

export type RoomWorkspaceStage =
  | 'structure'
  | 'room-details'
  | 'device-selection'
  | 'impact-review';

export type RoomWorkspaceLayout = 'responsive' | 'desktop' | 'tablet' | 'phone';

export type RoomWorkspaceStatus =
  | { kind: 'ready' }
  | {
      kind: 'loading';
      message: string;
    }
  | {
      kind: 'empty' | 'error';
      title: string;
      description: string;
      actionLabel?: string;
    };

export type RoomWorkspaceStatusTone = 'neutral' | 'positive' | 'warning' | 'critical';

export interface RoomWorkspaceGroupViewModel {
  id: string;
  name: string;
  symbol?: string;
  summary?: string;
  roomIds: readonly string[];
  isCollapsed?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
}

export interface RoomWorkspaceRoomViewModel {
  id: string;
  name: string;
  groupId?: string | null;
  symbol?: string;
  image?: string;
  description?: string;
  deviceSummary: string;
  nameValidationMessage?: string;
  attentionSummary?: string;
  statusLabel?: string;
  statusTone?: RoomWorkspaceStatusTone;
  isVisible: boolean;
  isFavorite: boolean;
  canDelete?: boolean;
  canMerge?: boolean;
  canSplit?: boolean;
}

export interface RoomWorkspaceDeviceViewModel {
  id: string;
  name: string;
  description?: string;
  stateLabel?: string;
  roomId?: string | null;
  isUnavailable?: boolean;
}

export interface RoomWorkspaceChangeViewModel {
  id: string;
  title: string;
  description: string;
  tone?: 'neutral' | 'warning' | 'critical';
}

export interface RoomWorkspaceViewModel {
  status: RoomWorkspaceStatus;
  mode: RoomWorkspaceMode;
  stage: RoomWorkspaceStage;
  query: string;
  deviceQuery: string;
  inventorySummary: string;
  resultSummary?: string;
  selectionSummary?: string;
  groups: readonly RoomWorkspaceGroupViewModel[];
  rooms: readonly RoomWorkspaceRoomViewModel[];
  selectedRoomId: string | null;
  devices: readonly RoomWorkspaceDeviceViewModel[];
  selectedDeviceIds: readonly string[];
  changes: readonly RoomWorkspaceChangeViewModel[];
  hasUnsavedChanges: boolean;
  isSaving?: boolean;
}

export interface RoomWorkspaceLabels {
  title: string;
  description: string;
  browseMode: string;
  manageMode: string;
  searchLabel: string;
  searchPlaceholder: string;
  clearSearch: string;
  roomsRegion: string;
  workspaceRegion: string;
  contextRegion: string;
  structureTitle: string;
  structureDescription: string;
  roomDetailsTitle: string;
  roomDetailsDescription: string;
  devicesTitle: string;
  devicesDescription: string;
  impactTitle: string;
  impactDescription: string;
  addRoom: string;
  addRoomToGroup: string;
  addGroup: string;
  moreActions: string;
  renameGroup: string;
  deleteGroup: string;
  editRoom: string;
  mergeRoom: string;
  mergeRoomDescription: string;
  splitRoom: string;
  splitRoomDescription: string;
  manageDevices: string;
  reviewChanges: string;
  saveChanges: string;
  cancel: string;
  back: string;
  retry: string;
  roomNameLabel: string;
  roomNamePlaceholder: string;
  groupLabel: string;
  ungroupedGroup: string;
  visibilityLabel: string;
  visibilityDescription: string;
  favoriteLabel: string;
  favoriteDescription: string;
  appearanceLabel: string;
  appearanceDescription: string;
  chooseAppearance: string;
  deleteRoom: string;
  deleteRoomDescription: string;
  dragRoom: (roomName: string) => string;
  moveEarlier: string;
  moveLater: string;
  selectRoom: string;
  collapseGroup: string;
  expandGroup: string;
  selectAll: string;
  clearSelection: string;
  selected: string;
  unavailable: string;
  noRoomsFoundTitle: string;
  noRoomsFoundDescription: string;
  selectRoomTitle: string;
  selectRoomDescription: string;
  noDevicesTitle: string;
  noDevicesDescription: string;
  noChangesTitle: string;
  noChangesDescription: string;
  currentRoomTitle: string;
  roomActivityTitle: string;
  roomActionsTitle: string;
  pendingChangesTitle: string;
  unsavedChanges: string;
  allChangesSaved: string;
  closeSheet: string;
}

export interface RoomWorkspaceActions {
  onModeChange: (mode: RoomWorkspaceMode) => void;
  onStageChange: (stage: RoomWorkspaceStage) => void;
  onQueryChange: (query: string) => void;
  onDeviceQueryChange: (query: string) => void;
  onSelectRoom: (roomId: string | null) => void;
  onAddRoom?: (groupId?: string) => void;
  onAddGroup?: () => void;
  onMoveGroup?: (groupId: string, direction: 'earlier' | 'later') => void;
  onRenameGroup?: (groupId: string) => void;
  onChooseGroupAppearance?: (groupId: string) => void;
  onRequestGroupDeletion?: (groupId: string) => void;
  onRequestRoomRename?: (roomId: string) => void;
  onRoomGroupChange?: (roomId: string, groupId: string | null) => void;
  onRoomVisibilityChange?: (roomId: string, visible: boolean) => void;
  onRoomFavoriteChange?: (roomId: string, favorite: boolean) => void;
  onChooseRoomAppearance?: (roomId: string) => void;
  onRequestRoomMerge?: (roomId: string) => void;
  onRequestRoomSplit?: (roomId: string) => void;
  onRequestRoomDeletion?: (roomId: string) => void;
  onDropRoom?: (roomId: string, targetRoomId: string) => void;
  onMoveRoom?: (roomId: string, direction: 'earlier' | 'later') => void;
  onToggleGroup?: (groupId: string, collapsed: boolean) => void;
  onDeviceSelectionChange?: (deviceId: string, selected: boolean) => void;
  onVisibleDeviceSelectionChange?: (deviceIds: readonly string[], selected: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
  onRetry?: () => void;
}

export interface RoomWorkspaceComponentProps {
  viewModel: RoomWorkspaceViewModel;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  className?: string;
}
