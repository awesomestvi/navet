/** Room labels match independently of capitalization; display names keep their casing. */
export function normalizeRoomName(name: string): string {
  return name.trim().toLowerCase();
}

export function roomNamesMatch(left: string, right: string): boolean {
  return normalizeRoomName(left) === normalizeRoomName(right);
}

export function groupByRoomName<T>(items: readonly T[], getRoomName: (item: T) => string) {
  const groups = new Map<string, { room: string; items: T[] }>();
  for (const item of items) {
    const room = getRoomName(item);
    const key = normalizeRoomName(room);
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { room, items: [item] });
  }
  return [...groups.values()];
}
