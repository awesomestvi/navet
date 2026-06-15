import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { Stepper } from './stepper';

const meta = {
  title: 'Components/Primitives/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  args: {
    currentStep: 1,
    size: 'default',
    items: [
      { id: 'essentials', label: 'Essentials' },
      { id: 'sources', label: 'Extra sources', optional: true },
      { id: 'devices', label: 'Device tracking', optional: true },
    ],
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Compact horizontal stepper for short setup and onboarding flows.',
      },
    },
  },
} satisfies Meta<typeof Stepper>;

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

export const InProgress: Story = {};
export const CompletedFirstStep: Story = { args: { currentStep: 2 } };
export const Compact: Story = {
  args: {
    size: 'compact',
    items: [
      { id: 'essentials', label: 'Essentials', compactLabel: 'Basics' },
      { id: 'sources', label: 'Extra sources', compactLabel: 'Sources', optional: true },
      { id: 'devices', label: 'Device tracking', compactLabel: 'Devices', optional: true },
    ],
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
