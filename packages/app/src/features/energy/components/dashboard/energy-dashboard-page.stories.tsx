import {
  getEnergyDashboardScenario,
  getMockEnergySourceDiagnostics,
} from '@navet/app/features/energy/data/mock-energy-dashboard';
import type {
  EnergyOverview,
  EnergySourceDiagnostic,
} from '@navet/app/features/energy/types/energy.types';
import { buildEnergyDashboardModel } from '@navet/app/features/energy/utils/build-energy-dashboard-model';
import { defaultSettings, useSettingsStore } from '@navet/app/stores/settings-store';
import type { ThemeMode } from '@navet/app/stores/theme-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useEffect } from 'react';
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
    },
  };
}

export const Default: Story = buildScenarioStory('default');
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

export const LiquidGlassTheme: Story = {
  ...buildScenarioStory('default'),
  decorators: [withTheme('glass')],
  parameters: {
    backgrounds: { default: 'canvas-glass' },
  },
};

export const BlackTheme: Story = {
  ...buildScenarioStory('default'),
  decorators: [withTheme('black')],
  parameters: {
    backgrounds: { default: 'canvas-black' },
  },
};
