import { useIntegrationStore } from '@navet/app/hooks';
import { providerRuntimeSelectors, settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';
import { useMemo } from 'react';
import { useTaskRoutines } from './use-task-automation-groups';

export function useAutomationDashboardController() {
  const { automations, quickActions } = useTaskRoutines();
  const currentProviderRuntime = useIntegrationStore(
    providerRuntimeSelectors.currentProviderRuntime
  );
  const connected = currentProviderRuntime.connected;
  const entitiesHydrated = currentProviderRuntime.entitiesHydrated;
  const disableAnimations = useSettingsStore(settingsSelectors.disableAnimations);
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const enabledAutomations = useMemo(
    () => automations.filter((automation) => automation.status === 'active'),
    [automations]
  );
  const disabledAutomations = useMemo(
    () => automations.filter((automation) => automation.status === 'disabled'),
    [automations]
  );
  const recentlyTriggeredAutomations = useMemo(
    () => automations.filter((automation) => automation.isRecentlyTriggered),
    [automations]
  );
  const attentionAutomations = useMemo(
    () => automations.filter((automation) => automation.needsAttention),
    [automations]
  );
  const latestAutomation = useMemo(
    () =>
      automations
        .filter((automation) => automation.lastTriggered)
        .sort((left, right) => {
          const leftTime = new Date(left.lastTriggered ?? '').getTime();
          const rightTime = new Date(right.lastTriggered ?? '').getTime();

          const safeRightTime = Number.isFinite(rightTime) ? rightTime : 0;
          const safeLeftTime = Number.isFinite(leftTime) ? leftTime : 0;

          return safeRightTime - safeLeftTime;
        })[0],
    [automations]
  );
  const automationRooms = useMemo(
    () =>
      Array.from(
        new Set(
          automations
            .map((automation) => automation.room)
            .filter((room) => room && room !== 'Unassigned')
        )
      ).sort((left, right) => left.localeCompare(right)),
    [automations]
  );
  const shouldReduceMotion =
    resolveEffectsQuality(effectsQuality, disableAnimations || lowPowerMode) === 'low';

  return {
    automations,
    quickActions,
    enabledAutomations,
    disabledAutomations,
    recentlyTriggeredAutomations,
    attentionAutomations,
    latestAutomation,
    automationRooms,
    automationSummary: {
      total: automations.length,
      active: enabledAutomations.length,
      disabled: disabledAutomations.length,
      recent: recentlyTriggeredAutomations.length,
      attention: attentionAutomations.length,
    },
    connected,
    isLoading: !entitiesHydrated,
    hasError: entitiesHydrated && !connected,
    shouldReduceMotion,
  };
}
