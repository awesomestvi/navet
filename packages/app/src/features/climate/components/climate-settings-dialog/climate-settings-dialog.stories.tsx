import { Button } from '@navet/app/components/primitives/button';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ClimateSettingsDialog } from './index';

function ClimateSettingsDialogStory() {
  const [isOn] = useState(true);
  const [mode, setMode] = useState('cool');
  const [targetTemp, setTargetTemp] = useState(22);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.22),rgba(15,23,42,0.28))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open Climate dialog
        </Button>
      </div>
      <ClimateSettingsDialog
        entityId="climate.main_floor"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        name="Main Floor Climate"
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
  title: 'Cards/Dialogs/Climate',
  component: ClimateSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof ClimateSettingsDialogStory>;

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
