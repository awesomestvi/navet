import type { HassEntity } from 'home-assistant-js-websocket';
import { useCallback, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
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
const EMPTY_SIBLING_IDS: string[] = [];
const EMPTY_SIBLING_RECORD: Record<string, HassEntity | undefined> = {};
const SIBLING_DOMAIN_PATTERN = /^(switch|input_boolean|script|button|input_button)\./;

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
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);

  useHvacEntitySync({
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
  });

  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';

  // Derive the parent device id from the entity registry. The registry only changes
  // when devices are added/removed — not on entity state updates.
  const deviceId = useMemo(
    () => entityRegistry.find((entry) => entry.entity_id === id)?.device_id ?? null,
    [entityRegistry, id]
  );

  // Compute the sibling entity IDs from the registry alone (no entity state needed).
  // Changes only when the device topology changes, not on state updates.
  const siblingEntityIds = useMemo<string[]>(() => {
    if (!deviceId) return EMPTY_SIBLING_IDS;
    return entityRegistry
      .filter(
        (e) =>
          e.device_id === deviceId && e.entity_id !== id && SIBLING_DOMAIN_PATTERN.test(e.entity_id)
      )
      .map((e) => e.entity_id);
  }, [deviceId, id, entityRegistry]);

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
    setTargetTemp,
    targetTemp,
    textColor,
    theme,
  };
}
