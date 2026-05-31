import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useProviderDevice: vi.fn(() => null),
  useProviderEntityModel: vi.fn(() => null),
  useProviderEntitySnapshot: vi.fn(() => undefined),
  useProviderEntitySnapshots: vi.fn(() => null),
  useProviderEntityRegistryEntries: vi.fn(() => []),
  useServiceActionHandler: () => vi.fn(async (action: () => Promise<void>) => action()),
  useTheme: () => ({
    accentColor: 'blue',
    colors: {
      vacuum: {
        docked: {
          border: 'border-slate-700',
          glow: 'from-slate-700/30',
          gradient: 'from-slate-800 to-slate-900',
        },
        cleaning: {
          border: 'border-green-700',
          glow: 'from-green-700/30',
          gradient: 'from-green-800 to-green-900',
        },
        charging: {
          border: 'border-blue-700',
          glow: 'from-blue-700/30',
          gradient: 'from-blue-800 to-blue-900',
        },
        'charging-complete': {
          border: 'border-cyan-700',
          glow: 'from-cyan-700/30',
          gradient: 'from-cyan-800 to-cyan-900',
        },
        warning: {
          border: 'border-amber-700',
          glow: 'from-amber-700/30',
          gradient: 'from-amber-800 to-amber-900',
        },
        returning: {
          border: 'border-purple-700',
          glow: 'from-purple-700/30',
          gradient: 'from-purple-800 to-purple-900',
        },
        paused: {
          border: 'border-amber-700',
          glow: 'from-amber-700/30',
          gradient: 'from-amber-800 to-amber-900',
        },
        error: {
          border: 'border-red-700',
          glow: 'from-red-700/30',
          gradient: 'from-red-800 to-red-900',
        },
      },
    },
    theme: 'dark',
  }),
}));

vi.mock('@navet/app/stores/settings-store', async () => {
  const actual = await vi.importActual<typeof import('@navet/app/stores/settings-store')>(
    '@navet/app/stores/settings-store'
  );

  return {
    ...actual,
    useSettingsStore: vi.fn(() => true),
  };
});

vi.mock('../vacuum/use-vacuum-control', () => ({
  useVacuumControl: () => ({
    currentStatus: 'idle',
    isDialogOpen: false,
    setIsDialogOpen: vi.fn(),
    handleStartCleaning: vi.fn(),
    handlePause: vi.fn(),
    handleReturnHome: vi.fn(),
  }),
}));

vi.mock('../vacuum/vacuum-metrics', () => ({
  resolveVacuumGlanceMetrics: () => ({
    battery: 72,
    nextCleaning: null,
    waterLevel: null,
    binLevel: null,
  }),
}));

vi.mock('../vacuum/vacuum-controls-small', () => ({
  VacuumControlsSmall: () => <div>small-controls</div>,
}));

vi.mock('../vacuum/vacuum-controls-medium', () => ({
  VacuumControlsMedium: () => <div>medium-controls</div>,
}));

vi.mock('../vacuum/vacuum-settings-dialog', () => ({
  VacuumSettingsDialog: () => null,
}));

import { VacuumCard } from '..';

describe('VacuumCard', () => {
  it('does not infer Home Assistant from arbitrary dotted ids', () => {
    render(
      <VacuumCard
        id="custom.metric"
        name="Robot"
        status="idle"
        battery={72}
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByText('Robot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'vacuum.action.startCleaning' })).toBeInTheDocument();
  });
});
