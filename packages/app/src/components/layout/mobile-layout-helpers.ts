import { isAllRooms } from '@navet/app/constants/rooms';
import { normalizeRoomName, roomNamesMatch } from '@navet/app/utils/room-name';
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
  const orderedKnownRooms = rooms.filter((room) =>
    manageableRoomNames.some((name) => roomNamesMatch(name, room))
  );
  const unorderedAreaRooms = manageableRoomNames.filter(
    (room) => !orderedKnownRooms.some((name) => roomNamesMatch(name, room))
  );
  const navetOnlyRooms = rooms.filter(
    (room) => !isAllRooms(room) && !manageableRoomNames.some((name) => roomNamesMatch(name, room))
  );
  const namesByKey = new Map<string, string>();
  for (const room of [...orderedKnownRooms, ...unorderedAreaRooms, ...navetOnlyRooms]) {
    const key = normalizeRoomName(room);
    if (!namesByKey.has(key)) namesByKey.set(key, room);
  }
  return [...namesByKey.values()];
}
