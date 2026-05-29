import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { HA_PENDING_ECHO_WINDOW_MS } from '@/app/constants/interaction-timing';
import { readNavetClimateState } from '@/app/core/navet-device-state';
import {
  useHaCommandQueue,
  useI18n,
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
  useProviderHvacTopology,
  useProviderTemperatureUnit,
  useServiceActionHandler,
  useTheme,
} from '@/app/hooks';
import {
  parseNumberish,
  resolveClimateTargetTemperature,
  resolveClimateTemperatureUnit,
} from '@/app/hooks/entity-utils';
import { useIntegrationStore } from '@/app/hooks/use-integration-store';
import { useProviderDevice } from '@/app/hooks/use-provider-device';
import type { PlatformEntitySnapshot } from '@/app/platform/provider-feature-models';
import { dispatchEntityAction } from '@/app/services/integration-action.service';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
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
  entity: PlatformEntitySnapshot;
}

export type HVACCardController = ReturnType<typeof useHVACCardController>;

// Stable empty references so the selector and useMemo don't create new objects
// when there are no siblings, which would break shallow equality.
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
  liveEntity: PlatformEntitySnapshot | undefined,
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

function resolveClimateTemperatureServiceData(
  entityId: string,
  liveEntity: PlatformEntitySnapshot | undefined,
  nextTemp: number
): { temperature: number } | { target_temp_low?: number; target_temp_high?: number } {
  const nativeEntityId = parseProviderScopedId(entityId)?.nativeId ?? entityId;
  if (!liveEntity || nativeEntityId.startsWith('water_heater.')) {
    return { temperature: nextTemp };
  }

  const attrs = liveEntity.attributes;
  const targetLow = parseNumberish(attrs?.target_temp_low);
  const targetHigh = parseNumberish(attrs?.target_temp_high);

  if (targetLow === null && targetHigh === null) {
    return { temperature: nextTemp };
  }

  const action = typeof attrs?.hvac_action === 'string' ? attrs.hvac_action.toLowerCase() : '';
  const mode = typeof liveEntity.state === 'string' ? liveEntity.state.toLowerCase() : '';

  if ((action.includes('cool') || mode === 'cool') && targetHigh !== null) {
    return { target_temp_high: nextTemp };
  }

  if ((action.includes('heat') || mode === 'heat') && targetLow !== null) {
    return { target_temp_low: nextTemp };
  }

  const currentTarget = resolveClimateTargetTemperature(liveEntity);
  if (currentTarget !== null && targetLow !== null && targetHigh !== null) {
    const delta = nextTemp - currentTarget;
    return {
      target_temp_low: Number((targetLow + delta).toFixed(3)),
      target_temp_high: Number((targetHigh + delta).toFixed(3)),
    };
  }

  return targetHigh !== null ? { target_temp_high: nextTemp } : { target_temp_low: nextTemp };
}

function resolveClimateModeServiceRequest(
  entityId: string,
  nextMode: string
): { domain: 'climate' | 'water_heater'; service: string; serviceData: Record<string, unknown> } {
  const nativeEntityId = parseProviderScopedId(entityId)?.nativeId ?? entityId;

  if (nativeEntityId.startsWith('water_heater.')) {
    return {
      domain: 'water_heater',
      service: 'set_operation_mode',
      serviceData: { operation_mode: nextMode },
    };
  }

  return {
    domain: 'climate',
    service: 'set_hvac_mode',
    serviceData: { hvac_mode: nextMode },
  };
}

