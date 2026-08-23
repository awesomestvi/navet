import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { integrationStore } from '@navet/app/stores/integration-store';
import { type ThemeMode, useThemeStore } from '@navet/app/stores/theme-store';
import type { DeviceWithType } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import type { Meta, StoryObj } from '@storybook/react';
import { type ComponentProps, type ReactNode, useEffect } from 'react';
import { ClimateDashboard } from './climate-dashboard';

const comfortableDevices: DeviceWithType[] = [
  {
    id: 'climate.living_room',
    type: 'climate',
    name: 'Living room climate',
    room: 'Living room',
    size: 'medium',
    temperature: 21,
    currentTemperature: 21.4,
    temperatureUnit: 'celsius',
    mode: 'heat',
    action: 'idle',
    providerId: 'home_assistant',
  },
  {
    id: 'fan.bedroom',
    type: 'fans',
    name: 'Bedroom fan',
    room: 'Bedroom',
    size: 'small',
    state: true,
    percentage: 42,
    providerId: 'home_assistant',
  },
  {
    id: 'sensor.living_temperature',
    type: 'sensors',
    name: 'Living room temperature',
    room: 'Living room',
    size: 'small',
    value: '21.4',
    unit: '°C',
    deviceClass: 'temperature',
    status: 'measurement',
    providerId: 'home_assistant',
  },
  {
    id: 'sensor.bedroom_humidity',
    type: 'sensors',
    name: 'Bedroom humidity',
    room: 'Bedroom',
    size: 'small',
    value: '46',
    unit: '%',
    deviceClass: 'humidity',
    status: 'measurement',
    providerId: 'home_assistant',
  },
  {
    id: 'sensor.office_co2',
    type: 'sensors',
    name: 'Office CO2',
    room: 'Office',
    size: 'small',
    value: '720',
    unit: 'ppm',
    deviceClass: 'carbon_dioxide',
    status: 'measurement',
    providerId: 'home_assistant',
  },
];

const sections: ComponentProps<typeof ClimateDashboard>['sections'] = [
  { key: 'climate', titleKey: 'sections.climate.title', orderedIds: ['climate.living_room'] },
  { key: 'fans', titleKey: 'sections.climate.fans.title', orderedIds: ['fan.bedroom'] },
  {
    key: 'temperature',
    titleKey: 'sections.climate.temperature.title',
    orderedIds: ['sensor.living_temperature'],
  },
  {
    key: 'humidity',
    titleKey: 'sections.climate.humidity.title',
    orderedIds: ['sensor.bedroom_humidity'],
  },
  {
    key: 'airQuality',
    titleKey: 'sections.climate.airQuality.title',
    orderedIds: ['sensor.office_co2'],
  },
];

const entityTypeByDeviceType: Record<DeviceWithType['type'], NavetEntity['type']> = {
  calendars: 'calendar',
  cameras: 'camera',
  climate: 'climate',
  covers: 'cover',
  fans: 'fan',
  'grouped-sensors': 'grouped_sensor',
  helpers: 'helper',
  hvac: 'hvac',
  lights: 'light',
  locks: 'lock',
  media: 'media_player',
  persons: 'person',
  scenes: 'scene',
  sensors: 'sensor',
  switches: 'switch',
  vacuums: 'vacuum',
  weather: 'weather',
};

function toEntity(device: DeviceWithType): NavetEntity {
  return {
    id: device.id,
    canonicalId: `home_assistant:${device.id}`,
    externalId: device.id,
    providerId: 'home_assistant',
    type: entityTypeByDeviceType[device.type],
    name: device.name,
    room: 'room' in device ? device.room : undefined,
    primaryState:
      device.type === 'climate' || device.type === 'hvac'
        ? device.mode
        : 'state' in device
          ? device.state
          : 'value' in device
            ? device.value
            : 'unknown',
    availability:
      device.type === 'sensors' && device.availability === 'unavailable'
        ? 'unavailable'
        : 'available',
    attributes: {},
    capabilities: [],
  };
}

function createDeviceMap(
  transform: (device: DeviceWithType) => DeviceWithType = (device) => device
) {
  return new Map(comfortableDevices.map((device) => [device.id, transform(device)] as const));
}

function ClimateFixture({
  devices,
  theme,
  children,
}: {
  devices: DeviceWithType[];
  theme: ThemeMode;
  children: ReactNode;
}) {
  const surface = getThemeSurfaceTokens(theme);

  useEffect(() => {
    const previousIntegration = integrationStore.getState();
    const previousTheme = useThemeStore.getState();
    integrationStore.setState({
      ...previousIntegration,
      providerEntitiesByCanonicalId: Object.fromEntries(
        devices.map((device) => {
          const entity = toEntity(device);
          return [entity.canonicalId, entity];
        })
      ),
    });
    useThemeStore.setState({ ...previousTheme, theme, followSystemTheme: false, wallpaper: null });
    return () => {
      integrationStore.setState(previousIntegration);
      useThemeStore.setState(previousTheme);
    };
  }, [devices, theme]);

  return <div className={`min-h-screen p-3 md:p-6 ${surface.appBg}`}>{children}</div>;
}

function ClimateDashboardStory(
  props: ComponentProps<typeof ClimateDashboard> & { theme: ThemeMode }
) {
  const { theme, ...dashboardProps } = props;
  return (
    <ClimateFixture devices={[...dashboardProps.deviceMap.values()]} theme={theme}>
      <ClimateDashboard {...dashboardProps} />
    </ClimateFixture>
  );
}

const meta = {
  title: 'Pages/Climate/Whole home',
  component: ClimateDashboardStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', viewport: { defaultViewport: 'desktop1080p' } },
  args: {
    deviceMap: createDeviceMap(),
    sections,
    temperatureUnit: 'celsius',
    cardSizes: {},
    updateCardSize: () => {},
    isEditMode: false,
    onRemoveEntity: () => {},
    densePerformanceMode: false,
    optimizeOffscreenPaint: false,
    theme: 'glass',
  },
} satisfies Meta<typeof ClimateDashboardStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {};

export const NeedsAttention: Story = {
  args: {
    deviceMap: createDeviceMap((device) =>
      device.id === 'climate.living_room' && device.type === 'climate'
        ? { ...device, currentTemperature: 17, temperature: 21, mode: 'off' }
        : device
    ),
  },
};

export const CriticalAirQuality: Story = {
  args: {
    deviceMap: createDeviceMap((device) =>
      device.id === 'sensor.office_co2' && device.type === 'sensors'
        ? { ...device, value: 'Poor', securitySeverity: 'critical' }
        : device
    ),
  },
};

export const UnavailableSensor: Story = {
  args: {
    deviceMap: createDeviceMap((device) =>
      device.id === 'sensor.bedroom_humidity' && device.type === 'sensors'
        ? { ...device, status: 'unavailable', availability: 'unavailable' }
        : device
    ),
  },
};

export const WallTablet: Story = {
  parameters: { viewport: { defaultViewport: 'tabletLandscape' } },
};

export const Phone: Story = {
  parameters: { viewport: { defaultViewport: 'iphone14' } },
};

export const LightTheme: Story = { args: { theme: 'light' } };
export const BlackTheme: Story = { args: { theme: 'black' } };
