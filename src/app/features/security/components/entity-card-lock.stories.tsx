import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { LockCard } from '@/app/features/security';
import { EntityCardStoryFrame } from '../../dashboard/stories/entity-card-story-frame';

function LockCardStory(args: ComponentProps<typeof LockCard>) {
  return (
    <EntityCardStoryFrame>
      <LockCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Lock',
  component: LockCardStory,
  tags: ['autodocs'],
  args: {
    id: 'lock.front_door',
    name: 'Front Door',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof LockCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Locked: Story = {};

export const Unlocked: Story = {
  args: {
    initialState: false,
  },
};

export const TinyLocked: Story = {
  args: {
    size: 'tiny',
    initialState: true,
  },
};
