import type { NavetRoomDescriptor } from '@navet/app/internal/compat-models';
import { isAllRooms } from '@/app/constants/rooms';
import type { MobileHeaderEditActions } from './mobile-header-actions';

export interface MobileHeaderActionAvailability extends MobileHeaderEditActions {
  hasEditUtilities: boolean;
  showAllViewGrouping: boolean;
}

export function getMobileHeaderActionAvailability(
  actions?: MobileHeaderEditActions
): MobileHeaderActionAvailability | null {
  if (!actions) {
    return null;
  }

  const showAllViewGrouping =
    actions.isEditMode &&
    actions.allViewGrouping !== undefined &&
    actions.onAllViewGroupingChange !== undefined;
  const hasEditUtilities =
    actions.isEditMode && (Boolean(actions.onAddEntity) || Boolean(actions.reorderRooms));

  return {
    ...actions,
    hasEditUtilities,
    showAllViewGrouping,
  };
}

export function getManageableRoomOrder(rooms: string[], roomDescriptors: NavetRoomDescriptor[]) {
  const manageableRoomNames = roomDescriptors
    .filter((descriptor) => descriptor.sources.some((source) => source.supportsOrdering))
    .map((descriptor) => descriptor.name)
    .filter((name) => name.length > 0 && !isAllRooms(name));
  const orderedKnownRooms = rooms.filter((room) => manageableRoomNames.includes(room));
  const unorderedAreaRooms = manageableRoomNames.filter(
    (room) => !orderedKnownRooms.includes(room)
  );
  const navetOnlyRooms = rooms.filter(
    (room) => !isAllRooms(room) && !manageableRoomNames.includes(room)
  );
  return [...new Set([...orderedKnownRooms, ...unorderedAreaRooms, ...navetOnlyRooms])];
}
