import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Sparkles } from 'lucide-react';
import { EmptyState } from '@/app/components/system/primitives';

const meta = {
  title: 'Primitives/Empty State',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Full-card empty state primitive with icon, title, body, and optional action CTA. Theme-aware styling comes from shared surface tokens.',
      },
    },
  },
  args: {
    icon: Sparkles,
    title: 'No widgets yet',
    description: 'Create your first card to start building a focused dashboard for this room.',
    actionIcon: Plus,
    actionLabel: 'Add card',
  },
  argTypes: {
    onAction: { action: 'action clicked' },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutAction: Story = {
  args: {
    actionIcon: undefined,
    actionLabel: undefined,
    onAction: undefined,
  },
};
