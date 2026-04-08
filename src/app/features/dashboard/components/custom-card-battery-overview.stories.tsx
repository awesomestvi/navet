import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

const meta = {
  title: 'Cards/Custom/Battery Overview',
  component: CustomWidgetStoryFrame,
  tags: ['autodocs'],
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CustomWidgetStoryFrame>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    card: buildCustomCard('battery', 'large'),
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
