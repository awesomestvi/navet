import type { Meta, StoryObj } from '@storybook/react';
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
    onReturnHome: () => {},
    name: 'Robo Cleaner',
    room: 'Whole Home',
    theme: 'glass',
    accentColorValue: '#22d3ee',
  },
} satisfies Meta<typeof VacuumSettingsDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
