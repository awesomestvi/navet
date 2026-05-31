import { Button } from '@navet/app/components/primitives/button';
import type { WeatherForecastMode, WeatherMetricId } from '@navet/app/stores/settings-store';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { WeatherSettingsDialog } from './weather-settings-dialog';

function WeatherSettingsDialogStory() {
  const [mode, setMode] = useState<WeatherForecastMode>('hourly');
  const [metricIds, setMetricIds] = useState<WeatherMetricId[]>([
    'precipitation',
    'humidity',
    'wind',
  ]);
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
        metricIds={metricIds}
        onMetricIdsChange={setMetricIds}
        availableMetricIds={[
          'precipitation',
          'humidity',
          'wind',
          'feelsLike',
          'windGust',
          'pressure',
          'uvIndex',
          'cloudCover',
        ]}
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
