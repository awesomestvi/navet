import { Button } from '@navet/app/components/primitives/button';
import { useTheme } from '@navet/app/hooks';
import type { WeatherForecastMode, WeatherMetricId } from '@navet/app/stores/settings-store';
import { SettingsDialogStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { WeatherSettings } from './template';

function WeatherSettingsExample() {
  const launcher = useRef<HTMLButtonElement>(null);
  const { accentColor, theme } = useTheme();
  const [mode, setMode] = useState<WeatherForecastMode>('hourly');
  const [metricIds, setMetricIds] = useState<WeatherMetricId[]>([
    'precipitation',
    'humidity',
    'wind',
  ]);
  const [tintColor, setTintColor] = useState<string | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(59,130,246,0.24),rgba(30,41,59,0.26))]">
      <div className="relative flex items-start justify-center p-6">
        <Button ref={launcher} variant="secondary" onClick={() => setIsOpen(true)}>
          Open weather dialog
        </Button>
      </div>
      <WeatherSettings
        entityId="weather.home"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        returnFocusRef={launcher}
        theme={theme}
        accentColorValue={accentColor}
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
  title: 'Concepts/Composition recipes/Product compositions/Weather/Weather card configuration',
  component: WeatherSettingsExample,
  tags: ['autodocs', 'design-pending'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof WeatherSettingsExample>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const SelectableControls: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open weather dialog' }));
    const dialog = within(await within(document.body).findByRole('dialog'));
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Weekly' }));
    await expect(dialog.getByRole('checkbox', { name: 'Weekly' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Hourly' })).not.toBeChecked();
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Weekly' }));
    await expect(dialog.getByRole('checkbox', { name: 'Weekly' })).toBeChecked();
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Feels like' }));
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Gusts' }));
    await expect(dialog.getByRole('checkbox', { name: 'Pressure' })).toBeDisabled();
    await userEvent.click(dialog.getByRole('checkbox', { name: 'Precipitation' }));
    await expect(dialog.getByRole('checkbox', { name: 'Pressure' })).toBeEnabled();
    for (const name of ['Humidity', 'Wind', 'Feels like']) {
      await userEvent.click(dialog.getByRole('checkbox', { name }));
    }
    await expect(dialog.getByRole('checkbox', { name: 'Gusts' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Gusts' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Open weather dialog' })).toHaveFocus()
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Open weather dialog' }));
    const reopened = within(await within(document.body).findByRole('dialog'));
    await expect(reopened.getByRole('checkbox', { name: 'Weekly' })).toBeChecked();
    await userEvent.keyboard('{Escape}');
  },
};
export const MobileSelectableControls: Story = {
  ...SelectableControls,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
