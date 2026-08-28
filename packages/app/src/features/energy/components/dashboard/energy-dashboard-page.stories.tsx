import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import type {
  EnergyDashboardModel,
  EnergyHistorySource,
  EnergyOverview,
  EnergySourceDiagnostic,
} from '@navet/app/features/energy/types/energy.types';
import { buildEnergyDashboardModel } from '@navet/app/features/energy/utils/build-energy-dashboard-model';
import type {
  PlatformStatisticsHistoryRequest,
  PlatformStatisticsHistorySeries,
} from '@navet/app/platform/provider-feature-models';
import { defaultSettings, useSettingsStore } from '@navet/app/stores/settings-store';
import type { ThemeMode } from '@navet/app/stores/theme-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect } from 'react';
import { expect, within } from 'storybook/test';
import { EnergyDashboardPage } from './energy-dashboard-page';

function ThemeDecorator({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  useEffect(() => {
    const previousTheme = useThemeStore.getState();
    const previousSettings = useSettingsStore.getState();

    useThemeStore.setState({
      ...previousTheme,
      theme,
      followSystemTheme: false,
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: null,
    });

    useSettingsStore.setState({
      ...previousSettings,
      ...defaultSettings,
      effectsQuality: 'high',
      disableAnimations: false,
      lowPowerMode: false,
    });

    return () => {
      useThemeStore.setState(previousTheme);
      useSettingsStore.setState(previousSettings);
    };
  }, [theme]);

  return <>{children}</>;
}

function withTheme(theme: ThemeMode): Decorator {
  return (Story) => (
    <ThemeDecorator theme={theme}>
      <Story />
    </ThemeDecorator>
  );
}

const defaultScenario = getEnergyDashboardScenario('default');
const gridOnlyOverview: EnergyOverview = {
  liveStats: [
    { label: 'Home Load', value: '0.4 kW' },
    { label: 'Grid', value: '0.4 kW import' },
  ],
  flow: [
    { id: 'grid', label: 'Grid Import', value: 0.39, direction: 'source', tone: 'grid' },
    { id: 'home', label: 'Home Load', value: 0.39, direction: 'sink', tone: 'load' },
  ],
  trend: [
    { label: '12:00', value: 390 },
    { label: '12:05', value: 434 },
    { label: '12:10', value: 410 },
  ],
  topConsumers: [
    {
      id: 'sensor.bathroom_floor_energy_usage',
      name: 'Bathroom Power',
      category: 'floor_heating',
      powerEntityId: 'sensor.bathroom_floor_power',
      powerW: 0,
      energyKWh: 3.3,
      shareOfLoad: 0,
      costToday: 0,
      status: 'idle',
    },
    {
      id: 'sensor.toilet_energy_usage',
      name: 'Toilet Power',
      category: 'toilet_heater',
      powerEntityId: 'sensor.toilet_power',
      powerW: 0,
      energyKWh: 0,
      shareOfLoad: 0,
      costToday: 0,
      status: 'idle',
    },
  ],
  insights: [],
  totals: {
    currentLoadW: 434,
    solarW: 0,
    batteryPercent: 0,
    batteryPowerW: 0,
    importW: 434,
    exportW: 0,
    importTodayKWh: 21.7,
    exportTodayKWh: 0,
    solarTodayKWh: 0,
    gasTodayKWh: 0,
    hotWaterTodayKWh: 0,
    costToday: 0,
    projectedMonthCost: 0,
  },
  nodes: [],
};
const gridOnlyDashboard = buildEnergyDashboardModel({
  overview: gridOnlyOverview,
  range: 'today',
  trend: gridOnlyOverview.trend,
  periodTotals: { today: 21.7, week: 0, month: 0 },
  sourceConfig: {
    gridImportEnergyEntityId: 'sensor.develco_zhemi101_summation_delivered',
    gridImportPowerEntityId: 'sensor.develco_zhemi101_instantaneous_demand',
    homeLoadPowerEntityId: 'sensor.develco_zhemi101_instantaneous_demand',
    devices: [
      {
        entityId: 'sensor.bathroom_floor_energy_usage',
        name: 'Bathroom Energy Usage',
        category: 'floor_heating',
        powerEntityId: 'sensor.bathroom_floor_power',
      },
      {
        entityId: 'sensor.toilet_energy_usage',
        name: 'Toilet Energy Usage',
        category: 'toilet_heater',
        powerEntityId: 'sensor.toilet_power',
      },
    ],
  },
});
const gridOnlyDiagnostics: EnergySourceDiagnostic[] = [
  {
    id: 'grid-import',
    label: 'Grid import',
    entityId: 'sensor.develco_zhemi101_summation_delivered',
    liveEntityId: 'sensor.develco_zhemi101_instantaneous_demand',
    status: 'configured_numeric',
    currentPowerW: 434,
    todayKWh: 21.7,
  },
  {
    id: 'device:bathroom',
    label: 'Bathroom Power',
    entityId: 'sensor.bathroom_floor_energy_usage',
    liveEntityId: 'sensor.bathroom_floor_power',
    status: 'configured_numeric',
    currentPowerW: 0,
    todayKWh: 3.3,
  },
  {
    id: 'device:toilet',
    label: 'Toilet Power',
    entityId: 'sensor.toilet_energy_usage',
    liveEntityId: 'sensor.toilet_power',
    status: 'configured_idle',
    currentPowerW: 0,
    todayKWh: 0,
  },
  {
    id: 'device:gym-heater',
    label: 'Gym Heater',
    entityId: 'sensor.ikea_of_sweden_inspelning_smart_plug_summation_delivered',
    liveEntityId: 'sensor.ikea_of_sweden_inspelning_smart_plug_power',
    status: 'configured_unavailable',
  },
];

async function loadStoryEnergyHistory(
  request: PlatformStatisticsHistoryRequest
): Promise<PlatformStatisticsHistorySeries> {
  const startMs = Date.parse(request.startTime);
  const endMs = request.endTime ? Date.parse(request.endTime) : Date.now();
  const bucketMs =
    request.period === 'hour'
      ? 60 * 60 * 1000
      : request.period === 'day'
        ? 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  const bucketCount = Math.max(1, Math.min(31, Math.ceil((endMs - startMs) / bucketMs)));
  return Object.fromEntries(
    request.entityIds.map((entityId, entityIndex) => [
      entityId,
      Array.from({ length: bucketCount }, (_, index) => {
        const pointStart = startMs + index * bucketMs;
        const baseMean = storyHistoryBaseMean(entityId, entityIndex);
        const mean = Math.max(
          0,
          baseMean +
            Math.sin(index * 1.2) * baseMean * 0.32 +
            (bucketCount > 1 && index === Math.floor(bucketCount * 0.65) ? baseMean * 0.8 : 0)
        );
        return {
          startMs: pointStart,
          endMs: Math.min(endMs, pointStart + bucketMs),
          mean,
          min: mean * 0.42,
          max: mean * 1.68,
        };
      }),
    ])
  );
}

function storyHistoryBaseMean(entityId: string, entityIndex: number): number {
  if (entityId === homeHistorySource.entityId) return 920;
  if (entityId === gridHistorySource.entityId) return 640;
  if (entityId === solarHistorySource.entityId) return 520;

  const consumerMeans: Record<string, number> = {
    'sensor.hvac_power': 260,
    'sensor.water_heater_power': 150,
    'sensor.ev_power': 115,
    'sensor.kitchen_power': 80,
    'sensor.floor_heating_power': 65,
    'sensor.laundry_power': 45,
  };
  return consumerMeans[entityId] ?? 35 + entityIndex * 12;
}

const homeHistorySource: EnergyHistorySource = {
  id: 'home',
  label: 'Home use',
  entityId: 'sensor.whole_home_power',
  color: '#f97316',
  valueKind: 'power',
};

const gridHistorySource: EnergyHistorySource = {
  id: 'grid',
  label: 'Grid import',
  entityId: 'sensor.grid_import_power',
  color: '#60a5fa',
  valueKind: 'power',
};

const solarHistorySource: EnergyHistorySource = {
  id: 'solar',
  label: 'Solar production',
  entityId: 'sensor.solar_power',
  color: '#facc15',
  valueKind: 'power',
};

function getStoryHistorySources(dashboard: EnergyDashboardModel): EnergyHistorySource[] {
  const sources = [homeHistorySource];
  if (dashboard.dataCoverage.hasGridImport || dashboard.dataCoverage.hasGridExport) {
    sources.push(gridHistorySource);
  }
  if (dashboard.dataCoverage.hasSolar) sources.push(solarHistorySource);
  return sources;
}

const meta = {
  title: 'Pages/Energy/Dashboard/Page',
  component: EnergyDashboardPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    viewport: {
      defaultViewport: 'desktop1080p',
    },
  },
  args: {
    dashboard: defaultScenario.dashboard,
    sourceDiagnostics: [],
    energyCustomCards: [],
    energyOrderedCardIds: [],
    currentLoadStatisticId: 'sensor.whole_home_power',
    historyStatisticsLoader: loadStoryEnergyHistory,
    historySources: getStoryHistorySources(defaultScenario.dashboard),
  },
} satisfies Meta<typeof EnergyDashboardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function buildScenarioStory(id: string): Story {
  const scenario = getEnergyDashboardScenario(id);
  return {
    args: {
      dashboard: scenario.dashboard,
      sourceDiagnostics: getMockEnergySourceDiagnostics(scenario.dashboard),
      historySources: getStoryHistorySources(scenario.dashboard),
    },
  };
}

