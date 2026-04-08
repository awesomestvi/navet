import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Textarea } from './textarea';

const meta = {
  title: 'Components/Primitives/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Add a note for this card',
    disabled: false,
    invalid: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Shared multiline field for settings and note-style editing. Keep business-specific formatting and validation outside the primitive.',
      },
    },
  },
} satisfies Meta<typeof Textarea>;

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

export const Default: Story = {};
export const LongContent: Story = {
  args: {
    defaultValue:
      'Good morning routine:\n- Open blinds\n- Start coffee\n- Set hallway lights to warm white',
  },
};
export const ErrorState: Story = { args: { invalid: true, defaultValue: 'ftp://broken-feed' } };
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'This field is disabled.' },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
