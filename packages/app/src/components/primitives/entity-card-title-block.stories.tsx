import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { EntityCardTitleBlock } from './entity-card-title-block';

const meta = {
  title: 'Components/Primitives/Cards/Entity Card Title Block',
  component: EntityCardTitleBlock,
  tags: ['autodocs'],
  args: {
    title: 'Kitchen scene',
    subtitle: 'Living room',
    layout: 'title-first',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Shared title-and-subtitle block used in compact cards when full header chrome is not needed.',
      },
    },
  },
} satisfies Meta<typeof EntityCardTitleBlock>;

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

export const TitleFirst: Story = {};

export const EyebrowFirst: Story = {
  args: {
    layout: 'eyebrow-first',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
