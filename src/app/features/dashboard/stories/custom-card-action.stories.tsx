import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from './custom-card-story-helpers';

const meta = {
  title: 'Custom Cards/Action',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('button', 'medium', {
      label: 'Movie Mode',
      service: 'scene.turn_on',
      entityId: 'scene.movie_mode',
      icon: 'Film',
      tintColor: '#60a5fa',
    }),
  },
};
