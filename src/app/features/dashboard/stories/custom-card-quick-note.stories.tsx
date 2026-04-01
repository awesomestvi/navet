import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from './custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/Quick Note',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('note', 'medium', {
      note: 'Remember to close the patio blinds at sunset.',
      tintColor: '#f97316',
    }),
  },
};
