import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives/button';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import type { WeatherForecastMode } from '@/app/stores/settings-store';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { WeatherSettingsDialog } from './weather-settings-dialog';

function WeatherSettingsDialogStory() {
  const [mode, setMode] = useState<WeatherForecastMode>('hourly');
  const [tintColor, setTintColor] = useState<string | undefined>('#3b82f6');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(30,41,59,0.26))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open weather dialog
        </Button>
      </div>
      <WeatherSettingsDialog
        entityId="weather.home"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        theme="glass"
        title="Home Weather"
        forecastMode={mode}
        onForecastModeChange={setMode}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Weather',
  component: WeatherSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof WeatherSettingsDialogStory>;

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
