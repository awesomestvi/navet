import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useRef, useState } from 'react';
import { HeaderDesktopActions } from './header-actions';

function HeaderActionsDesktopPreview({ children }: { children: ReactNode }) {
  return <div className="flex justify-end p-8">{children}</div>;
}

function HeaderDesktopActionsStory({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(defaultOpen);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <HeaderActionsDesktopPreview>
      <div className="flex items-center gap-2">
        <HeaderDesktopActions
          activeColorValue="#22d3ee"
          avatarUrl={null}
          desktopNotificationButtonRef={desktopNotificationButtonRef}
          hoverBg="hover:bg-white/10"
          isNotificationOpen={isNotificationOpen}
          mobileNotificationButtonRef={mobileNotificationButtonRef}
          setIsNotificationOpen={setIsNotificationOpen}
          textSecondary="text-white/70"
          unreadCount={3}
        />
      </div>
    </HeaderActionsDesktopPreview>
  );
}

const meta = {
  title: 'App Shell/Header/Header Actions',
  component: HeaderDesktopActionsStory,
  tags: ['autodocs'],
  args: {
    defaultOpen: false,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Desktop header actions, including the bell-triggered notifications panel. Review with the panel open to confirm it renders inline under the bell instead of from a detached root mount.',
      },
    },
  },
} satisfies Meta<typeof HeaderDesktopActionsStory>;

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

export const Desktop: Story = {};

export const DesktopWithNotificationsOpen: Story = {
  args: {
    defaultOpen: true,
  },
};
