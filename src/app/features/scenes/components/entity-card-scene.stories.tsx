import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { SceneCard } from '@/app/features/scenes';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function SceneCardStory(args: Omit<ComponentProps<typeof SceneCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <SceneCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Scene',
  component: SceneCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'extra-small', 'small', 'medium'],
    },
  },
  args: {
    id: 'scene.movie_mode',
    name: 'Movie Mode',
    room: 'Living Room',
    size: 'small',
    isEditMode: false,
  },
} satisfies Meta<typeof SceneCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
