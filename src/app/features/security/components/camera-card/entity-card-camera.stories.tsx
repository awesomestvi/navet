import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { CameraCard } from '@/app/features/security';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function CameraCardStory(args: Omit<ComponentProps<typeof CameraCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <CameraCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Camera',
  component: CameraCardStory,
  tags: ['autodocs'],
  args: {
    id: 'camera.front_door',
    name: 'Front Door Cam',
    room: 'Entrance',
    entityPicture:
      'https://images.unsplash.com/photo-1558002038-1055907df827?w=1280&q=80&auto=format&fit=crop',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof CameraCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};
