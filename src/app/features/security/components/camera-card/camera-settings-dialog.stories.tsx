import type { Meta, StoryObj } from '@storybook/react';
import type { HassEntity } from 'home-assistant-js-websocket';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
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

const meta = {
  title: 'Settings/Dialogs/Camera',
  component: CameraSettingsDialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    entityId: 'camera.front_door',
    name: 'Front Door Camera',
    room: 'Entrance',
    isOpen: true,
    onOpenChange: () => {},
    siblingEntities,
  },
} satisfies Meta<typeof CameraSettingsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.2),rgba(15,23,42,0.28))]">
      <CameraSettingsDialog {...args} />
    </SettingsDialogStoryFrame>
  ),
};
