import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

type PhotoStoryArgs = {
  size: CardSize;
  shuffleEnabled: boolean;
};

function PhotoStoryPreview({ size, shuffleEnabled }: PhotoStoryArgs) {
  return (
    <CustomWidgetStoryFrame
      card={buildCustomCard('photo', size, {
        photoUrls: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1280&q=80&auto=format&fit=crop',
        ],
        shuffleEnabled,
        tintColor: '#22d3ee',
      })}
    />
  );
}

const meta = {
  title: 'Cards/Custom/Photo',
  component: PhotoStoryPreview,
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
  parameters: { docs: { description: {} } },
} satisfies Meta<PhotoStoryArgs>;

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

type Story = StoryObj<PhotoStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
    shuffleEnabled: true,
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    shuffleEnabled: true,
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
    shuffleEnabled: true,
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    shuffleEnabled: true,
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'extra-large',
    shuffleEnabled: true,
  },
};
