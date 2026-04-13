import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { GroupedSensorCard } from '@/app/features/sensors';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function GroupedSensorCardStory(
  args: Omit<ComponentProps<typeof GroupedSensorCard>, 'onSizeChange'>
) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <GroupedSensorCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const sensors = [
  { id: 'sensor.temp', label: 'Temp', value: '22.4', unit: 'C', icon: 'thermometer' as const },
  { id: 'sensor.hum', label: 'Humidity', value: '47', unit: '%', icon: 'droplets' as const },
  { id: 'sensor.co2', label: 'CO2', value: '510', unit: 'ppm', icon: 'gauge' as const },
  { id: 'sensor.pm25', label: 'PM2.5', value: '8', unit: 'ug/m3', icon: 'activity' as const },
];

const meta = {
  title: 'Cards/Entity/Grouped Sensor',
  component: GroupedSensorCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
  },
  args: {
    id: 'grouped_sensors.living_room',
    name: 'Living Room Air',
    room: 'Living Room',
    sensors,
    size: 'medium',
    isEditMode: false,
    accentColor: 'teal',
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof GroupedSensorCardStory>;

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

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
