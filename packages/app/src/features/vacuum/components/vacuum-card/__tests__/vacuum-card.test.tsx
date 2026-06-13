import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveVacuumGlanceMetricsMock,
  useProviderEntityModelMock,
  useProviderEntitySnapshotMock,
  handleSetFanSpeedMock,
  useSettingsStoreMock,
} = vi.hoisted(() => ({
  resolveVacuumGlanceMetricsMock: vi.fn<() => Record<string, unknown>>(() => ({
    battery: 72,
    cleanedArea: '42 m²',
    cleaningTime: '38 min',
    nextCleaning: null,
    lastCleaned: undefined,
    waterLevel: null,
    binLevel: null,
  })),
  useProviderEntityModelMock: vi.fn<() => unknown>(() => null),
  useProviderEntitySnapshotMock: vi.fn<() => unknown>(() => undefined),
  handleSetFanSpeedMock: vi.fn(),
  useSettingsStoreMock: vi.fn((selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      use24HourTime: true,
      disableAnimations: false,
      lowPowerMode: false,
      effectsQuality: 'high',
    })
  ),
}));

let mockedDisplayFanSpeed: string | undefined;
let mockedCurrentStatus: string | undefined;

vi.mock('@navet/app/hooks', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useProviderDevice: vi.fn(() => null),
  useProviderEntityModel: useProviderEntityModelMock,
  useProviderEntitySnapshot: useProviderEntitySnapshotMock,
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
    useSettingsStore: useSettingsStoreMock,
  };
});

vi.mock('../../vacuum/use-vacuum-control', () => ({
  useVacuumControl: (options: { initialStatus: string }) => ({
    currentStatus: mockedCurrentStatus ?? options.initialStatus,
    isDialogOpen: false,
    setIsDialogOpen: vi.fn(),
    handleStartCleaning: vi.fn(),
    handleStartAreaCleaning: vi.fn(),
    handlePause: vi.fn(),
    handleStop: vi.fn(),
    handleReturnHome: vi.fn(),
    handleLocate: vi.fn(),
    handleCleanSpot: vi.fn(),
    handleSetFanSpeed: handleSetFanSpeedMock,
    isUpdatingFanSpeed: false,
    displayFanSpeed: mockedDisplayFanSpeed,
  }),
}));

vi.mock('../../vacuum/vacuum-metrics', () => ({
  resolveVacuumGlanceMetrics: resolveVacuumGlanceMetricsMock,
}));

