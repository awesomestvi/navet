import type { Meta, StoryObj } from '@storybook/react';
import { NetworkStatusBanner } from './network-status-banner';

const meta = {
  title: 'Components/Shared/Network Status Banner',
  component: NetworkStatusBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NetworkStatusBanner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Offline: Story = {
  args: {
    connected: false,
    connecting: false,
    reconnecting: false,
    isOnline: false,
  },
};

export const Reconnecting: Story = {
  args: {
    connected: false,
    connecting: true,
    reconnecting: true,
    isOnline: true,
  },
};

export const Disconnected: Story = {
  args: {
    connected: false,
    connecting: false,
    reconnecting: false,
    isOnline: true,
  },
};
