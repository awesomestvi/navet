import type { Meta, StoryObj } from '@storybook/react';
import { InteractivePill } from '@/app/components/system/primitives';

const meta = {
  title: 'Foundation/Primitives/Interactive Pill',
  component: InteractivePill,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared pill primitive used for compact navigation and inline actions. Compare intent and active state handling across themes in this story.',
      },
    },
  },
  args: {
    children: 'English',
    active: false,
    intent: 'navigation',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof InteractivePill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const SelectionRow: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <InteractivePill {...args}>English</InteractivePill>
      <InteractivePill {...args}>Svenska</InteractivePill>
      <InteractivePill {...args} active>
        Deutsch
      </InteractivePill>
      <InteractivePill {...args}>Français</InteractivePill>
      <InteractivePill {...args}>Español</InteractivePill>
    </div>
  ),
};

export const MixedIntents: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <InteractivePill {...args} intent="navigation">
        Home
      </InteractivePill>
      <InteractivePill {...args} active intent="navigation">
        Settings
      </InteractivePill>
      <InteractivePill {...args} intent="action">
        Back
      </InteractivePill>
      <InteractivePill {...args} active intent="action">
        Next
      </InteractivePill>
    </div>
  ),
};
