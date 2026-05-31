import type { AllViewGrouping } from '@navet/app/features/dashboard';
import type { NavetRoomDescriptor } from '@navet/app/provider-models';

export interface MobileHeaderRoomReorderConfig {
  rooms: string[];
  hiddenRoomNames?: string[];
  roomDescriptors: NavetRoomDescriptor[];
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
