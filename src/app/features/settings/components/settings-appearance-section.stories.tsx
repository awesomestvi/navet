import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsAppearanceSection } from './settings-appearance-section';

function AppearanceStory() {
  const controller = useSettingsSectionController();
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsAppearanceSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Settings/Appearance',
  component: AppearanceStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Appearance settings tab — theme, accent color, effects quality, page zoom, ambience, and wallpaper.',
      },
    },
  },
} satisfies Meta<typeof AppearanceStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
