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
  title: 'Components/Shared/Theme Appearance Picker',
  component: ThemeAppearancePickerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Unified theme + accent-color picker. Supports system-follow mode, 4 manual themes, and a full accent palette including custom color input.',
      },
    },
  },
} satisfies Meta<typeof ThemeAppearancePickerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
