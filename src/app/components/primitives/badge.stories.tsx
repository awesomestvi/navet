import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Badge } from './badge';

const meta = {
  title: 'Components/Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: {
    children: 'Configured',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Small metadata badge for setup state, progress summaries, and compact supporting labels.',
      },
    },
  },
} satisfies Meta<typeof Badge>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Accent: Story = { args: { tone: 'accent', children: 'Strong' } };
export const Success: Story = { args: { tone: 'success', children: 'Connected' } };
export const Warning: Story = { args: { tone: 'warning', children: 'Review' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Needs setup' } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
