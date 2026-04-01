import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { HVACSettingsDialog } from './index';

function HVACSettingsDialogStory() {
  const [isOn, setIsOn] = useState(true);
  const [mode, setMode] = useState('cool');

  return (
    <HVACSettingsDialog
      entityId="climate.main_floor"
      isOpen
      onOpenChange={() => {}}
      name="Main Floor HVAC"
      room="Living Room"
      isOn={isOn}
      mode={mode}
      targetTemp={22}
      currentTemp={24}
      onModeChange={setMode}
      onTogglePower={() => setIsOn((current) => !current)}
    />
  );
}

const meta = {
  title: 'Settings/Dialogs/HVAC',
  component: HVACSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HVACSettingsDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
