import type { Meta, StoryObj } from '@storybook/react';
import { DashboardOnboardingDialog } from './index';

const meta = {
  title: 'Dashboard/Onboarding Dialog',
  component: DashboardOnboardingDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    open: true,
    onChooseAll: () => {},
    onChooseBlank: () => {},
    onImportConfig: async () => {},
    phase: 'idle' as const,
  },
} satisfies Meta<typeof DashboardOnboardingDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Closing: Story = {
  args: {
    phase: 'closing',
  },
};
