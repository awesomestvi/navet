import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

type QuickNoteStoryArgs = {
  size: CardSize;
};

const meta = {
  title: 'Cards/Custom/Quick Note',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'extra-large'],
    },
  },
} satisfies Meta<QuickNoteStoryArgs>;

export default meta;

type Story = StoryObj<QuickNoteStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'medium',
  },
  render: ({ size }) => (
    <CustomWidgetStoryFrame
      card={buildCustomCard('note', size, {
        note: 'Remember to close the patio blinds at sunset.',
        tintColor: '#f97316',
      })}
    />
  ),
};
