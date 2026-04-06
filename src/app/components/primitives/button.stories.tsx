import type { Meta, StoryObj } from '@storybook/react';
import { Settings2 } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Components/Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save changes',
    variant: 'primary',
    size: 'medium',
    loading: false,
    disabled: false,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Canonical action button primitive. Use the same component for standard buttons and icon-only buttons.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button iconOnly label="Open settings" variant="subtle" size="small">
        <Settings2 className="h-4 w-4" />
      </Button>
      <Button iconOnly label="Open settings" variant="subtle" size="medium">
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  ),
};
