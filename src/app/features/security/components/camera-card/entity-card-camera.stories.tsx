import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { CameraCard } from '@/app/features/security';
import cameraSampleImage from '@/assets/camera-sample.webp';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function CameraCardStory(args: Omit<ComponentProps<typeof CameraCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <CameraCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Camera',
  component: CameraCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['medium', 'large', 'extra-large'],
    },
  },
  args: {
    id: 'camera.front_door',
    name: 'Front Door Cam',
    room: 'Entrance',
    entityPicture: cameraSampleImage,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof CameraCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
