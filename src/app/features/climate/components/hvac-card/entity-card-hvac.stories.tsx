import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { HVACCard } from '@/app/features/climate';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function HVACCardStory(args: Omit<ComponentProps<typeof HVACCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <HVACCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/HVAC',
  component: HVACCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    id: 'climate.main_floor',
    name: 'Main Floor HVAC',
    room: 'Hallway',
    initialTemp: 22,
    initialCurrentTemp: 21,
    initialMode: 'cool',
    initialAction: 'cooling',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof HVACCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
