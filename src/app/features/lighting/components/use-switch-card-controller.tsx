import type { HassEntity } from 'home-assistant-js-websocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { isExtraSmallCardSize, isTinyCardSize } from '@/app/components/shared/card-size-selector';
import { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useHomeAssistant, useI18n, useSwitchRegistryDeviceTopology, useTheme } from '@/app/hooks';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
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

const EMPTY_SIBLING_RECORD: Record<string, HassEntity | undefined> = {};

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
  const { siblingIds: siblingEntityIds } = useSwitchRegistryDeviceTopology(id);
  const { colors, theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const resolvedEntityType = entityType || t('lighting.type.switch');
  const resolvedServiceDomain = serviceDomain || id.split('.')[0];
  const resolvedServiceAction = serviceAction || 'binary';
  const isScript = resolvedServiceDomain === 'script';
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);
  const appearance = useSwitchCardAppearance({ id, isScript });

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

  const siblingEntitySelector = useCallback(
    (state: HomeAssistantStore): Record<string, HassEntity | undefined> => {
      if (!siblingEntityIds.length || !state.entities) return EMPTY_SIBLING_RECORD;
      return Object.fromEntries(siblingEntityIds.map((eid) => [eid, state.entities?.[eid]]));
    },
    [siblingEntityIds]
  );
  const siblingEntityRecord = useHomeAssistant(siblingEntitySelector, shallow);

  const siblingEntities = useMemo<SwitchSiblingEntity[]>(
    () =>
      siblingEntityIds
        .map((eid) => {
          const entity = siblingEntityRecord[eid];
          return entity ? { id: eid, entity } : null;
        })
        .filter((entry): entry is SwitchSiblingEntity => entry !== null),
    [siblingEntityIds, siblingEntityRecord]
  );

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
