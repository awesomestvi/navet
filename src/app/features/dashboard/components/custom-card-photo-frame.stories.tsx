import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

type PhotoStoryArgs = {
  size: CardSize;
  shuffleEnabled: boolean;
};

const meta = {
  title: 'Cards/Custom/Photo',
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'extra-large'],
    },
    shuffleEnabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<PhotoStoryArgs>;

export default meta;

type Story = StoryObj<PhotoStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
    shuffleEnabled: true,
  },
  render: ({ size, shuffleEnabled }) => (
    <CustomWidgetStoryFrame
      card={buildCustomCard('photo', size, {
        photoUrls: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1280&q=80&auto=format&fit=crop',
        ],
        shuffleEnabled,
        tintColor: '#22d3ee',
      })}
    />
  ),
};
