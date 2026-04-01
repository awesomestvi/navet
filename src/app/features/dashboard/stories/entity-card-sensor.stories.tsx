import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SensorCard } from '@/app/features/sensors';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function SensorCardStory(args: Omit<ComponentProps<typeof SensorCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <SensorCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Sensor',
  component: SensorCardStory,
  tags: ['autodocs'],
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
} satisfies Meta<typeof SensorCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const SmallGauge: Story = {
  args: {
    size: 'small',
    icon: 'gauge',
    value: '23.1',
    unit: 'C',
    subtitle: 'Temperature',
  },
};

export const LargeRising: Story = {
  args: {
    size: 'large',
    icon: 'trend-up',
    value: '89',
    unit: '%',
    subtitle: 'Humidity',
  },
};
