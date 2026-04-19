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
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { HVACCardProps } from './hvac-card.types';
import { useHvacEntitySync } from './use-hvac-entity-sync';
import { useHvacVisualMode } from './use-hvac-visual-mode';

export interface HVACSiblingEntity {
  id: string;
  entity: HassEntity;
}

// Stable empty references so the selector and useMemo don't create new objects
// when there are no siblings, which would break shallow equality.
const EMPTY_SIBLING_RECORD: Record<string, HassEntity | undefined> = {};

export function useHVACCardController({
  id,
  name,
  initialTemp = 21,
  initialCurrentTemp = 22,
  initialMode = 'cool',
  initialAction,
  initialState = true,
  isEditMode,
  size,
}: Pick<
  HVACCardProps,
  | 'id'
  | 'name'
  | 'initialTemp'
  | 'initialCurrentTemp'
  | 'initialMode'
  | 'initialAction'
  | 'initialState'
  | 'isEditMode'
  | 'size'
>) {
  const { t } = useI18n();
  const [targetTemp, setTargetTemp] = useState(initialTemp);
  const [currentTemp, setCurrentTemp] = useState(initialCurrentTemp);
  const [mode, setMode] = useState(initialMode);
  const [action, setAction] = useState(initialAction);
  const [isOn, setIsOn] = useState(initialState);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { colors, theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { siblingIds: siblingEntityIds } = useHvacRegistryDeviceTopology(id);
  const pendingTargetTempRef = useRef<number | null>(null);
  const targetTempSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTemperatureAction = useServiceActionHandler();

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
      const normalizedTemp = Number(nextTemp.toFixed(1));
      setTargetTemp(normalizedTemp);
      schedulePendingTargetTemp(normalizedTemp);
      queueTargetTempSync(normalizedTemp, immediate);
    },
    [queueTargetTempSync, schedulePendingTargetTemp]
  );

  useHvacEntitySync({
    liveEntity,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    initialState,
    setTargetTemp: syncTargetTempFromEntity,
    setCurrentTemp,
    setMode,
    setAction,
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
        : 'text-gray-500'
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

  return {
    cardColors,
    cardInteraction,
    currentTemp,
    isMedium,
    isOn,
    isSettingsOpen,
    isSmall,
    lightOverlay,
    mode,
    visualMode,
    secondaryTextColor,
    siblingEntities,
    setIsOn,
    setIsSettingsOpen,
    setMode,
    setTargetTemp: (nextTemp: number) => updateTargetTemp(nextTemp),
    commitTargetTemp: (nextTemp: number) => updateTargetTemp(nextTemp, true),
    targetTemp,
    textColor,
    theme,
  };
}
