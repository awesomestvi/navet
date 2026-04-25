import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { BodyText } from './body-text';

const meta = {
  title: 'Components/Primitives/Body Text',
  component: BodyText,
  tags: ['autodocs'],
  args: {
    children: 'Compact supporting copy for cards, dialogs, and settings rows.',
    tone: 'default',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Shared body-text primitive for compact supporting copy with theme-aware tone handling.',
      },
    },
  },
} satisfies Meta<typeof BodyText>;

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

export const Default: Story = {};
export const Muted: Story = { args: { tone: 'muted' } };
export const Subtle: Story = { args: { tone: 'subtle' } };
export const Danger: Story = {
  args: { tone: 'danger', children: 'Connection failed. Check your Home Assistant URL.' },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
