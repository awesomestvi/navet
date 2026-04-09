import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

type QuickNoteStoryArgs = {
  size: Extract<CardSize, 'small' | 'medium' | 'large'>;
};

function QuickNoteStoryPreview({ size }: QuickNoteStoryArgs) {
  return (
    <CustomWidgetStoryFrame
      card={buildCustomCard('note', size, {
        note: 'Remember to close the patio blinds at sunset.',
        tintColor: '#f97316',
      })}
    />
  );
}

const meta = {
  title: 'Cards/Custom/Quick Note',
  component: QuickNoteStoryPreview,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<QuickNoteStoryArgs>;

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

type Story = StoryObj<QuickNoteStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'medium',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};
