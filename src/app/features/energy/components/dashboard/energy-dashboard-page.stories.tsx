import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useEffect } from 'react';
import { defaultSettings, useSettingsStore } from '@/app/stores/settings-store';
import type { ThemeMode } from '@/app/stores/theme-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { getEnergyDashboardScenario } from '../../data/mock-energy-dashboard';
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
    range: defaultScenario.dashboard.selectedRange,
    onRangeChange: () => {},
    selectedNodeId: 'home',
    onNodeSelect: () => {},
    onOpenSetup: () => {},
  },
} satisfies Meta<typeof EnergyDashboardPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function buildScenarioStory(id: string): Story {
  const scenario = getEnergyDashboardScenario(id);
  return {
    args: {
      dashboard: scenario.dashboard,
      range: scenario.dashboard.selectedRange,
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
