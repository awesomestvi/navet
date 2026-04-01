import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { CoverCard } from '@/app/features/security';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function CoverCardStory(args: Omit<ComponentProps<typeof CoverCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <CoverCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Cover',
  component: CoverCardStory,
  tags: ['autodocs'],
  args: {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    initialPosition: 72,
    initialDeviceClass: 'blind',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof CoverCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MediumOpen: Story = {};

export const SmallClosed: Story = {
  args: {
    size: 'small',
    initialPosition: 0,
  },
};

export const LargeMostlyOpen: Story = {
  args: {
    size: 'large',
    initialPosition: 92,
    initialDeviceClass: 'curtain',
  },
};
