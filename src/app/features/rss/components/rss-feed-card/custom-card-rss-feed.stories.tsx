import type { Meta, StoryObj } from '@storybook/react';
import {
  buildCustomCard,
  CustomWidgetStoryFrame,
} from '../../../dashboard/stories/custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/RSS Feed',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Custom RSS Feed card rendered through the dashboard widget card runtime.',
      },
    },
  },
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('rss', 'large', { tintColor: '#3b82f6' }),
  },
};
