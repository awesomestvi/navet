import { useState } from 'react';
import { isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { HVACCardProps } from './hvac-card.types';
import { useHvacEntitySync } from './use-hvac-entity-sync';
import { useHvacVisualMode } from './use-hvac-visual-mode';

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
    setIsOn,
    setIsSettingsOpen,
    setMode,
    setTargetTemp,
    targetTemp,
    textColor,
    theme,
  };
}
