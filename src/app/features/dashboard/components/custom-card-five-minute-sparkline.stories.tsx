import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/Five Minute Sparkline',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('sparkline', 'medium'),
  },
};
