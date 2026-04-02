import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './tag';

const meta = {
  title: 'Components/Primitives/Tag',
  component: Tag,
  tags: ['autodocs'],
  args: {
    children: 'Connected',
    tone: 'neutral',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Compact tag/badge primitive for small labels. Do not use this to replace domain-specific release or integration badges yet.',
      },
    },
  },
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Neutral: Story = {};
export const Accent: Story = { args: { tone: 'accent', children: 'Preview' } };
export const Success: Story = { args: { tone: 'success', children: 'Healthy' } };
export const Warning: Story = { args: { tone: 'warning', children: 'Delayed' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Offline' } };