vi.mock('../../vacuum/vacuum-controls-small', () => ({
  VacuumControlsSmall: (props: {
    disabled?: boolean;
    capabilities: {
      canCycleFanSpeed?: boolean;
      currentFanSpeed?: string;
      fanSpeedOptions?: string[];
    };
    onCycleFanSpeed: (speed: string) => void;
  }) => (
    <div>
      {props.disabled ? 'small-controls-disabled' : 'small-controls'}
      {props.capabilities.canCycleFanSpeed ? (
        <button
          type="button"
          onClick={() => props.onCycleFanSpeed(props.capabilities.fanSpeedOptions?.[1] ?? 'turbo')}
        >
          fan-speed-control:{props.capabilities.currentFanSpeed}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../../vacuum/vacuum-controls-medium', () => ({
  VacuumControlsMedium: (props: {
    disabled?: boolean;
    capabilities: {
      canCycleFanSpeed?: boolean;
      currentFanSpeed?: string;
      fanSpeedOptions?: string[];
    };
    onCycleFanSpeed: (speed: string) => void;
  }) => (
    <div>
      {props.disabled ? 'medium-controls-disabled' : 'medium-controls'}
      {props.capabilities.canCycleFanSpeed ? (
        <button
          type="button"
          onClick={() => props.onCycleFanSpeed(props.capabilities.fanSpeedOptions?.[1] ?? 'turbo')}
        >
          fan-speed-control:{props.capabilities.currentFanSpeed}
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../../vacuum/vacuum-settings-dialog', () => ({
  VacuumSettingsDialog: () => null,
}));

import { VacuumCard } from '..';

describe('VacuumCard', () => {
  beforeEach(() => {
    resolveVacuumGlanceMetricsMock.mockClear();
    useProviderEntityModelMock.mockReset();
    useProviderEntitySnapshotMock.mockReset();
    handleSetFanSpeedMock.mockReset();
    mockedDisplayFanSpeed = undefined;
    mockedCurrentStatus = undefined;
  });

  it('renders a fan-speed control only when the vacuum supports multiple fan speeds', () => {
    mockedDisplayFanSpeed = 'quiet';
    useProviderEntityModelMock.mockReturnValueOnce({
      id: 'home_assistant:vacuum.roborock',
      canonicalId: 'home_assistant:vacuum.roborock',
      providerId: 'home_assistant',
      externalId: 'vacuum.roborock',
      type: 'vacuum',
      name: 'Robot',
      primaryState: 'idle',
      availability: 'available',
      capabilities: [],
      attributes: {
        supportedFeatures: 32 | 8192,
        fanSpeed: 'quiet',
        fanSpeedList: ['quiet', 'turbo'],
      },
    });

    render(
      <VacuumCard
        id="vacuum.roborock"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByText('fan-speed-control:quiet')).toBeInTheDocument();
  });

  it('hides the fan-speed control when the vacuum does not support multiple speeds', () => {
    useProviderEntityModelMock.mockReturnValueOnce({
      id: 'home_assistant:vacuum.basic',
      canonicalId: 'home_assistant:vacuum.basic',
      providerId: 'home_assistant',
      externalId: 'vacuum.basic',
      type: 'vacuum',
      name: 'Robot',
      primaryState: 'idle',
      availability: 'available',
      capabilities: [],
      attributes: {
        supportedFeatures: 8192,
      },
    });

    render(
      <VacuumCard
        id="vacuum.basic"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.queryByText(/fan-speed-control:/)).not.toBeInTheDocument();
  });

  it('cycles to the next available fan speed from the compact control', () => {
    mockedDisplayFanSpeed = 'quiet';
    useProviderEntityModelMock.mockReturnValueOnce({
      id: 'home_assistant:vacuum.roborock',
      canonicalId: 'home_assistant:vacuum.roborock',
      providerId: 'home_assistant',
      externalId: 'vacuum.roborock',
      type: 'vacuum',
      name: 'Robot',
      primaryState: 'idle',
      availability: 'available',
      capabilities: [],
      attributes: {
        supportedFeatures: 32 | 8192,
        fanSpeed: 'quiet',
        fanSpeedList: ['quiet', 'turbo'],
      },
    });

    render(
      <VacuumCard
        id="vacuum.roborock"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    fireEvent.click(screen.getByText('fan-speed-control:quiet'));

    expect(handleSetFanSpeedMock).toHaveBeenCalledWith('turbo');
  });

  it('renders the localized vacuum state as the primary body content without placeholder facts', () => {
    resolveVacuumGlanceMetricsMock.mockReturnValueOnce({
      battery: undefined,
      cleanedArea: undefined,
      cleaningTime: undefined,
      nextCleaning: null,
      lastCleaned: undefined,
      waterLevel: null,
      binLevel: null,
    });

    render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getAllByText('vacuum.status.idle').length).toBeGreaterThan(0);
    expect(screen.queryByText(/vacuum\.metric\.area /)).not.toBeInTheDocument();
    expect(screen.queryByText(/vacuum\.settings\.battery /)).not.toBeInTheDocument();
    expect(screen.queryByText(/vacuum\.metric\.runTime /)).not.toBeInTheDocument();
  });

  it('shows the live cleaning state when the status attribute is stale', () => {
    useProviderEntitySnapshotMock.mockReturnValueOnce({
      state: 'cleaning',
      attributes: {
        status: 'idle',
      },
    });

    render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getAllByText('vacuum.status.cleaning').length).toBeGreaterThan(0);
  });

  it('shows the current room in the primary text while cleaning', () => {
    useProviderEntitySnapshotMock.mockReturnValueOnce({
      state: 'cleaning',
      attributes: {
        current_room: 'Bathroom',
      },
    });

    render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        room="Hallway"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getAllByText('vacuum.status.cleaning bathroom').length).toBeGreaterThan(0);
  });

  it('keeps the generic cleaning label when no current room is available', () => {
    useProviderEntitySnapshotMock.mockReturnValueOnce({
      state: 'cleaning',
      attributes: {},
    });

    render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        room="Hallway"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getAllByText('vacuum.status.cleaning').length).toBeGreaterThan(0);
    expect(screen.queryByText('vacuum.status.cleaning hallway')).not.toBeInTheDocument();
  });

  it('renders explicit zero area and runtime values in the summary', () => {
    resolveVacuumGlanceMetricsMock.mockReturnValueOnce({
      battery: undefined,
      cleanedArea: '0 m²',
      cleaningTime: '0 min',
      nextCleaning: null,
      lastCleaned: undefined,
      waterLevel: null,
      binLevel: null,
    });

    const { container } = render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(container.querySelector('[title="vacuum.metric.area 0 m²"]')).toBeInTheDocument();
    expect(container.querySelector('[title="vacuum.metric.runTime 0 min"]')).toBeInTheDocument();
  });

  it('wraps small-card secondary facts instead of truncating them when several are present', () => {
    mockedDisplayFanSpeed = 'turbo';
    resolveVacuumGlanceMetricsMock.mockReturnValueOnce({
      battery: 72,
      cleanedArea: '42 m²',
      cleaningTime: '38 min',
      nextCleaning: null,
      lastCleaned: 'Today 09:14',
      waterLevel: null,
      binLevel: null,
    });

    const { container } = render(
      <VacuumCard
        id="vacuum.small-summary"
        name="Robot"
        room="Kitchen"
        status="idle"
        size="small"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const factsRow = container.querySelector('[title="vacuum.metric.area 42 m²"]')?.parentElement
      ?.parentElement;
    expect(factsRow?.className).toContain('flex-wrap');
    expect(factsRow?.className).toContain('whitespace-normal');

    const factValue = container
      .querySelector('[title="vacuum.metric.area 42 m²"]')
      ?.querySelector('.whitespace-normal');
    expect(factValue?.className).toContain('whitespace-normal');
    expect(factValue?.className).not.toContain('truncate');
  });

  it('renders room, battery, runtime, fan speed, and last cleaned facts in stable order', () => {
    mockedDisplayFanSpeed = 'turbo';
    resolveVacuumGlanceMetricsMock.mockReturnValueOnce({
      battery: 72,
      cleanedArea: '42 m²',
      cleaningTime: '38 min',
      nextCleaning: null,
      lastCleaned: 'Today 09:14',
      waterLevel: null,
      binLevel: null,
    });

    const { container } = render(
      <VacuumCard
        id="vacuum.partial"
        name="Robot"
        room="Kitchen"
        status="idle"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(container.querySelector('[title="vacuum.metric.area 42 m²"]')).toBeInTheDocument();
    expect(container.querySelector('[title="vacuum.settings.battery 72%"]')).toBeInTheDocument();
    expect(container.querySelector('[title="vacuum.metric.runTime 38 min"]')).toBeInTheDocument();
    expect(container.querySelector('[title="vacuum.summary.speed Turbo"]')).toBeInTheDocument();
    expect(
      container.querySelector('[title="vacuum.detail.lastCleaned Today 09:14"]')
    ).toBeInTheDocument();
  });

  it('renders unavailable state with disabled controls', () => {
    render(
      <VacuumCard
        id="vacuum.offline"
        name="Robot"
        status="idle"
        availability="unavailable"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getAllByText('vacuum.status.unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText('medium-controls-disabled')).toBeInTheDocument();
  });

  it('tones down the vacuum illustration surface while idle', () => {
    render(
      <VacuumCard
        id="vacuum.resting"
        name="Robot"
        status="idle"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const style = screen.getByTestId('vacuum-robot-surface').getAttribute('style') ?? '';
    expect(style).toContain('border-color: rgb(161, 161, 170)');
    expect(style).toContain('rgba(255, 255, 255, 0.06)');
    expect(style).toContain('rgba(24, 24, 27, 0.96)');
    expect(style).toContain('0 18px 38px -28px');
  });

  it('tones down the vacuum illustration surface while docked', () => {
    useProviderEntitySnapshotMock.mockReturnValueOnce({
      state: 'docked',
      attributes: {},
    });
    resolveVacuumGlanceMetricsMock.mockReturnValueOnce({
      battery: undefined,
      cleanedArea: '42 m²',
      cleaningTime: '38 min',
      nextCleaning: null,
      lastCleaned: undefined,
      waterLevel: null,
      binLevel: null,
    });

    render(
      <VacuumCard
        id="vacuum.docked"
        name="Robot"
        status="docked"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    const style = screen.getByTestId('vacuum-robot-surface').getAttribute('style') ?? '';
    expect(style).toContain('border-color: rgb(161, 161, 170)');
    expect(style).toContain('rgba(255, 255, 255, 0.06)');
    expect(style).toContain('rgba(24, 24, 27, 0.96)');
    expect(style).toContain('0 18px 38px -28px');
  });

  it('shows the side brush only while the vacuum is cleaning', () => {
    mockedCurrentStatus = 'cleaning';
    const { rerender } = render(
      <VacuumCard
        id="vacuum.cleaning"
        name="Robot"
        status="cleaning"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.getByTestId('vacuum-side-brush')).toBeInTheDocument();

    mockedCurrentStatus = 'idle';
    rerender(
      <VacuumCard
        id="vacuum.cleaning"
        name="Robot"
        status="idle"
        size="medium"
        onSizeChange={vi.fn()}
        isEditMode={false}
      />
    );

    expect(screen.queryByTestId('vacuum-side-brush')).not.toBeInTheDocument();
  });

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
    expect(screen.getByText('small-controls')).toBeInTheDocument();
  });
});
