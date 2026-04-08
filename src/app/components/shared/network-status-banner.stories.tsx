import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
