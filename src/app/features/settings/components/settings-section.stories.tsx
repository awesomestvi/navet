import type { Meta, StoryObj } from '@storybook/react';
import { SettingsSection } from '@/app/features/settings';

const meta = {
  title: 'Pages/Settings/Section Shell',
  component: SettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full settings section including appearance, localization, interaction, dashboard, system, and project tabs.',
      },
    },
  },
} satisfies Meta<typeof SettingsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
