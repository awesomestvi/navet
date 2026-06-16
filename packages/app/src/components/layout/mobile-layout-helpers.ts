import { isAllRooms } from '@navet/app/constants/rooms';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
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

export function getManageableRoomOrder(
  rooms: string[],
  manageableRooms: PlatformManageableRoomReference[]
) {
  const manageableRoomNames = manageableRooms
    .filter((room) => room.canOrder)
    .map((room) => room.name)
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
