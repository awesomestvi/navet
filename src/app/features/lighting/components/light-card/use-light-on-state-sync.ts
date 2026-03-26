import type { HassEntity } from 'home-assistant-js-websocket';
import { useEffect } from 'react';

interface UseLightOnStateSyncParams {
  initialState: boolean;
  liveEntity: HassEntity | undefined;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLightOnStateSync({
  initialState,
  liveEntity,
  setIsOn,
}: UseLightOnStateSyncParams) {
  useEffect(() => {
    if (liveEntity) return;
    setIsOn(initialState);
  }, [initialState, liveEntity, setIsOn]);

  useEffect(() => {
    if (!liveEntity) return;
    setIsOn(liveEntity.state === 'on');
  }, [liveEntity, setIsOn]);
}
