import type { Meta, StoryObj } from '@storybook/react';
import type { HassEntity } from 'home-assistant-js-websocket';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives/button';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { CameraSettingsDialog, type SiblingEntity } from './camera-settings-dialog';

const siblingEntities: SiblingEntity[] = [
  {
    id: 'switch.camera_motion_detection',
    entity: {
      state: 'on',
      attributes: { friendly_name: 'Motion Detection' },
    } as unknown as HassEntity,
  },
  {
    id: 'select.camera_ir_mode',
    entity: {
      state: 'auto',
      attributes: { friendly_name: 'IR Mode', options: ['off', 'auto', 'on'] },
    } as unknown as HassEntity,
  },
  {
    id: 'number.camera_brightness',
    entity: {
      state: '55',
      attributes: { friendly_name: 'Image Brightness', min: 0, max: 100, step: 1 },
    } as unknown as HassEntity,
  },
];

function CameraSettingsDialogStory(
  args: Omit<ComponentProps<typeof CameraSettingsDialog>, 'isOpen' | 'onOpenChange'>
) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.2),rgba(15,23,42,0.28))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open camera dialog
        </Button>
      </div>
      <CameraSettingsDialog {...args} isOpen={isOpen} onOpenChange={setIsOpen} />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Camera',
  component: CameraSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
  args: {
    entityId: 'camera.front_door',
    name: 'Front Door Camera',
    siblingEntities,
  },
} satisfies Meta<typeof CameraSettingsDialogStory>;

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

export const Default: Story = {};
