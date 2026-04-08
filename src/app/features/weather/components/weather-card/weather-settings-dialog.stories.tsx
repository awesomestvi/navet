import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import type { WeatherForecastMode } from '@/app/stores/settings-store';
import { WeatherSettingsDialog } from './weather-settings-dialog';

function WeatherSettingsDialogStory() {
  const [mode, setMode] = useState<WeatherForecastMode>('hourly');
  const [tintColor, setTintColor] = useState<string | undefined>('#3b82f6');

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(30,41,59,0.26))]">
      <WeatherSettingsDialog
        entityId="weather.home"
        isOpen
        onOpenChange={() => {}}
        theme="glass"
        title="Home Weather"
        location="Stockholm"
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
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WeatherSettingsDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
