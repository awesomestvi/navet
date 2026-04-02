import type { Meta, StoryObj } from '@storybook/react';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const meta = {
  title: 'Components/Primitives/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Base avatar primitive for user/profile identity surfaces.',
          '',
          'What this base story covers:',
          '- Initials fallback, icon fallback, and image rendering path.',
          '- Fallback resilience when image URLs are unavailable or slow.',
          '',
          'Usage notes:',
          '- Provide meaningful `alt` text when avatar images are present.',
          '- Keep fallback content concise (initials or simple icon) for tight header layouts.',
          '',
          'Review expectations:',
          '- Verify fallback remains legible and centered at target sizes.',
          '- Verify image-to-fallback transition does not create layout shift.',
        ].join('\n'),
      },
    },
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
