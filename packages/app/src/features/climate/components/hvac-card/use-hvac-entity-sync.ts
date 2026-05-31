import type { NavetClimateState } from '@navet/app/core/navet-device-state';
import { parseNumberish, resolveClimateTargetTemperature } from '@navet/app/hooks/entity-utils';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { type Dispatch, type SetStateAction, useEffect } from 'react';

interface UseHvacEntitySyncParams {
  liveEntity: PlatformEntitySnapshot | undefined;
  providerState?: NavetClimateState | null;
  initialTemp: number;
  initialCurrentTemp: number;
  initialMode: string;
  initialAction?: string;
  initialSupportedHvacModes?: string[];
  initialState: boolean;
  setTargetTemp: Dispatch<SetStateAction<number>>;
  setCurrentTemp: Dispatch<SetStateAction<number>>;
  setMode: Dispatch<SetStateAction<string>>;
  setAction: Dispatch<SetStateAction<string | undefined>>;
  setSupportedHvacModes: Dispatch<SetStateAction<string[] | undefined>>;
  setIsOn: Dispatch<SetStateAction<boolean>>;
}

function arraysEqual(left: string[] | undefined, right: string[] | undefined) {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return left === right;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function parseSupportedHvacModes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((mode): mode is string => typeof mode === 'string');
}

function resolveMode(
  liveEntity: PlatformEntitySnapshot,
  attrs: Record<string, unknown>,
  initialMode: string
) {
  if (typeof liveEntity.state === 'string' && liveEntity.state) {
    return liveEntity.state;
  }

  if (typeof attrs.hvac_mode === 'string') {
    return attrs.hvac_mode;
  }

  if (typeof attrs.operation_mode === 'string') {
    return attrs.operation_mode;
  }
  return initialMode;
}

function resolveSupportedModes(liveEntity: PlatformEntitySnapshot, attrs: Record<string, unknown>) {
  const supportedModes = parseSupportedHvacModes(attrs.hvac_modes ?? attrs.operation_list);
  return liveEntity.entityId.startsWith('water_heater.') ? (supportedModes ?? []) : supportedModes;
}

export function useHvacEntitySync({
  liveEntity,
  providerState,
  initialTemp,
  initialCurrentTemp,
  initialMode,
  initialAction,
  initialSupportedHvacModes,
  initialState,
  setTargetTemp,
  setCurrentTemp,
  setMode,
  setAction,
  setSupportedHvacModes,
  setIsOn,
}: UseHvacEntitySyncParams) {
  useEffect(() => {
    if (liveEntity) {
      const attrs = liveEntity.attributes as Record<string, unknown>;
      const nextIsOn = liveEntity.state !== 'off';
      const nextMode = resolveMode(liveEntity, attrs, initialMode);
      const nextAction = typeof attrs.hvac_action === 'string' ? attrs.hvac_action : initialAction;
      const nextSupportedModes = resolveSupportedModes(liveEntity, attrs);
      setIsOn((current) => (current === nextIsOn ? current : nextIsOn));
      setMode((current) => (current === nextMode ? current : nextMode));
      setAction((current) => (current === nextAction ? current : nextAction));
      setSupportedHvacModes((current) =>
        arraysEqual(current, nextSupportedModes) ? current : nextSupportedModes
      );
      const targetTemp = resolveClimateTargetTemperature(liveEntity);
      const currentTemp = parseNumberish(attrs.current_temperature);
      if (targetTemp !== null) {
        setTargetTemp((current) => (current === targetTemp ? current : targetTemp));
      }
      if (currentTemp !== null) {
        setCurrentTemp((current) => (current === currentTemp ? current : currentTemp));
      }
      return;
    }
    if (providerState) {
      const nextTargetTemp =
        typeof providerState.temperature === 'number' ? providerState.temperature : initialTemp;
      const nextCurrentTemp =
        typeof providerState.currentTemperature === 'number'
          ? providerState.currentTemperature
          : initialCurrentTemp;
      const nextMode = typeof providerState.mode === 'string' ? providerState.mode : initialMode;
      const nextAction =
        typeof providerState.action === 'string' ? providerState.action : initialAction;
      const nextSupportedModes = providerState.supportedHvacModes ?? initialSupportedHvacModes;
      const nextIsOn =
        (providerState.mode ?? initialMode) !== 'off' && (providerState.value ?? 'off') !== 'off';

      setTargetTemp((current) => (current === nextTargetTemp ? current : nextTargetTemp));
      setCurrentTemp((current) => (current === nextCurrentTemp ? current : nextCurrentTemp));
      setMode((current) => (current === nextMode ? current : nextMode));
      setAction((current) => (current === nextAction ? current : nextAction));
      setSupportedHvacModes((current) =>
        arraysEqual(current, nextSupportedModes) ? current : nextSupportedModes
      );
      setIsOn((current) => (current === nextIsOn ? current : nextIsOn));
      return;
    }
    setTargetTemp((current) => (current === initialTemp ? current : initialTemp));
    setCurrentTemp((current) => (current === initialCurrentTemp ? current : initialCurrentTemp));
    setMode((current) => (current === initialMode ? current : initialMode));
    setAction((current) => (current === initialAction ? current : initialAction));
    setSupportedHvacModes((current) =>
      arraysEqual(current, initialSupportedHvacModes) ? current : initialSupportedHvacModes
    );
    setIsOn((current) => (current === initialState ? current : initialState));
  }, [
    liveEntity,
    providerState,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    initialSupportedHvacModes,
    initialState,
    setTargetTemp,
    setCurrentTemp,
    setMode,
    setAction,
    setSupportedHvacModes,
    setIsOn,
  ]);
}
