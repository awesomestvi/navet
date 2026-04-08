import type { Meta, StoryObj } from '@storybook/react';
import { Header } from '@/app/components/layout/header';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

const meta = {
  title: 'App Shell/Header/Topbar',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Topbar with greeting, date/time, search, user menu, and notification entry points.',
      },
    },
  },
} satisfies Meta<typeof Header>;

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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
