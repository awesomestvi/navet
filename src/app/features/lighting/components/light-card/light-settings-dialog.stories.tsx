import type { Meta, StoryObj } from '@storybook/react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { Button } from '@/app/components/primitives/button';
import { TEMP_OPTIONS } from '@/app/constants/light-constants';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import type { LightBrightnessPreset } from './light-card-types';
import { LightSettingsDialog } from './light-settings-dialog';

function LightSettingsDialogStory() {
  const [brightness, setBrightness] = useState(62);
  const [colorTemp, setColorTemp] = useState(3500);
  const [selectedColor, setSelectedColor] = useState<string | null>('#FFA500');
  const [customColor, setCustomColor] = useState('#f97316');
  const [selectedIcon, setSelectedIcon] = useState('Lightbulb');
  const [tintColor, setTintColor] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const presets: LightBrightnessPreset[] = [
    { key: 'bright', brightness: 100, label: 'Bright', icon: Sun },
    { key: 'dim', brightness: 50, label: 'Dim', icon: Moon },
    { key: 'night', brightness: 25, label: 'Night', icon: Sparkles },
  ];

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(249,115,22,0.28),rgba(124,45,18,0.26))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open light dialog
        </Button>
      </div>
      <LightSettingsDialog
        entityId="light.living_room_main"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        name="Living Room Main"
        isOn
        supportsColorTemperature
        supportsColorControl
        minColorTemp={2200}
        maxColorTemp={6400}
        tempOptions={TEMP_OPTIONS}
        brightnessPresets={presets}
        colorTemp={colorTemp}
        selectedColor={selectedColor}
        customColor={customColor}
        brightness={brightness}
        selectedIcon={selectedIcon}
        tintColor={tintColor}
        onTempChange={setColorTemp}
        onTempCommit={setColorTemp}
        onColorChange={setSelectedColor}
        onCustomColorChange={setCustomColor}
        onBrightnessChange={setBrightness}
        applyBrightnessPresetsToAll
        onApplyBrightnessPresetsToAllChange={() => {}}
        onBrightnessPresetValueChange={() => {}}
        onBrightnessPresetOrderChange={() => {}}
        onIconChange={setSelectedIcon}
        onTintColorChange={setTintColor}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Light',
  component: LightSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof LightSettingsDialogStory>;

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

export const Default: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const openButton = canvas.getByRole('button', { name: /open light dialog/i });

    await step('opens the dialog from the trigger', async () => {
      await userEvent.click(openButton);
    });

    // Dialog content is portaled under `document.body`; `#storybook-root` is aria-hidden while open.
    const dialog = await within(document.body).findByRole('dialog');
    const dialogScope = within(dialog);
    const brightnessSlider = dialogScope.getByRole('slider', { name: /brightness/i });

    await step('starts with the expected brightness value', async () => {
      await expect(brightnessSlider).toHaveAttribute('aria-valuenow', '62');
      await expect(dialogScope.getByText('62%')).toBeInTheDocument();
    });

    await step('updates brightness with keyboard interaction', async () => {
      brightnessSlider.focus();
      await userEvent.keyboard('{ArrowRight}');
      await expect(brightnessSlider).toHaveAttribute('aria-valuenow', '63');
      await expect(dialogScope.getByText('63%')).toBeInTheDocument();
    });
  },
};
