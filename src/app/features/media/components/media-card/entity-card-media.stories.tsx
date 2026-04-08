import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { expect } from 'storybook/test';
import { MediaCard } from '@/app/features/media';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
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
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof MediaCardStory>;

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

export const Playground: Story = {
  args: {
    size: 'small',
  },
  play: async ({ canvas, userEvent, step }) => {
    await step('opens the media details dialog', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /open details/i }));
      await expect(canvas.getByRole('dialog')).toBeInTheDocument();
      await expect(canvas.getByText(/smells like teen spirit/i)).toBeInTheDocument();
      await expect(canvas.getByText(/nirvana/i)).toBeInTheDocument();
    });
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
