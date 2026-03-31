import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SceneCard } from '@/app/features/scenes';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function SceneCardStory(args: Omit<ComponentProps<typeof SceneCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <SceneCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Entity Cards/Scene',
  component: SceneCardStory,
  tags: ['autodocs'],
  args: {
    id: 'scene.movie_mode',
    name: 'Movie Mode',
    room: 'Living Room',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof SceneCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Tiny: Story = {
  args: {
    size: 'tiny',
  },
};
