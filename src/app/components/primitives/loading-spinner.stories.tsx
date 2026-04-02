import type { Meta, StoryObj } from '@storybook/react';
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

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullScreen: Story = {
  args: {
    fullScreen: true,
    message: 'Connecting to Home Assistant',
  },
};
