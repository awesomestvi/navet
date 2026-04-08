import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Heading } from './heading';

const meta = {
  title: 'Components/Primitives/Heading',
  component: Heading,
  tags: ['autodocs'],
  args: {
    as: 'h2',
    children: 'Room overview',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Semantic heading primitive for shared sections and dialog titles without introducing a larger typography system yet.',
      },
    },
  },
} satisfies Meta<typeof Heading>;

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

export const H1: Story = { args: { as: 'h1', children: 'Dashboard settings' } };
export const H2: Story = {};
export const H3: Story = { args: { as: 'h3', children: 'Appearance' } };
export const H4: Story = { args: { as: 'h4', children: 'Brightness presets' } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
