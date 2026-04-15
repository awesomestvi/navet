import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { CameraCard } from '@/app/features/security';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';
import cameraSampleImage from '@/assets/camera-sample.webp';

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
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CameraCardStory>;

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

export const Playground: Story = {};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'extra-large',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
