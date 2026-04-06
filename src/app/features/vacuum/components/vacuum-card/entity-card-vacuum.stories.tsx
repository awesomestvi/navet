import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { VacuumCard } from '@/app/features/vacuum';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function VacuumCardStory(args: Omit<ComponentProps<typeof VacuumCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <VacuumCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Vacuum',
  component: VacuumCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
  },
  args: {
    id: 'vacuum.robby',
    name: 'Robby',
    room: 'Ground Floor',
    status: 'cleaning',
    battery: 74,
    cleanedArea: '42 m2',
    cleaningTime: '38 min',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof VacuumCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
