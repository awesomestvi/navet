import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SensorCard } from '@/app/features/sensors';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function SensorCardStory(args: Omit<ComponentProps<typeof SensorCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <SensorCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Sensor',
  component: SensorCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
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
} satisfies Meta<typeof SensorCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
