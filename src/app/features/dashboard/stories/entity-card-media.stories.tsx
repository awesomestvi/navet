import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { MediaCard } from '@/app/features/media';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function MediaCardStory(args: Omit<ComponentProps<typeof MediaCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <MediaCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Media',
  component: MediaCardStory,
  tags: ['autodocs'],
  args: {
    id: 'media_player.living_room_tv',
    name: 'Living Room TV',
    room: 'Living Room',
    title: 'Aerial',
    artist: 'Navet Studio',
    entityType: 'TV',
    state: 'playing',
    volume: 42,
    isMuted: false,
    elapsedSeconds: 86,
    durationSeconds: 243,
    positionUpdatedAt: new Date().toISOString(),
    supportsGrouping: true,
    groupMembers: ['Kitchen Speaker'],
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof MediaCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playing: Story = {};

export const Paused: Story = {
  args: {
    state: 'paused',
  },
};

export const OffSmall: Story = {
  args: {
    state: 'off',
    size: 'small',
  },
};
