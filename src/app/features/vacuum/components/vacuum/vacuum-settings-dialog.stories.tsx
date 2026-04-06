import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import { VacuumSettingsDialog } from './vacuum-settings-dialog';

const meta = {
  title: 'Settings/Dialogs/Vacuum',
  component: VacuumSettingsDialog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    entityId: 'vacuum.roborock_s7',
    isOpen: true,
    onClose: () => {},
    onStartCleaning: () => {},
    onPauseCleaning: () => {},
    onReturnHome: () => {},
    name: 'Robo Cleaner',
    room: 'Whole Home',
    theme: 'glass',
    accentColorValue: '#22d3ee',
    currentStatus: 'cleaning',
    battery: 82,
    cleanedArea: '72 m²',
    cleaningTime: '54 min',
    cleaningMode: 'room',
    fanSpeed: 'Standard',
    fanSpeeds: ['Quiet', 'Standard', 'Max'],
    availableRooms: ['Living Room', 'Kitchen', 'Hallway', 'Bedroom'],
    availableZones: ['Dining Area', 'Entryway', 'Under Sofa'],
    tintColor: '#22d3ee',
    onTintColorChange: () => {},
  },
} satisfies Meta<typeof VacuumSettingsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [tintColor, setTintColor] = useState(args.tintColor);

    return (
      <SettingsDialogStoryFrame parentCardClassName="bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(155deg,rgba(14,165,233,0.05),transparent_60%)]">
        <VacuumSettingsDialog
          {...args}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
          surfaceGradientClassName="from-white/24 via-cyan-200/18 to-white/10"
          surfaceBorderClassName="border-white/22"
          surfaceBackdropClassName="backdrop-blur-2xl saturate-[1.18]"
          surfaceGlowClassName="from-cyan-200/18"
        />
      </SettingsDialogStoryFrame>
    );
  },
};
