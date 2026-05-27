import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigationStore } from '../stores/navigation-store';

/**
 * Custom hook for managing room navigation state
 * Encapsulates active room selection logic
 */
export const useRoomNavigation = (defaultRoom: string) => {
  const { currentRoom, lastExplicitRoom, setCurrentRoom } = useNavigationStore(
    useShallow((state) => ({
      currentRoom: state.currentRoom,
      lastExplicitRoom: state.lastExplicitRoom,
      setCurrentRoom: state.setCurrentRoom,
    }))
  );
  const activeRoom = currentRoom || defaultRoom;
  const preferredRoom = lastExplicitRoom || defaultRoom;

  const changeRoom = useCallback(
    (room: string) => {
      setCurrentRoom(room);
    },
    [setCurrentRoom]
  );

  const fallbackRoom = useCallback(
    (room: string) => {
      setCurrentRoom(room, { explicit: false });
    },
    [setCurrentRoom]
  );

  return useMemo(
    () => ({ activeRoom, preferredRoom, changeRoom, fallbackRoom }),
    [activeRoom, changeRoom, fallbackRoom, preferredRoom]
  );
};
