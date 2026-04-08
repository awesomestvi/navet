import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsDashboardSection } from './settings-dashboard-section';

function DashboardStory() {
  const controller = useSettingsSectionController();
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsDashboardSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Settings/Dashboard',
  component: DashboardStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Dashboard settings tab — entity visibility, onboarding restart, and YAML config backup/restore.',
      },
    },
  },
} satisfies Meta<typeof DashboardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
