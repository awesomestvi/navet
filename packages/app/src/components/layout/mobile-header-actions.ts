import type { AllViewGrouping } from '@navet/app/features/dashboard';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';

export interface MobileHeaderRoomReorderConfig {
  rooms: string[];
  hiddenRoomNames?: string[];
  manageableRooms: PlatformManageableRoomReference[];
  roomHiddenItemCounts: Map<string, number>;
  roomItemCounts: Map<string, number>;
  onRoomOrderChange?: (rooms: string[]) => void;
  onHiddenRoomsChange?: (rooms: string[]) => void;
}

export interface MobileHeaderEditActions {
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onAddEntity?: () => void;
  addEntityLabel?: string;
  reorderRooms?: MobileHeaderRoomReorderConfig;
  allViewGrouping?: AllViewGrouping;
  onAllViewGroupingChange?: (grouping: AllViewGrouping) => void;
}
