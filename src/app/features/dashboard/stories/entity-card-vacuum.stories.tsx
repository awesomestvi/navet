import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { VacuumCard } from '@/app/features/vacuum';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function VacuumCardStory(args: Omit<ComponentProps<typeof VacuumCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <VacuumCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Entity Cards/Vacuum',
  component: VacuumCardStory,
  tags: ['autodocs'],
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

export const Cleaning: Story = {};

export const DockedSmall: Story = {
  args: {
    status: 'docked',
    size: 'small',
    battery: 100,
    cleanedArea: '0 m2',
    cleaningTime: '0 min',
  },
};

export const ReturningLarge: Story = {
  args: {
    status: 'returning',
    size: 'large',
    battery: 32,
  },
};
