import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/Photo Frame',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('photo', 'large', {
      photoUrls: [
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1280&q=80&auto=format&fit=crop',
      ],
      tintColor: '#22d3ee',
    }),
  },
};
