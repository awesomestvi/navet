import { useMemo } from 'react';

export function useAvailableRooms(
  areas: Array<{ area_id: string; name: string }>,
  discoveredRooms: string[]
) {
  const areaRooms = useMemo(
    () => areas.map((area) => area.name).filter((name) => name && name !== 'All'),
    [areas]
  );

  const availableRooms = useMemo(() => {
    const discoveredOnlyRooms = discoveredRooms.filter((room) => !areaRooms.includes(room));
    return [...new Set([...discoveredRooms, ...discoveredOnlyRooms])];
  }, [areaRooms, discoveredRooms]);

  return { areaRooms, availableRooms };
}
