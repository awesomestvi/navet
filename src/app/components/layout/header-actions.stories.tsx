import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useRef, useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { HeaderDesktopActions } from './header-actions';

function HeaderActionsDesktopPreview({ children }: { children: ReactNode }) {
  return <div className="flex justify-end p-8">{children}</div>;
}

function HeaderDesktopActionsStory() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
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
  parameters: {
    layout: 'fullscreen',
    docs: { description: {} },
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
