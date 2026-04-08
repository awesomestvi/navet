import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { LoadingSpinner } from './loading-spinner';

const meta = {
  title: 'Components/Primitives/Loading Spinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware loading indicator for suspended sections and full-screen wait states. Keeps the API intentionally small: optional message plus full-screen layout.',
      },
    },
  },
  args: {
    message: 'Loading dashboard',
    fullScreen: false,
  },
} satisfies Meta<typeof LoadingSpinner>;

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

export const FullScreen: Story = {
  args: {
    fullScreen: true,
    message: 'Connecting to Home Assistant',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
