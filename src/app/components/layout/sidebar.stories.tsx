import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '@/app/components/layout/sidebar';

const meta = {
  title: 'App Shell/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Primary app sidebar and mobile bottom navigation for section switching.',
      },
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
