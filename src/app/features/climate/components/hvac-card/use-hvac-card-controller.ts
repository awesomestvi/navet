import type { HassEntity } from 'home-assistant-js-websocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { HA_PENDING_ECHO_WINDOW_MS } from '@/app/constants/interaction-timing';
import {
  useHaCommandQueue,
  useHomeAssistant,
  useHvacRegistryDeviceTopology,
  useI18n,
  useServiceActionHandler,
  useTheme,
} from '@/app/hooks';
import { parseNumberish } from '@/app/hooks/ha-entity-utils';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import {
  convertDisplayTemperatureToSourceUnit,
  convertTemperatureUnitValue,
  formatTemperature,
  formatTemperatureFromSourceUnit,
  formatTemperatureValue,
  formatTemperatureValueFromSourceUnit,
  type TemperatureUnit,
} from '@/app/utils/temperature';
import type { HVACCardProps } from './hvac-card.types';
import { useHvacEntitySync } from './use-hvac-entity-sync';
import { useHvacVisualMode } from './use-hvac-visual-mode';

export interface HVACSiblingEntity {
  id: string;
  entity: HassEntity;
}

export type HVACCardController = ReturnType<typeof useHVACCardController>;

// Stable empty references so the selector and useMemo don't create new objects
// when there are no siblings, which would break shallow equality.
const EMPTY_SIBLING_RECORD: Record<string, HassEntity | undefined> = {};
const DEFAULT_MIN_TEMP = 16;
const DEFAULT_MAX_TEMP = 30;
const DEFAULT_TEMP_STEP = 0.5;
const DEFAULT_MIN_TEMP_FAHRENHEIT = 60;
const DEFAULT_MAX_TEMP_FAHRENHEIT = 86;
const DEFAULT_TEMP_STEP_FAHRENHEIT = 1;

function resolveDefaultTemperatureRange(sourceTemperatureUnit: TemperatureUnit | undefined) {
  if (sourceTemperatureUnit !== 'fahrenheit') {
    return {
      minTemp: DEFAULT_MIN_TEMP,
      maxTemp: DEFAULT_MAX_TEMP,
      step: DEFAULT_TEMP_STEP,
    };
  }

  return {
    minTemp: DEFAULT_MIN_TEMP_FAHRENHEIT,
    maxTemp: DEFAULT_MAX_TEMP_FAHRENHEIT,
    step: DEFAULT_TEMP_STEP_FAHRENHEIT,
  };
}

function resolveClimateTemperatureRange(
  liveEntity: HassEntity | undefined,
  sourceTemperatureUnit: TemperatureUnit | undefined
) {
  const attrs = liveEntity?.attributes;
  const fallbackRange = resolveDefaultTemperatureRange(sourceTemperatureUnit);
  const minTemp = parseNumberish(attrs?.min_temp) ?? fallbackRange.minTemp;
  const maxTemp = parseNumberish(attrs?.max_temp) ?? fallbackRange.maxTemp;
  const step = parseNumberish(attrs?.target_temp_step) ?? fallbackRange.step;

  return {
    minTemp,
    maxTemp,
    step: step > 0 ? step : fallbackRange.step,
  };
}

function snapClimateTemperature(value: number, minTemp: number, maxTemp: number, step: number) {
  const snappedValue = Math.round((value - minTemp) / step) * step + minTemp;
  return Number(Math.min(maxTemp, Math.max(minTemp, snappedValue)).toFixed(3));
}

