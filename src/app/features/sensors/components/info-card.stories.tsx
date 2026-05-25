import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { InfoCard } from '@/app/features/sensors';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

function InfoCardStory(args: Omit<ComponentProps<typeof InfoCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <InfoCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Info',
  component: InfoCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
    icon: {
      control: 'inline-radio',
      options: [
        'gauge',
        'trend-up',
        'trend-down',
        'thermometer',
        'droplets',
        'wind',
        'motion',
        'window',
        'alert',
      ],
    },
  },
  args: {
    id: 'sensor.air_quality',
    name: 'Air Quality',
    room: 'Bedroom',
    value: '412',
    unit: 'ppm',
    icon: 'trend-down',
    subtitle: 'CO2',
    size: 'medium',
    isEditMode: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Normal read-only entity card for Home Assistant sensor and binary_sensor values. Use this for compact numeric readings, timestamps, and passive status sensors such as motion, leak, and window state.',
      },
    },
  },
} satisfies Meta<typeof InfoCardStory>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Temperature: Story = {
  args: {
    id: 'sensor.living_room_temperature',
    name: 'Temperature',
    room: 'Living Room',
    value: '21.8',
    unit: '°C',
    icon: 'thermometer',
    subtitle: 'temperature',
    deviceClass: 'temperature',
    size: 'small',
  },
};

export const Humidity: Story = {
  args: {
    id: 'sensor.living_room_humidity',
    name: 'Humidity',
    room: 'Living Room',
    value: '48',
    unit: '%',
    icon: 'droplets',
    subtitle: 'humidity',
    deviceClass: 'humidity',
    size: 'small',
  },
};

export const AirQuality: Story = {
  args: {
    id: 'sensor.bedroom_co2',
    name: 'Air Quality',
    room: 'Bedroom',
    value: 'Excellent',
    unit: '',
    icon: 'wind',
    subtitle: 'carbon dioxide',
    deviceClass: 'carbon_dioxide',
    size: 'small',
  },
};

export const Pressure: Story = {
  args: {
    id: 'sensor.outdoor_pressure',
    name: 'Outdoor Pressure',
    room: 'Outdoor',
    value: '1009',
    unit: 'hPa',
    icon: 'gauge',
    subtitle: 'pressure',
    deviceClass: 'pressure',
    size: 'small',
  },
};

export const Timestamp: Story = {
  args: {
    id: 'sensor.sun_next_setting',
    name: 'Sun Next setting',
    room: 'Unassigned',
    value: '19:29',
    unit: '',
    icon: 'gauge',
    subtitle: 'timestamp',
    deviceClass: 'timestamp',
    size: 'small',
  },
};

export const Motion: Story = {
  args: {
    id: 'binary_sensor.hall_motion',
    name: 'Motion Sensor',
    room: 'Hallway',
    value: 'Clear',
    unit: '',
    icon: 'motion',
    subtitle: 'motion',
    deviceClass: 'motion',
    status: 'clear',
    size: 'small',
  },
};

export const WaterLeak: Story = {
  args: {
    id: 'binary_sensor.bathroom_leak',
    name: 'Water Leak',
    room: 'Bathroom',
    value: 'Clear',
    unit: '',
    icon: 'droplets',
    subtitle: 'moisture',
    deviceClass: 'moisture',
    status: 'clear',
    size: 'small',
  },
};

export const WindowSensor: Story = {
  args: {
    id: 'binary_sensor.bedroom_window',
    name: 'Window Sensor',
    room: 'Bedroom',
    value: 'Closed',
    unit: '',
    icon: 'window',
    subtitle: 'window',
    deviceClass: 'window',
    status: 'clear',
    size: 'small',
  },
};

export const Unavailable: Story = {
  args: {
    id: 'sensor.garage_temperature',
    name: 'Garage Temperature',
    room: 'Garage',
    value: 'unavailable',
    unit: '',
    icon: 'thermometer',
    subtitle: 'temperature',
    deviceClass: 'temperature',
    status: 'unavailable',
    size: 'small',
  },
};

export const WithSparkline: Story = {
  args: {
    id: 'sensor.living_room_temperature',
    name: 'Living Room Temperature',
    room: 'Living Room',
    value: '21.4',
    unit: '°C',
    icon: 'thermometer',
    subtitle: 'temperature',
    deviceClass: 'temperature',
    size: 'medium',
    sparklineData: [
      { value: 20.4, timestampMs: 1, endTimestampMs: 2, minValue: 20.1, maxValue: 20.7 },
      { value: 20.8, timestampMs: 2, endTimestampMs: 3, minValue: 20.6, maxValue: 21 },
      { value: 21.1, timestampMs: 3, endTimestampMs: 4, minValue: 20.9, maxValue: 21.3 },
      { value: 21.4, timestampMs: 4, endTimestampMs: 5, minValue: 21.2, maxValue: 21.6 },
    ],
  },
};

export const WithNoHistory: Story = {
  args: {
    id: 'sensor.garage_temperature',
    name: 'Garage Temperature',
    room: 'Garage',
    value: '21.4',
    unit: '°C',
    icon: 'thermometer',
    subtitle: 'temperature',
    deviceClass: 'temperature',
    size: 'medium',
    sparklineData: [],
  },
};

export const LongName: Story = {
  args: {
    id: 'sensor.utility_room_heat_pump_total_energy_today',
    name: 'Utility Room Heat Pump Total Energy Today',
    room: 'Utility Room',
    value: '12.4',
    unit: 'kWh',
    icon: 'zap',
    subtitle: 'energy',
    deviceClass: 'energy',
    size: 'small',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
