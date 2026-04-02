import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './text';

const meta = {
  title: 'Components/Primitives/Text',
  component: Text,
  tags: ['autodocs'],
  args: {
    children: 'Primary supporting copy for dialogs, forms, and dense card metadata.',
    tone: 'default',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Minimal body-text primitive for future cleanup of repeated helper and supporting copy.',
      },
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Muted: Story = { args: { tone: 'muted' } };
export const Subtle: Story = { args: { tone: 'subtle' } };
export const Danger: Story = {
  args: { tone: 'danger', children: 'Connection failed. Check your Home Assistant URL.' },
};
