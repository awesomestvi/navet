import type { HassEntity } from 'home-assistant-js-websocket';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

interface UseHvacEntitySyncParams {
  liveEntity: HassEntity | undefined;
  initialTemp: number;
  initialCurrentTemp: number;
  initialMode: string;
  initialAction?: string;
  initialState: boolean;
  setTargetTemp: Dispatch<SetStateAction<number>>;
  setCurrentTemp: Dispatch<SetStateAction<number>>;
  setMode: Dispatch<SetStateAction<string>>;
  setAction: Dispatch<SetStateAction<string | undefined>>;
  setIsOn: Dispatch<SetStateAction<boolean>>;
}

export function useHvacEntitySync({
  liveEntity,
  initialTemp,
  initialCurrentTemp,
  initialMode,
  initialAction,
  initialState,
  setTargetTemp,
  setCurrentTemp,
  setMode,
  setAction,
  setIsOn,
}: UseHvacEntitySyncParams) {
  useEffect(() => {
    if (liveEntity) {
      const attrs = liveEntity.attributes as Record<string, unknown>;
      setIsOn(liveEntity.state !== 'off');
      setMode(typeof attrs.hvac_mode === 'string' ? attrs.hvac_mode : initialMode);
      setAction(typeof attrs.hvac_action === 'string' ? attrs.hvac_action : initialAction);
      if (typeof attrs.temperature === 'number') setTargetTemp(attrs.temperature);
      if (typeof attrs.current_temperature === 'number') setCurrentTemp(attrs.current_temperature);
      return;
    }
    setTargetTemp(initialTemp);
    setCurrentTemp(initialCurrentTemp);
    setMode(initialMode);
    setAction(initialAction);
    setIsOn(initialState);
  }, [
    liveEntity,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    initialState,
    setTargetTemp,
    setCurrentTemp,
    setMode,
    setAction,
    setIsOn,
  ]);
}