export function useHVACCardController({
  id,
  name,
  providerId,
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
  | 'providerId'
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
  const nativeEntityId = parseProviderScopedId(id)?.nativeId ?? id;
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
  const providerDevice = useProviderDevice(id);
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const providerState = readNavetClimateState(providerDevice);
  const resolvedProviderId =
    providerDevice?.providerId ??
    providerId ??
    parseProviderScopedId(id)?.providerId ??
    currentProviderId;
  const isHomeAssistantProvider = resolvedProviderId === 'home_assistant';
  const liveEntity = useProviderEntitySnapshot(id);
  const homeAssistantTemperatureUnit = useProviderTemperatureUnit(resolvedProviderId);
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const effectiveSourceTemperatureUnit = useMemo(
    () =>
      sourceTemperatureUnit ??
      (providerState?.temperatureUnit === 'celsius' ||
      providerState?.temperatureUnit === 'fahrenheit'
        ? providerState.temperatureUnit
        : undefined) ??
      resolveClimateTemperatureUnit(liveEntity, homeAssistantTemperatureUnit),
    [
      homeAssistantTemperatureUnit,
      liveEntity,
      providerState?.temperatureUnit,
      sourceTemperatureUnit,
    ]
  );
  const temperatureRange = useMemo(
    () => resolveClimateTemperatureRange(liveEntity, effectiveSourceTemperatureUnit),
    [effectiveSourceTemperatureUnit, liveEntity]
  );
  const { siblingIds: siblingEntityIds } = useProviderHvacTopology(id);
  const pendingTargetTempRef = useRef<number | null>(null);
  const deferredTargetTempRef = useRef<number | null>(null);
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
          deferredTargetTempRef.current = resolvedValue;
          return current;
        }

        if (pendingTargetTempRef.current !== null) {
          pendingTargetTempRef.current = null;
          deferredTargetTempRef.current = null;
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
    runTemperatureAction(async () => {
      const serviceData = resolveClimateTemperatureServiceData(id, liveEntity, nextTemp);
      await dispatchEntityAction({
        providerId: resolvedProviderId,
        entityId: id,
        domain: nativeEntityId.startsWith('water_heater.') ? 'water_heater' : 'climate',
        service: 'set_temperature',
        serviceData,
      });
    }, t('climate.feedback.updateTemperatureFailed'))
  );

  const schedulePendingTargetTemp = useCallback((nextTemp: number) => {
    pendingTargetTempRef.current = nextTemp;
    deferredTargetTempRef.current = null;
    if (targetTempSyncTimeoutRef.current !== null) {
      clearTimeout(targetTempSyncTimeoutRef.current);
    }
    targetTempSyncTimeoutRef.current = setTimeout(() => {
      pendingTargetTempRef.current = null;
      targetTempSyncTimeoutRef.current = null;
      const deferredTargetTemp = deferredTargetTempRef.current;
      deferredTargetTempRef.current = null;
      if (deferredTargetTemp !== null) {
        setTargetTemp(deferredTargetTemp);
      }
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
        async () => {
          const request = resolveClimateModeServiceRequest(id, nextMode);
          await dispatchEntityAction({
            providerId: resolvedProviderId,
            entityId: id,
            domain: request.domain,
            service: request.service,
            serviceData: request.serviceData,
          });
        },
        t('climate.feedback.updateModeFailed'),
        {
          onError: () => {
            setMode(previousMode);
            setIsOn(previousIsOn);
          },
        }
      );
    },
    [id, isOn, mode, resolvedProviderId, runModeAction, t]
  );

  useHvacEntitySync({
    liveEntity,
    providerState,
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
  const siblingEntityRecord = useProviderEntitySnapshotRecord(siblingEntityIds, {
    providerId: resolvedProviderId,
    enabled: isHomeAssistantProvider,
  });

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
    effectiveSourceTemperatureUnit,
    temperatureUnit
  );
  const displayMaxTemp = convertTemperatureUnitValue(
    temperatureRange.maxTemp,
    effectiveSourceTemperatureUnit,
    temperatureUnit
  );
  const displayStep = Math.abs(
    convertTemperatureUnitValue(
      temperatureRange.step,
      effectiveSourceTemperatureUnit,
      temperatureUnit
    ) - convertTemperatureUnitValue(0, effectiveSourceTemperatureUnit, temperatureUnit)
  );
  const displayTargetTemp = convertTemperatureUnitValue(
    targetTemp,
    effectiveSourceTemperatureUnit,
    temperatureUnit
  );
  const displayCurrentTemp = convertTemperatureUnitValue(
    currentTemp,
    effectiveSourceTemperatureUnit,
    temperatureUnit
  );

  const updateDisplayTargetTemp = (nextTemp: number, immediate = false) => {
    updateTargetTemp(
      convertDisplayTemperatureToSourceUnit(
        nextTemp,
        temperatureUnit,
        effectiveSourceTemperatureUnit
      ),
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
      effectiveSourceTemperatureUnit
        ? formatTemperatureFromSourceUnit(value, effectiveSourceTemperatureUnit, temperatureUnit)
        : formatTemperature(value, temperatureUnit),
    formatTemperatureValue: (value: number) =>
      effectiveSourceTemperatureUnit
        ? formatTemperatureValueFromSourceUnit(
            value,
            effectiveSourceTemperatureUnit,
            temperatureUnit
          )
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
    sourceTemperatureUnit: effectiveSourceTemperatureUnit,
    textColor,
    theme,
  };
}
