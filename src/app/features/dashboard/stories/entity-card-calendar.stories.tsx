import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { CalendarCard } from '@/app/features/calendar';
import { EntityCardStoryFrame } from './entity-card-story-frame';

function CalendarCardStory(args: Omit<ComponentProps<typeof CalendarCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <CalendarCard {...args} onSizeChange={() => undefined} />
    </EntityCardStoryFrame>
  );
}

const events = [
  {
    id: '1',
    title: 'Design review',
    startTime: '2026-04-01T10:00:00Z',
    endTime: '2026-04-01T10:45:00Z',
    timeDisplay: '10:00',
    type: 'meeting' as const,
    color: '#60a5fa',
  },
  {
    id: '2',
    title: 'Call with installer',
    startTime: '2026-04-01T13:00:00Z',
    endTime: '2026-04-01T13:30:00Z',
    timeDisplay: '13:00',
    type: 'call' as const,
    color: '#34d399',
  },
];

const meta = {
  title: 'Custom Cards/Calendar',
  component: CalendarCardStory,
  tags: ['autodocs'],
  args: {
    id: 'calendar.family',
    name: 'Family Calendar',
    room: 'Home',
    events,
    inEditMode: false,
    size: 'medium',
  },
} satisfies Meta<typeof CalendarCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};