export const Default: Story = {
  ...buildScenarioStory('normal-household'),
  name: 'Normal household',
  parameters: {
    docs: {
      description: {
        story: 'A grid-powered home with ordinary household loads and no solar, battery, or EV.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByRole('navigation', { name: 'Energy' });
    await expect(within(summary).queryByText('Grid import')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('energy-usage-metric-grid')).toHaveTextContent('Grid import');
    await expect(within(summary).queryByText('Solar')).not.toBeInTheDocument();
    await expect(within(summary).queryByText('Battery')).not.toBeInTheDocument();
    await expect(canvas.queryByText('EV charger')).not.toBeInTheDocument();
  },
};

export const SolarAndBatteryHousehold: Story = {
  ...buildScenarioStory('solar-battery-household'),
  name: 'Solar + battery',
  parameters: {
    docs: {
      description: {
        story: 'The normal household loads with active solar production and home battery storage.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByRole('navigation', { name: 'Energy' });
    await expect(within(summary).queryByText('Solar')).not.toBeInTheDocument();
    await expect(within(summary).queryByText('Battery')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('energy-usage-metric-grid')).toHaveTextContent('Grid import');
    await expect(canvas.getByTestId('energy-usage-metric-solar')).toHaveTextContent(
      'Solar production'
    );
    await expect(canvas.getByTestId('energy-usage-metric-battery')).toHaveTextContent('Battery');
    await expect(canvas.queryByText('EV charger')).not.toBeInTheDocument();
  },
};

export const SolarBatteryAndEvHousehold: Story = {
  ...buildScenarioStory('solar-battery-ev-household'),
  name: 'Solar + battery + EV',
  parameters: {
    docs: {
      description: {
        story: 'The equipped household while a 7.2 kW garage EV charger is actively drawing power.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = canvas.getByRole('navigation', { name: 'Energy' });
    await expect(within(summary).queryByText('Solar')).not.toBeInTheDocument();
    await expect(within(summary).queryByText('Battery')).not.toBeInTheDocument();
    await expect(canvas.getByTestId('energy-usage-metric-grid')).toHaveTextContent('Grid import');
    await expect(canvas.getByTestId('energy-usage-metric-solar')).toHaveTextContent(
      'Solar production'
    );
    await expect(canvas.getByTestId('energy-usage-metric-battery')).toHaveTextContent('Battery');
    await expect(canvas.getAllByText('EV charger')[0]).toBeInTheDocument();
  },
};
export const LiveRange: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'now',
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
};
export const WeekRange: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'week',
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
};
export const WeekRangeSelectedPeriod: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'week',
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const chart = await canvas.findByRole('slider', { name: 'Energy usage by period' });
    chart.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(canvas.getByRole('heading', { name: 'Selected day' })).toBeInTheDocument();
    await expect(canvas.getByTestId('energy-selected-period-details')).toHaveTextContent(
      'What used the most'
    );
    await expect(canvas.getByRole('button', { name: 'Back to chart' })).toBeInTheDocument();
    await expect(
      canvas.queryByRole('slider', { name: 'Energy usage by period' })
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId('energy-usage-metric-energy')).toHaveTextContent('Week total');
  },
};
export const WeekRangeSelectedUntrackedOnly: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'week',
      topConsumers: [],
      dataCoverage: {
        ...defaultScenario.dashboard.dataCoverage,
        hasTrackedDevices: false,
      },
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);
    const chart = await canvas.findByRole('slider', { name: 'Energy usage by period' });
    chart.focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect(canvas.getByRole('heading', { name: 'Selected day' })).toBeInTheDocument();
    await expect(canvas.getByTestId('energy-selected-period-details')).toHaveTextContent(
      '1 contributor'
    );
    await expect(canvas.getByTestId('energy-selected-period-details')).toHaveTextContent(
      'Untracked'
    );
    await expect(canvas.queryByRole('img', { name: /identified/ })).not.toBeInTheDocument();
  },
};
export const MonthRange: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'month',
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
};
export const SparseMonthRange: Story = {
  args: {
    dashboard: {
      ...defaultScenario.dashboard,
      selectedRange: 'month',
      ranges: {
        ...defaultScenario.dashboard.ranges,
        month: {
          ...defaultScenario.dashboard.ranges.month,
          liveConsumption: defaultScenario.dashboard.ranges.month.liveConsumption.slice(-11),
        },
      },
    },
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
  },
};
export const SolarProducing: Story = buildScenarioStory('solar-producing');
export const GridImporting: Story = buildScenarioStory('grid-importing');
export const BatteryCharging: Story = buildScenarioStory('battery-charging');
export const BatteryDischarging: Story = buildScenarioStory('battery-discharging');
export const ExportingToGrid: Story = buildScenarioStory('exporting-grid');
export const NoSolarInactive: Story = buildScenarioStory('inactive');

