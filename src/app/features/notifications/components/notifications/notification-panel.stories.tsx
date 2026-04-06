import type { Meta, StoryObj } from '@storybook/react';
import { NotificationPanel } from '@/app/features/notifications';

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
  },
} satisfies Meta<typeof NotificationPanelStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
