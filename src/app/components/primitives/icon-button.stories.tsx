import type { Meta, StoryObj } from '@storybook/react';
import { Bell, Plus } from 'lucide-react';
import { IconButton } from './icon-button';

const meta = {
  title: 'Components/Primitives/Icon Button',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    label: 'Notifications',
    icon: <Bell className="h-4 w-4" />,
    size: 'medium',
    variant: 'subtle',
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Compact icon-only button for toolbar, card-header, and dialog actions.',
      },
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Ghost: Story = {
  args: {
    label: 'Add item',
    icon: <Plus className="h-4 w-4" />,
    variant: 'ghost',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};