export const GridOnlyCurrentHaData: Story = {
  args: {
    dashboard: gridOnlyDashboard,
    sourceDiagnostics: gridOnlyDiagnostics,
  },
};

export const SourceNeedsAttention: Story = {
  ...buildScenarioStory('grid-importing'),
  args: {
    ...buildScenarioStory('grid-importing').args,
    sourceDiagnostics: [
      ...getMockEnergySourceDiagnostics(getEnergyDashboardScenario('grid-importing').dashboard),
      {
        id: 'device:gym-heater',
        label: 'Gym heater',
        entityId: 'sensor.gym_heater_energy',
        liveEntityId: 'sensor.gym_heater_power',
        status: 'configured_unavailable',
      },
    ],
  },
};

export const EnergyCardsEmptyState: Story = {
  ...buildScenarioStory('default'),
  args: {
    dashboard: defaultScenario.dashboard,
    sourceDiagnostics: getMockEnergySourceDiagnostics(defaultScenario.dashboard),
    energyCustomCards: [],
    energyOrderedCardIds: [],
    isEditMode: true,
  },
};

export const LiquidGlassTheme: Story = {
  ...buildScenarioStory('default'),
  decorators: [withTheme('glass')],
  globals: {
    backgrounds: {
      value: 'canvas-glass',
    },
  },
};

export const WallTablet: Story = {
  ...buildScenarioStory('solar-producing'),
  globals: {
    viewport: {
      value: 'tabletLandscape',
      isRotated: false,
    },
  },
};

export const WallTabletPortrait: Story = {
  ...buildScenarioStory('normal-household'),
  name: 'Wall tablet portrait',

  parameters: {
    docs: {
      description: {
        story:
          'Portrait composition: Live Energy uses a compact split card, metrics share one row, and Energy usage receives the full dashboard width.',
      },
    },
  },

  globals: {
    viewport: {
      value: 'ipadMini',
      isRotated: false,
    },
  },
};

export const Phone: Story = {
  ...buildScenarioStory('grid-importing'),
  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
};

export const LightTheme: Story = {
  ...buildScenarioStory('default'),
  decorators: [withTheme('light')],
  globals: {
    backgrounds: {
      value: 'canvas-light',
    },
  },
};

export const BlackTheme: Story = {
  ...buildScenarioStory('default'),
  decorators: [withTheme('black')],
  globals: {
    backgrounds: {
      value: 'canvas-black',
    },
  },
};
