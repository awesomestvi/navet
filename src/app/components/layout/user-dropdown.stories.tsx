import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { UserDropdown } from './user-dropdown';

const meta = {
  title: 'App Shell/Header/User Dropdown',
  component: UserDropdown,
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: {} } },
  args: {
    avatarUrl: null,
  },
} satisfies Meta<typeof UserDropdown>;

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

export const WithAvatar: Story = {
  args: {
    avatarUrl: 'https://i.pravatar.cc/96?img=47',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
