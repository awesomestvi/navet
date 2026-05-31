import cameraSampleImage from '@navet/app/assets/camera-sample.webp';
import { CameraCard } from '@navet/app/features/security';
import { type CameraViewMode, useSettingsStore } from '@navet/app/stores/settings-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useEffect } from 'react';

type CameraCardStoryArgs = Omit<ComponentProps<typeof CameraCard>, 'onSizeChange'> & {
  cameraViewMode?: CameraViewMode;
};

function CameraCardStory({ cameraViewMode = 'snapshot', ...args }: CameraCardStoryArgs) {
  useEffect(() => {
    useSettingsStore.getState().updateCameraViewMode(args.id, cameraViewMode);
  }, [args.id, cameraViewMode]);

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
    supportedFeatures: 2,
    isStreamCapable: true,
    cameraViewMode: 'snapshot',
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

export const LiveStream: Story = {
  args: {
    entityPicture: '/api/camera_proxy/camera.front_door',
    cameraViewMode: 'live',
    isStreamCapable: true,
  },
};

export const AutoSnapshot: Story = {
  args: {
    entityPicture: '/api/camera_proxy/camera.front_door',
    cameraViewMode: 'auto',
    isStreamCapable: true,
  },
};

export const SnapshotOnly: Story = {
  args: {
    id: 'camera.l10s_ultra_gen_2_map',
    name: 'L10s Ultra Gen 2 Current Map',
    room: 'Utility',
    supportedFeatures: 0,
    isStreamCapable: false,
    cameraViewMode: 'snapshot',
  },
};

export const StreamFallback: Story = {
  args: {
    id: 'camera.garage',
    name: 'Garage Cam',
    room: 'Garage',
    entityPicture: '/api/camera_proxy/camera.garage',
    cameraViewMode: 'live',
    isStreamCapable: false,
  },
};

export const Unavailable: Story = {
  args: {
    id: 'camera.garden',
    name: 'Garden Cam',
    room: 'Garden',
    entityPicture: undefined,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
