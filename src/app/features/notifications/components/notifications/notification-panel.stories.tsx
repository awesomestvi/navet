import type { Meta, StoryObj } from '@storybook/react';
import { NotificationPanel } from '@/app/features/notifications';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';

function NotificationPanelStory({ isOpen = true }: { isOpen?: boolean }) {
  return (
    <div className="relative min-h-[34rem] p-6">
      <NotificationPanel isOpen={isOpen} onClose={() => {}} />
    </div>
  );
}

const meta = {
  title: 'App Shell/Notifications/Panel',
  component: NotificationPanelStory,
  tags: ['autodocs'],
  args: {
    isOpen: true,
  },
  parameters: {
    layout: 'fullscreen',
    docs: { description: {} },
  },
} satisfies Meta<typeof NotificationPanelStory>;

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

export const Open: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
