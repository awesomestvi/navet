import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SensorCard } from '@/app/features/sensors';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function InfoCardStory(args: Omit<ComponentProps<typeof SensorCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <SensorCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Custom/Info Card',
  component: InfoCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
    icon: {
      control: 'inline-radio',
      options: ['gauge', 'trend-up', 'trend-down'],
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
          'Read-only custom card for showing a single sensor-like metric, status, or compact diagnostic value. Use this for display-only entities and informational surfaces rather than interactive controls.',
      },
    },
  },
} satisfies Meta<typeof InfoCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
