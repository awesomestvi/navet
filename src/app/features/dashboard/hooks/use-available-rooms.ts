import { useMemo } from 'react';
import { isAllRooms } from '@/app/constants/rooms';

export function useAvailableRooms(
  areas: Array<{ area_id: string; name: string }>,
  discoveredRooms: string[]
) {
  const areaRooms = useMemo(
    () => areas.map((area) => area.name).filter((name) => name && !isAllRooms(name)),
    [areas]
  );

  const availableRooms = useMemo(() => {
    const discoveredOnlyRooms = discoveredRooms.filter((room) => !areaRooms.includes(room));
    return [...new Set([...areaRooms, ...discoveredOnlyRooms])];
  }, [areaRooms, discoveredRooms]);

  return { areaRooms, availableRooms };
}
