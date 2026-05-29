import { describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

vi.mock('@/app/hooks', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useProviderEntityModel: vi.fn(() => null),
  useProviderEntitySnapshot: vi.fn(() => undefined),
  useProviderEntitySnapshotRecord: vi.fn(() => ({})),
  useProviderSwitchTopology: () => ({ deviceId: null, siblingIds: [] }),
  useTheme: () => ({
    accentColor: 'blue',
    colors: {
      switch: {
        on: { accent: 'text-green-500' },
        off: { accent: 'text-slate-500' },
      },
    },
    theme: 'dark',
  }),
}));

vi.mock('@/app/components/shared/entity-card-interaction-controller', () => ({
  useEntityCardInteractionController: () => ({
    interactionMode: 'control-first',
    cardProps: {},
    buttonProps: {},
  }),
}));

vi.mock('../use-switch-card-appearance', () => ({
  useSwitchCardAppearance: () => ({
    HeaderIconComponent: null,
    headerIconText: null,
    selectedIcon: '',
    setSelectedIcon: vi.fn(),
    tintColor: '',
    setTintColor: vi.fn(),
  }),
}));

vi.mock('../use-switch-metric-formatters', () => ({
  useSwitchMetricFormatters: () => ({
    formatMetricValue: vi.fn(),
    getMetricLabel: vi.fn(),
    renderMetricIcon: vi.fn(),
  }),
}));

vi.mock('../use-switch-metric-state', () => ({
  useSwitchMetricState: () => ({
    availableMetrics: [],
    handleMetricToggle: vi.fn(),
    hasMetrics: false,
    metricLimit: 0,
    selectedMetricLabels: [],
    selectedMetrics: [],
  }),
}));

vi.mock('../use-switch-reset-timer-cleanup', () => ({
  useSwitchResetTimerCleanup: vi.fn(),
}));

vi.mock('../use-switch-toggle-action', () => ({
  useSwitchToggleAction: () => vi.fn(),
}));

import { useSwitchCardController } from '../use-switch-card-controller';

describe('useSwitchCardController', () => {
  it('does not infer Home Assistant from arbitrary dotted ids', () => {
    const { result } = renderHookWithProviders(() =>
      useSwitchCardController({
        id: 'custom.metric',
        name: 'Custom Metric',
        size: 'small',
        initialState: false,
      })
    );

    expect(result.current.isOn).toBe(false);
    expect(result.current.siblingEntities).toEqual([]);
  });
});
