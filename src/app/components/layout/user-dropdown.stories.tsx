import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps, ReactNode } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { UserDropdown } from './user-dropdown';

function UserDropdownPreview({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[28rem] items-start justify-end p-8">{children}</div>;
}

function UserDropdownStory(props: ComponentProps<typeof UserDropdown>) {
  return (
    <UserDropdownPreview>
      <UserDropdown {...props} />
    </UserDropdownPreview>
  );
}

const meta = {
  title: 'App Shell/Header/User Dropdown',
  component: UserDropdownStory,
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: {} } },
  args: {
    avatarUrl: null,
  },
} satisfies Meta<typeof UserDropdownStory>;

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

export const Mobile: Story = {
  args: {
    variant: 'mobile',
  },
};
