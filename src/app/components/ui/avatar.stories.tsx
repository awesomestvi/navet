import type { Meta, StoryObj } from '@storybook/react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FallbackInitials: Story = {
  render: () => (
    <Avatar className="size-14 border border-white/10 bg-white/5">
      <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">NV</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackIcon: Story = {
  render: () => (
    <Avatar className="size-14 border border-white/10 bg-white/5">
      <AvatarFallback className="bg-white/10 text-white">
        <User className="h-5 w-5" />
      </AvatarFallback>
    </Avatar>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Avatar className="size-14 border border-white/10 bg-white/5">
      <AvatarImage src="https://i.pravatar.cc/128?img=13" alt="User" />
      <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">NV</AvatarFallback>
    </Avatar>
  ),
};
