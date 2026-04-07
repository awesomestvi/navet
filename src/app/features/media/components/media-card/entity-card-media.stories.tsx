import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { MediaCard } from '@/app/features/media';
import nevermindAlbumArt from '@/assets/nevermind-album-art.jpg';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function MediaCardStory(args: Omit<ComponentProps<typeof MediaCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <MediaCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Media',
  component: MediaCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'medium-vertical', 'large'],
    },
  },
  args: {
    id: 'media_player.living_room_speaker',
    name: 'Living Room Speaker',
    room: 'Living Room',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    entityType: 'Speaker',
    entityPicture: nevermindAlbumArt,
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

export const Playground: Story = {};
