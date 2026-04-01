import type { Meta, StoryObj } from '@storybook/react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { useState } from 'react';
import { TEMP_OPTIONS } from '@/app/constants/light-constants';
import type { LightBrightnessPreset } from './light-card-types';
import { LightSettingsDialog } from './light-settings-dialog';

function LightSettingsDialogStory() {
  const [brightness, setBrightness] = useState(62);
  const [colorTemp, setColorTemp] = useState(3500);
  const [selectedColor, setSelectedColor] = useState<string | null>('#FFA500');
  const [customColor, setCustomColor] = useState('#f97316');
  const [selectedIcon, setSelectedIcon] = useState('Lightbulb');

  const presets: LightBrightnessPreset[] = [
    { key: 'bright', brightness: 100, label: 'Bright', icon: Sun },
    { key: 'dim', brightness: 50, label: 'Dim', icon: Moon },
    { key: 'night', brightness: 25, label: 'Night', icon: Sparkles },
  ];

  return (
    <LightSettingsDialog
      entityId="light.living_room_main"
      isOpen
      onOpenChange={() => {}}
      name="Living Room Main"
      room="Living Room"
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
    />
  );
}

const meta = {
  title: 'Settings/Dialogs/Light',
  component: LightSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LightSettingsDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
