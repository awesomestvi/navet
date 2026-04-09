import type { Meta, StoryObj } from '@storybook/react';
import { User } from 'lucide-react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

const storyAvatarDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2338bdf8'/%3E%3Cstop offset='100%25' stop-color='%232563eb'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='128' height='128' rx='64' fill='url(%23bg)'/%3E%3Ccircle cx='64' cy='48' r='24' fill='%23f8fafc' fill-opacity='0.96'/%3E%3Cpath d='M28 110c6-18 21-28 36-28s30 10 36 28' fill='%23f8fafc' fill-opacity='0.96'/%3E%3C/svg%3E";

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
      <AvatarImage src={storyAvatarDataUrl} alt="User" />
      <AvatarFallback className="bg-white/10 text-sm font-semibold text-white">NV</AvatarFallback>
    </Avatar>
  ),
};
