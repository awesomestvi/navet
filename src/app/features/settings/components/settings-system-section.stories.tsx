import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsSystemSection } from './settings-system-section';

function SystemStory() {
  const controller = useSettingsSectionController();
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsSystemSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Settings/System',
  component: SystemStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'System settings tab — Home Assistant connection info and logout.',
      },
    },
  },
} satisfies Meta<typeof SystemStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
