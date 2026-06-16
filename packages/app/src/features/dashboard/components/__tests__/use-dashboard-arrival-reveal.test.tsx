import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardArrivalReveal } from '../use-dashboard-arrival-reveal';

describe('useDashboardArrivalReveal', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
  });

  it('resolves effective low quality when low-power mode overrides a high requested quality', () => {
    useSettingsStore.getState().updateSettings({
      effectsQuality: 'high',
      lowPowerMode: true,
    });

    const { result } = renderHookWithProviders(() =>
      useDashboardArrivalReveal(false, vi.fn(), 'import')
    );

    expect(result.current.effectsQuality).toBe('low');
  });
});
