import type { AllViewGrouping } from '@/app/features/dashboard';

export interface MobileHeaderRoomReorderConfig {
  rooms: string[];
  areas: Array<{ area_id: string; name: string }>;
  roomHiddenItemCounts: Map<string, number>;
  roomItemCounts: Map<string, number>;
  onRoomOrderChange?: (rooms: string[]) => void;
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
