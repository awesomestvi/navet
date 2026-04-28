import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useEffect } from 'react';
import { I18nProvider } from '@/app/i18n';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import type { ThemeMode } from '@/app/stores/theme-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { EnergySetupWizard } from '.';

function StoryProviders({ theme, children }: { theme: ThemeMode; children: ReactNode }) {
  useEffect(() => {
    const previousTheme = useThemeStore.getState();
    const previousHaState = homeAssistantStore.getState();

    useThemeStore.setState({
      ...previousTheme,
      theme,
      followSystemTheme: false,
      primaryColor: 'orange',
      customPrimaryColor: null,
      wallpaper: null,
    });

    homeAssistantStore.setState({
      ...previousHaState,
      connected: true,
      entities: {
        'sensor.home_load_power': {
          entity_id: 'sensor.home_load_power',
          state: '1860',
          attributes: {
            friendly_name: 'Home Load Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-1', parent_id: null, user_id: null },
        },
        'sensor.grid_import_power': {
          entity_id: 'sensor.grid_import_power',
          state: '920',
          attributes: {
            friendly_name: 'Grid Import Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-2', parent_id: null, user_id: null },
        },
        'sensor.energy_today': {
          entity_id: 'sensor.energy_today',
          state: '12.4',
          attributes: {
            friendly_name: 'Total Consumed Today',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-3', parent_id: null, user_id: null },
        },
        'sensor.solar_power': {
          entity_id: 'sensor.solar_power',
          state: '1460',
          attributes: {
            friendly_name: 'Solar Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-4', parent_id: null, user_id: null },
        },
        'sensor.solar_energy_today': {
          entity_id: 'sensor.solar_energy_today',
          state: '8.2',
          attributes: {
            friendly_name: 'Solar Energy Today',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-5', parent_id: null, user_id: null },
        },
        'sensor.battery_level': {
          entity_id: 'sensor.battery_level',
          state: '74',
          attributes: {
            friendly_name: 'Battery Level',
            device_class: 'battery',
            unit_of_measurement: '%',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-6', parent_id: null, user_id: null },
        },
        'sensor.battery_power': {
          entity_id: 'sensor.battery_power',
          state: '-540',
          attributes: {
            friendly_name: 'Battery Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-7', parent_id: null, user_id: null },
        },
        'sensor.dishwasher_energy': {
          entity_id: 'sensor.dishwasher_energy',
          state: '1.6',
          attributes: {
            friendly_name: 'Dishwasher Energy',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-8', parent_id: null, user_id: null },
        },
        'sensor.dishwasher_power': {
          entity_id: 'sensor.dishwasher_power',
          state: '420',
          attributes: {
            friendly_name: 'Dishwasher Power',
            device_class: 'power',
            unit_of_measurement: 'W',
          },
          last_changed: '2026-04-29T10:00:00+00:00',
          last_updated: '2026-04-29T10:00:00+00:00',
          context: { id: 'story-9', parent_id: null, user_id: null },
        },
      },
    });

    return () => {
      useThemeStore.setState(previousTheme);
      homeAssistantStore.setState(previousHaState);
    };
  }, [theme]);

  return <I18nProvider>{children}</I18nProvider>;
}

function withTheme(theme: ThemeMode): Decorator {
  return (Story) => (
    <StoryProviders theme={theme}>
      <Story />
    </StoryProviders>
  );
}

const meta = {
  title: 'Pages/Energy/Setup Wizard',
  component: EnergySetupWizard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    viewport: { defaultViewport: 'desktop1080p' },
  },
  args: {
    onSave: () => {},
    onCancel: () => {},
  },
  decorators: [withTheme('dark')],
} satisfies Meta<typeof EnergySetupWizard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithConfiguredSources: Story = {
  args: {
    initialConfig: {
      homeLoadPowerEntityId: 'sensor.home_load_power',
      gridImportPowerEntityId: 'sensor.grid_import_power',
      gridImportEnergyEntityId: 'sensor.energy_today',
      solarPowerEntityId: 'sensor.solar_power',
      solarEnergyEntityId: 'sensor.solar_energy_today',
      batterySocEntityId: 'sensor.battery_level',
      batteryPowerEntityId: 'sensor.battery_power',
      devices: [
        {
          entityId: 'sensor.dishwasher_energy',
          name: 'Dishwasher Energy',
          category: 'dishwasher',
          powerEntityId: 'sensor.dishwasher_power',
        },
      ],
    },
  },
};

export const LightTheme: Story = {
  decorators: [withTheme('light')],
};

export const BlackTheme: Story = {
  decorators: [withTheme('black')],
  parameters: {
    backgrounds: { default: 'canvas-black' },
  },
};

export const LiquidGlassTheme: Story = {
  decorators: [withTheme('glass')],
  parameters: {
    backgrounds: { default: 'canvas-glass' },
  },
};
