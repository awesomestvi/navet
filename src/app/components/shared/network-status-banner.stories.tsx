import type { Meta, StoryObj } from '@storybook/react';
import { NetworkStatusBanner } from './network-status-banner';

const meta = {
  title: 'Components/Shared/Network Status Banner',
  component: NetworkStatusBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Full-width status banner for top-of-screen system alerts. Uses the same semantic tone palette as Messagebar — info, success, warning, and error.',
      },
    },
  },
  args: {
    connected: false,
    connecting: false,
    reconnecting: false,
    isOnline: true,
  },
} satisfies Meta<typeof NetworkStatusBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Warning: Story = {
  args: { tone: 'warning' },
};

export const ErrorState: Story = {
  args: { tone: 'error', isOnline: false },
};

export const Info: Story = {
  args: { tone: 'info' },
};

export const Reconnecting: Story = {
  args: { tone: 'warning', connecting: true, reconnecting: true },
};
