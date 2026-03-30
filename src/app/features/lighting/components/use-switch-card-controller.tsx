import { useEffect, useRef, useState } from 'react';
import { isExtraSmallCardSize, isTinyCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { SwitchCardProps } from './switch-card.types';
import { useSwitchMetricFormatters } from './use-switch-metric-formatters';
import { useSwitchMetricState } from './use-switch-metric-state';
import { useSwitchResetTimerCleanup } from './use-switch-reset-timer-cleanup';
import { useSwitchToggleAction } from './use-switch-toggle-action';

export function useSwitchCardController({
  id,
  name,
  size,
  initialState = false,
  entityType,
  serviceDomain,
  serviceAction,
  power,
  voltage,
  energy,
  metrics,
  isEditMode = false,
}: Omit<SwitchCardProps, 'room'>) {
  const [isOn, setIsOn] = useState(initialState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useSwitchResetTimerCleanup(resetTimerRef);

  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { colors, theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const resolvedEntityType = entityType || t('lighting.type.switch');
  const resolvedServiceDomain = serviceDomain || id.split('.')[0];
  const resolvedServiceAction = serviceAction || 'binary';
  const isScript = resolvedServiceDomain === 'script';
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);

  useEffect(() => {
    if (liveEntity) {
      setIsOn(liveEntity.state === 'on');
      return;
    }
    setIsOn(initialState);
  }, [initialState, liveEntity]);

  const metricState = useSwitchMetricState({
    id,
    size,
    isOn,
    power,
    voltage,
    energy,
    metrics,
  });

  const hasControlsDialog = metricState.hasMetrics;
  const surface = getThemeSurfaceTokens(theme);
  const cardColors = isOn ? colors.switch.on : colors.switch.off;
  const textColor =
    theme === 'light'
      ? isOn
        ? 'text-gray-900'
        : 'text-gray-700'
      : isOn
        ? 'text-white'
        : 'text-gray-100';
  const valueColor = surface.textPrimary;
  const labelColor = surface.textSecondary;
  const settingsButtonClass = `${surface.subtleBg} ${surface.hoverBg} ${surface.textPrimary}`;
  const dialogSurface = `${surface.panel} ${surface.border} ${surface.textPrimary}`;
  const accentColor = getThemeColorValue(primaryColor);

  const handleToggle = useSwitchToggleAction({
    id,
    isOn,
    setIsOn,
    resetTimerRef,
    resolvedServiceDomain,
    resolvedServiceAction,
    updateSwitchFailedMessage: t('lighting.feedback.updateSwitchFailed'),
  });

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: name,
    ariaPressed: isOn,
    isEditMode,
    onToggle: handleToggle,
    onOpenControls: () => {
      if (hasControlsDialog) setIsDialogOpen(true);
    },
    onOpenSettings: () => {
      if (hasControlsDialog) setIsDialogOpen(true);
    },
  });

  const showSettingsButton =
    hasControlsDialog && cardInteraction.interactionMode !== 'control-first';

  const { formatMetricValue, getMetricLabel, renderMetricIcon } = useSwitchMetricFormatters({
    labels: {
      power: t('lighting.metrics.power'),
      voltage: t('lighting.metrics.voltage'),
      energy: t('lighting.metrics.energy'),
    },
  });

  return {
    availableMetrics: metricState.availableMetrics,
    accentColor,
    cardColors,
    cardInteraction,
    dialogSurface,
    entityType: resolvedEntityType,
    formatMetricValue,
    getMetricLabel,
    handleMetricToggle: metricState.handleMetricToggle,
    hasControlsDialog,
    hasMetrics: metricState.hasMetrics,
    isDialogOpen,
    isOn,
    isScript,
    isTiny,
    labelColor,
    metricLimit: metricState.metricLimit,
    metricSectionDescription:
      metricState.metricLimit === 1
        ? t('lighting.switch.metricLimit.one', { count: metricState.metricLimit })
        : t('lighting.switch.metricLimit.other', { count: metricState.metricLimit }),
    metricSectionTitle: t('lighting.switch.cardMetric'),
    roomLabel: t('lighting.settings.room'),
    renderMetricIcon,
    selectedMetricLabels: metricState.selectedMetricLabels,
    selectedMetrics: metricState.selectedMetrics,
    setIsDialogOpen,
    settingsButtonClass,
    showSettingsButton,
    isExtraSmall,
    textColor,
    theme,
    valueColor,
  };
}
