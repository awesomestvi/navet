import type { Meta, StoryObj } from '@storybook/react';
import { UserDropdown } from './user-dropdown';

const meta = {
  title: 'App Shell/User Dropdown',
  component: UserDropdown,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    avatarUrl: null,
  },
} satisfies Meta<typeof UserDropdown>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAvatar: Story = {
  args: {
    avatarUrl: 'https://i.pravatar.cc/96?img=47',
  },
};
