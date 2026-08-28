import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { useSettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsHabitsSection } from './settings-habits-section';

function HabitsStory() {
  const controller = useSettingsSectionController();

  return (
    <div className="h-full min-w-0 overflow-x-hidden overflow-y-auto px-3 py-3 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <SettingsHabitsSection controller={controller} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Pages/Settings/Habits',
  component: HabitsStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Local habits settings grouped into learning, privacy and data, and diagnostics.',
      },
    },
  },
} satisfies Meta<typeof HabitsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-settings-detail-group]')).toHaveLength(3);
    await expect(canvasElement).toHaveTextContent('Stores up to 3000 events');
  },
};
