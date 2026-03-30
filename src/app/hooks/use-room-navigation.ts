import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigationStore } from '../stores/navigation-store';

/**
 * Custom hook for managing room navigation state
 * Encapsulates active room selection logic
 */
export const useRoomNavigation = (defaultRoom: string) => {
  const { currentRoom, setCurrentRoom } = useNavigationStore(
    useShallow((state) => ({
      currentRoom: state.currentRoom,
      setCurrentRoom: state.setCurrentRoom,
    }))
  );
  const activeRoom = currentRoom || defaultRoom;

  const changeRoom = useCallback(
    (room: string) => {
      setCurrentRoom(room);
    },
    [setCurrentRoom]
  );

  return useMemo(() => ({ activeRoom, changeRoom }), [activeRoom, changeRoom]);
};
