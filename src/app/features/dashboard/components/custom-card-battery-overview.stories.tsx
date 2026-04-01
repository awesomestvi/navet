import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/Battery Overview',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('battery', 'large'),
  },
};
