import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '../stories/custom-card-story-helpers';

type ActionStoryArgs = {
  size: Extract<CardSize, 'tiny' | 'extra-small' | 'small'>;
};

function ActionStoryPreview({ size }: ActionStoryArgs) {
  return (
    <CustomWidgetStoryFrame
      card={buildCustomCard('button', size, {
        label: 'Movie Mode',
        service: 'scene.turn_on',
        entityId: 'scene.movie_mode',
        icon: 'Film',
        tintColor: '#60a5fa',
      })}
    />
  );
}

const meta = {
  title: 'Cards/Custom/Action',
  component: ActionStoryPreview,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<ActionStoryArgs>;

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

type Story = StoryObj<ActionStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'small',
  },
};

export const Tiny: Story = {
  args: {
    size: 'tiny',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};
