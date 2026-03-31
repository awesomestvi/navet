import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsProjectSection } from './settings-project-section';

function ProjectStory() {
  const controller = useSettingsSectionController();
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsProjectSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Settings/Project',
  component: ProjectStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Project settings tab — version info, credits, license, and terms of use.',
      },
    },
  },
} satisfies Meta<typeof ProjectStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
