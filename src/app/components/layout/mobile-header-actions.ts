import type { NavetRoomDescriptor } from '@/app/core/navet';
import type { AllViewGrouping } from '@/app/features/dashboard';

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
