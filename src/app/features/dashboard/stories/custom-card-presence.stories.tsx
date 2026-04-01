import type { Meta, StoryObj } from '@storybook/react';
import { buildCustomCard, CustomWidgetStoryFrame } from './custom-card-story-helpers';

const meta = {
  title: 'Cards/Widget/Presence',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
} satisfies Meta<typeof CustomWidgetStoryFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('presence', 'large'),
  },
};
