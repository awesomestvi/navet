import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '@/app/features/settings/hooks/use-settings-section-controller';
import { ThemeAppearancePicker } from './theme-appearance-picker';

function ThemeAppearancePickerStory() {
  const {
    colorOptions,
    customPrimaryColor,
    followSystemTheme,
    manualTheme,
    primaryColor,
    setCustomPrimaryColor,
    setFollowSystemTheme,
    setPrimaryColor,
    setTheme,
    theme,
    themeOptions,
  } = useSettingsSectionController();

  return (
    <div className="flex justify-center p-8">
      <div className="w-full max-w-xl">
        <ThemeAppearancePicker
          colorOptions={colorOptions}
          customAccent={customPrimaryColor}
          selectedAccent={primaryColor}
          selectedTheme={manualTheme}
          effectiveTheme={theme}
          themeOptions={themeOptions}
          onAccentChange={setPrimaryColor}
          onCustomAccentChange={setCustomPrimaryColor}
          onThemeChange={setTheme}
          followSystemTheme={followSystemTheme}
          onFollowSystemThemeChange={setFollowSystemTheme}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Theme/Appearance Picker',
  component: ThemeAppearancePickerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Unified appearance picker for Navet theme and accent selection.',
          '',
          'What this story documents:',
          '- The shared picker used by Settings for system/manual appearance mode, manual theme selection, and accent color selection.',
          '- The lighter pill-based selection model now aligned with the onboarding theme step, instead of the older card-heavy theme picker treatment.',
          '- The shared accent swatch row, including the custom color input path.',
          '',
          'How the UI is structured:',
          '- `Follow system appearance` uses compact pills for `Auto` and manual mode, followed by a single short state summary line.',
          '- `Theme mode` uses theme pills instead of stacked option cards, with the selected theme description shown underneath as a lightweight explanation row.',
          '- `Accent color` stays as a compact swatch row so theme and accent controls feel visually related.',
          '',
          'Usage notes:',
          '- In Settings, this picker can expose both system-follow and manual theme controls.',
          '- In onboarding, the same visual direction is used, but the flow is simplified to the step-specific controls.',
          '- The `black` theme is the canonical fourth Navet theme alongside glass, dark, and light.',
          '',
          'Review expectations:',
          '- Verify idle pill borders remain visible in light mode.',
          '- Verify selected pills feel clearly active without overpowering the section.',
          '- Verify the selected theme description stays concise and does not create a second dense header block.',
          '- Verify accent swatches and custom color selection still read cleanly across glass, dark, light, and black themes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ThemeAppearancePickerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
