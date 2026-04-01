import type { Meta, StoryObj } from '@storybook/react';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsInteractionSection } from './settings-interaction-section';

function InteractionStory() {
  const controller = useSettingsSectionController();
  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsInteractionSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Settings/Sections/Interaction',
  component: InteractionStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interaction settings tab — control interaction mode (toggle-first vs control-first) with live preview.',
      },
    },
  },
} satisfies Meta<typeof InteractionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
