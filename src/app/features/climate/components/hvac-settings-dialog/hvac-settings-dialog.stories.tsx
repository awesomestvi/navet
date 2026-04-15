import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives/button';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@/app/storybook/story-frames';
import { HVACSettingsDialog } from './index';

function HVACSettingsDialogStory() {
  const [isOn] = useState(true);
  const [mode, setMode] = useState('cool');
  const [targetTemp, setTargetTemp] = useState(22);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.22),rgba(15,23,42,0.28))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open HVAC dialog
        </Button>
      </div>
      <HVACSettingsDialog
        entityId="climate.main_floor"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        name="Main Floor HVAC"
        isOn={isOn}
        mode={mode}
        targetTemp={targetTemp}
        currentTemp={24}
        temperaturePresets={[
          { label: 'Sleep', value: 18 },
          { label: 'Comfort', value: 21 },
          { label: 'Boost', value: 24 },
        ]}
        onTargetTempChange={setTargetTemp}
        onModeChange={setMode}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/HVAC',
  component: HVACSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof HVACSettingsDialogStory>;

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
