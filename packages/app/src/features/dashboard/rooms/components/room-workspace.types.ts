import type { NavetEntityType } from '@navet/core/types';

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
  nameDraft?: string;
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
  entityType: NavetEntityType;
  deviceClass?: string;
  description?: string;
  stateLabel?: string;
  roomId?: string | null;
  roomName?: string;
  isUnavailable?: boolean;
  isDashboardDevice: boolean;
  isShownOnDashboard: boolean;
}

export interface RoomWorkspaceChangeViewModel {
  id: string;
  title: string;
  description: string;
  details?: string[];
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
  unsavedChangeCount: number;
  hasUnsavedChanges: boolean;
  hasValidationErrors?: boolean;
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
  roomDetailsTitle: string;
  roomDetailsDescription: string;
  devicesTitle: string;
  devicesDescription: string;
  dashboardDevices: string;
  hiddenDevices: string;
  impactTitle: string;
  impactDescription: string;
  addRoom: string;
  addRoomToGroup: string;
  addGroup: string;
  moreActions: string;
  renameGroup: string;
  deleteGroup: string;
  mergeRoom: string;
  mergeRoomDescription: string;
  splitRoom: string;
  splitRoomDescription: string;
  manageDevices: string;
  addDevice: string;
  deviceActions: string;
  hideDevice: string;
  showDevice: string;
  moveDevice: string;
  removeDevice: string;
  notInRoom: string;
  deviceSearchPlaceholder: string;
  saveChanges: string;
  discardChanges: string;
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
  noRoomsFoundTitle: string;
  noRoomsFoundDescription: string;
  selectRoomTitle: string;
  selectRoomDescription: string;
  noDevicesTitle: string;
  noDevicesDescription: string;
  noDashboardDevicesTitle: string;
  noDashboardDevicesDescription: string;
  noHiddenDevicesTitle: string;
  noHiddenDevicesDescription: string;
  noChangesTitle: string;
  noChangesDescription: string;
  currentRoomTitle: string;
  roomActionsTitle: string;
  pendingChangesTitle: string;
  unsavedChanges: (count: number) => string;
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
  onRoomNameChange?: (roomId: string, name: string) => void;
  onRoomGroupChange?: (roomId: string, groupId: string | null) => void;
  onRoomVisibilityChange?: (roomId: string, visible: boolean) => void;
  onRoomFavoriteChange?: (roomId: string, favorite: boolean) => void;
  onChooseRoomAppearance?: (roomId: string) => void;
  onRequestRoomMerge?: (roomId: string) => void;
  onRequestRoomSplit?: (roomId: string) => void;
  onRequestRoomDeletion?: (roomId: string) => void;
  onDropRoom?: (roomId: string, targetRoomId: string) => void;
  onToggleGroup?: (groupId: string, collapsed: boolean) => void;
  onDeviceVisibilityChange?: (deviceId: string, visible: boolean) => void;
  onRequestDeviceMove?: (deviceId: string) => void;
  onDeviceSelectionChange?: (deviceId: string, selected: boolean) => void;
  onDiscard: () => void;
  onSave: () => void;
  onRetry?: () => void;
}

export interface RoomWorkspaceComponentProps {
  viewModel: RoomWorkspaceViewModel;
  labels: RoomWorkspaceLabels;
  actions: RoomWorkspaceActions;
  className?: string;
}
