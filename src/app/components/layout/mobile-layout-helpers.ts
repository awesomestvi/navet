import type { MobileHeaderEditActions } from './mobile-header-actions';

export interface NamedArea {
  area_id: string;
  name: string;
}

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

export function getManageableRoomOrder(rooms: string[], areas: NamedArea[]) {
  const areaNames = areas.map((area) => area.name).filter((name) => name && name !== 'All');
  const orderedKnownRooms = rooms.filter((room) => areaNames.includes(room));
  const unorderedAreaRooms = areaNames.filter((room) => !orderedKnownRooms.includes(room));
  const navetOnlyRooms = rooms.filter((room) => room !== 'All' && !areaNames.includes(room));
  return [...new Set([...orderedKnownRooms, ...unorderedAreaRooms, ...navetOnlyRooms])];
}