export function useHVACCardController({
  id,
  name,
  initialTemp = 21,
  initialCurrentTemp = 22,
  sourceTemperatureUnit,
  initialMode = 'cool',
  initialAction,
  supportedHvacModes: initialSupportedHvacModes,
  initialState = true,
  isEditMode,
  size,
}: Pick<
  HVACCardProps,
  | 'id'
  | 'name'
  | 'initialTemp'
  | 'initialCurrentTemp'
  | 'temperatureUnit'
  | 'initialMode'
  | 'initialAction'
  | 'supportedHvacModes'
  | 'initialState'
  | 'isEditMode'
  | 'size'
> & { sourceTemperatureUnit?: TemperatureUnit }) {
  const { t } = useI18n();
  const [targetTemp, setTargetTemp] = useState(initialTemp);
  const [currentTemp, setCurrentTemp] = useState(initialCurrentTemp);
  const [mode, setMode] = useState(initialMode);
  const [action, setAction] = useState(initialAction);
  const [supportedHvacModes, setSupportedHvacModes] = useState(initialSupportedHvacModes);
  const [isOn, setIsOn] = useState(initialState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { colors, theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const temperatureRange = useMemo(
    () => resolveClimateTemperatureRange(liveEntity, sourceTemperatureUnit),
    [liveEntity, sourceTemperatureUnit]
  );
  const { siblingIds: siblingEntityIds } = useHvacRegistryDeviceTopology(id);
  const pendingTargetTempRef = useRef<number | null>(null);
  const targetTempSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTemperatureAction = useServiceActionHandler();
  const runModeAction = useServiceActionHandler();

  useEffect(() => {
    return () => {
      if (targetTempSyncTimeoutRef.current !== null) {
        clearTimeout(targetTempSyncTimeoutRef.current);
      }
    };
  }, []);

  const syncTargetTempFromEntity = useCallback(
    (nextValue: number | ((current: number) => number)) => {
      setTargetTemp((current) => {
        const resolvedValue = typeof nextValue === 'function' ? nextValue(current) : nextValue;

        if (
          pendingTargetTempRef.current !== null &&
          Math.abs(resolvedValue - pendingTargetTempRef.current) > 0.05
        ) {
          return current;
        }

        if (pendingTargetTempRef.current !== null) {
          pendingTargetTempRef.current = null;
          if (targetTempSyncTimeoutRef.current !== null) {
            clearTimeout(targetTempSyncTimeoutRef.current);
            targetTempSyncTimeoutRef.current = null;
          }
        }

        return resolvedValue;
      });
    },
    []
  );

  const { queue: queueTargetTempSync } = useHaCommandQueue((nextTemp: number) =>
    runTemperatureAction(
      () => homeAssistantService.setClimateTemperature(id, nextTemp),
      t('climate.feedback.updateTemperatureFailed')
    )
  );

  const schedulePendingTargetTemp = useCallback((nextTemp: number) => {
    pendingTargetTempRef.current = nextTemp;
    if (targetTempSyncTimeoutRef.current !== null) {
      clearTimeout(targetTempSyncTimeoutRef.current);
    }
    targetTempSyncTimeoutRef.current = setTimeout(() => {
      pendingTargetTempRef.current = null;
      targetTempSyncTimeoutRef.current = null;
    }, HA_PENDING_ECHO_WINDOW_MS);
  }, []);

  const updateTargetTemp = useCallback(
    (nextTemp: number, immediate = false) => {
      const normalizedTemp = snapClimateTemperature(
        nextTemp,
        temperatureRange.minTemp,
        temperatureRange.maxTemp,
        temperatureRange.step
      );
      setTargetTemp(normalizedTemp);
      schedulePendingTargetTemp(normalizedTemp);
      queueTargetTempSync(normalizedTemp, immediate);
    },
    [queueTargetTempSync, schedulePendingTargetTemp, temperatureRange]
  );

  const updateMode = useCallback(
    (nextMode: string) => {
      const previousMode = mode;
      const previousIsOn = isOn;
      setMode(nextMode);
      setIsOn(nextMode !== 'off');
      void runModeAction(
        () => homeAssistantService.setClimateHvacMode(id, nextMode),
        t('climate.feedback.updateModeFailed'),
        {
          onError: () => {
            setMode(previousMode);
            setIsOn(previousIsOn);
          },
        }
      );
    },
    [id, isOn, mode, runModeAction, t]
  );

  useHvacEntitySync({
    liveEntity,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    initialSupportedHvacModes,
    initialState,
    setTargetTemp: syncTargetTempFromEntity,
    setCurrentTemp,
    setMode,
    setAction,
    setSupportedHvacModes,
    setIsOn,
  });

  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';

  // Subscribe to only the sibling entity states rather than the full entities dict.
  // `shallow` does a key-wise === comparison: home-assistant-js-websocket preserves
  // entity object references for unchanged entities, so this will not re-render when
  // unrelated entities update elsewhere in HA.
  const siblingEntitySelector = useCallback(
    (state: HomeAssistantStore): Record<string, HassEntity | undefined> => {
      if (!siblingEntityIds.length || !state.entities) return EMPTY_SIBLING_RECORD;
      return Object.fromEntries(siblingEntityIds.map((eid) => [eid, state.entities?.[eid]]));
    },
    [siblingEntityIds]
  );
  const siblingEntityRecord = useHomeAssistant(siblingEntitySelector, shallow);

  const siblingEntities = useMemo<HVACSiblingEntity[]>(
    () =>
      siblingEntityIds
        .map((eid) => {
          const entity = siblingEntityRecord[eid];
          return entity ? { id: eid, entity } : null;
        })
        .filter((entry): entry is HVACSiblingEntity => entry !== null),
    [siblingEntityIds, siblingEntityRecord]
  );

  const visualMode = useHvacVisualMode({
    action,
    currentTemp,
    isOn,
    mode,
    targetTemp,
  });

  const cardColors = !isOn
    ? colors.hvac.off
    : visualMode === 'cool'
      ? colors.hvac.cooling
      : visualMode === 'heat'
        ? colors.hvac.heating
        : colors.hvac.off;

  const textColor =
    theme === 'light'
      ? isOn
        ? 'text-gray-900'
        : 'text-gray-300'
      : isOn
        ? 'text-white'
        : 'text-gray-300';
  const secondaryTextColor = surface.textSecondary;

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: `${name} ${t('climate.subtitle').toLowerCase()}`,
    ariaPressed: isOn,
    isEditMode,
    onToggle: () => setIsOn((current) => !current),
    onOpenControls: () => setIsSettingsOpen(true),
    onOpenSettings: () => setIsSettingsOpen(true),
  });

  const lightOverlay =
    theme === 'light'
      ? isOn
        ? visualMode === 'cool'
          ? 'bg-cyan-50/45'
          : visualMode === 'heat'
            ? 'bg-orange-50/45'
            : 'bg-white/60'
        : 'bg-white/60'
      : undefined;
  const displayMinTemp = convertTemperatureUnitValue(
    temperatureRange.minTemp,
    sourceTemperatureUnit,
    temperatureUnit
  );
  const displayMaxTemp = convertTemperatureUnitValue(
    temperatureRange.maxTemp,
    sourceTemperatureUnit,
    temperatureUnit
  );
  const displayStep = Math.abs(
    convertTemperatureUnitValue(temperatureRange.step, sourceTemperatureUnit, temperatureUnit) -
      convertTemperatureUnitValue(0, sourceTemperatureUnit, temperatureUnit)
  );
  const displayTargetTemp = convertTemperatureUnitValue(
    targetTemp,
    sourceTemperatureUnit,
    temperatureUnit
  );
  const displayCurrentTemp = convertTemperatureUnitValue(
    currentTemp,
    sourceTemperatureUnit,
    temperatureUnit
  );

  const updateDisplayTargetTemp = (nextTemp: number, immediate = false) => {
    updateTargetTemp(
      convertDisplayTemperatureToSourceUnit(nextTemp, temperatureUnit, sourceTemperatureUnit),
      immediate
    );
  };

  return {
    cardColors,
    cardInteraction,
    currentTemp,
    displayCurrentTemp,
    displayMaxTemp,
    displayMinTemp,
    displayStep,
    displayTargetTemp,
    formatTemperature: (value: number) =>
      sourceTemperatureUnit
        ? formatTemperatureFromSourceUnit(value, sourceTemperatureUnit, temperatureUnit)
        : formatTemperature(value, temperatureUnit),
    formatTemperatureValue: (value: number) =>
      sourceTemperatureUnit
        ? formatTemperatureValueFromSourceUnit(value, sourceTemperatureUnit, temperatureUnit)
        : formatTemperatureValue(value, temperatureUnit),
    isMedium,
    isOn,
    isSettingsOpen,
    isSmall,
    lightOverlay,
    maxTemp: temperatureRange.maxTemp,
    minTemp: temperatureRange.minTemp,
    mode,
    visualMode,
    secondaryTextColor,
    siblingEntities,
    supportedHvacModes,
    setIsOn,
    setIsSettingsOpen,
    setMode: updateMode,
    setTargetTemp: (nextTemp: number) => updateTargetTemp(nextTemp),
    setDisplayTargetTemp: (nextTemp: number) => updateDisplayTargetTemp(nextTemp),
    commitTargetTemp: (nextTemp: number) => updateTargetTemp(nextTemp, true),
    commitDisplayTargetTemp: (nextTemp: number) => updateDisplayTargetTemp(nextTemp, true),
    step: temperatureRange.step,
    targetTemp,
    temperatureUnit,
    textColor,
    theme,
  };
}
