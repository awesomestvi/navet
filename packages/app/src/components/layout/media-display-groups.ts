import {
  type MediaStackWidgetData,
  normalizeMediaStackWidgetData,
  selectMediaStackDevice,
} from '@navet/app/features/dashboard/components/widgets/media-stack-widget-data';
import type { MediaDevice } from '@navet/app/types/device.types';

export interface MediaDisplayGroup {
  id: string;
  data: MediaStackWidgetData;
}

export function normalizeMediaDisplayGroups(value: unknown): MediaDisplayGroup[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const { id, data } = candidate as Record<string, unknown>;
    if (typeof id !== 'string' || !id.trim() || seenIds.has(id)) return [];
    seenIds.add(id);
    return [
      {
        id,
        data: normalizeMediaStackWidgetData(
          data && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : {}
        ) ?? { entityIds: [], priorityOrder: [], idleBehavior: 'compact' },
      },
    ];
  });
}

export function getMediaDisplayGroupMemberIds(groups: MediaDisplayGroup[]): Set<string> {
  return new Set(groups.flatMap((group) => group.data.entityIds ?? []));
}

export function getAvailableMediaDisplayGroupEntityIds(
  groupId: string,
  groups: MediaDisplayGroup[],
  visibleEntityIds: readonly string[]
): string[] {
  const claimedByOtherGroups = getMediaDisplayGroupMemberIds(
    groups.filter((group) => group.id !== groupId)
  );
  return visibleEntityIds.filter((entityId) => !claimedByOtherGroups.has(entityId));
}

export function isMediaDisplayGroupVisible(group: MediaDisplayGroup, devices: MediaDevice[]) {
  const members = devices.filter((device) => group.data.entityIds?.includes(device.id));
  return selectMediaStackDevice(members, group.data) !== null;
}
