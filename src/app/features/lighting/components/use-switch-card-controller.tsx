import type { HassEntity } from 'home-assistant-js-websocket';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isExtraSmallCardSize, isTinyCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { SwitchCardProps } from './switch-card.types';
import { useSwitchCardAppearance } from './use-switch-card-appearance';
import { useSwitchMetricFormatters } from './use-switch-metric-formatters';
import { useSwitchMetricState } from './use-switch-metric-state';
import { useSwitchResetTimerCleanup } from './use-switch-reset-timer-cleanup';
import { useSwitchToggleAction } from './use-switch-toggle-action';

export interface SwitchSiblingEntity {
  id: string;
  entity: HassEntity;
}

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
  const allEntities = useHomeAssistant(homeAssistantSelectors.entities);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const { colors, theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const resolvedEntityType = entityType || t('lighting.type.switch');
  const resolvedServiceDomain = serviceDomain || id.split('.')[0];
  const resolvedServiceAction = serviceAction || 'binary';
  const isScript = resolvedServiceDomain === 'script';
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const appearance = useSwitchCardAppearance({ id, isScript });
  const deviceId = useMemo(
    () => entityRegistry.find((entry) => entry.entity_id === id)?.device_id ?? null,
    [entityRegistry, id]
  );

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

  const siblingEntities = useMemo(() => {
    if (!deviceId || !allEntities) {
      return [];
    }

    return entityRegistry
      .filter((entry) => {
        if (entry.device_id !== deviceId || entry.entity_id === id) {
          return false;
        }

        return entry.entity_id.startsWith('switch.');
      })
      .map((entry) => ({ id: entry.entity_id, entity: allEntities[entry.entity_id] }))
      .filter((entry) => entry.entity !== undefined) as SwitchSiblingEntity[];
  }, [allEntities, deviceId, entityRegistry, id]);

  const cardColors = isOn ? colors.switch.on : colors.switch.off;
  const hasControlsDialog = true;
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
    entityType: resolvedEntityType,
    formatMetricValue,
    getMetricLabel,
    handleMetricToggle: metricState.handleMetricToggle,
    HeaderIconComponent: appearance.HeaderIconComponent,
    hasControlsDialog,
    hasMetrics: metricState.hasMetrics,
    headerIconText: appearance.headerIconText,
    isDialogOpen,
    isOn,
    isScript,
    isTiny,
    metricLimit: metricState.metricLimit,
    metricSectionDescription:
      metricState.metricLimit === 1
        ? t('lighting.switch.metricLimit.one', { count: metricState.metricLimit })
        : t('lighting.switch.metricLimit.other', { count: metricState.metricLimit }),
    metricSectionTitle: t('lighting.switch.cardMetric'),
    renderMetricIcon,
    selectedMetricLabels: metricState.selectedMetricLabels,
    selectedMetrics: metricState.selectedMetrics,
    selectedIcon: appearance.selectedIcon,
    siblingEntities,
    setIsDialogOpen,
    setSelectedIcon: appearance.setSelectedIcon,
    setTintColor: appearance.setTintColor,
    showSettingsButton,
    isExtraSmall,
    theme,
    tintColor: appearance.tintColor,
  };
}
