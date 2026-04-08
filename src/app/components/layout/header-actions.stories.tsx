import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { HeaderDesktopActions, HeaderMobileActions } from './header-actions';

function HeaderDesktopActionsStory() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="flex justify-end p-8">
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
    </div>
  );
}

function HeaderMobileActionsStory() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="p-8">
      <HeaderMobileActions
        activeColorValue="#22d3ee"
        avatarUrl={null}
        desktopNotificationButtonRef={desktopNotificationButtonRef}
        hoverBg="hover:bg-white/10"
        isMobileSearchOpen={isMobileSearchOpen}
        isNotificationOpen={isNotificationOpen}
        mobileNotificationButtonRef={mobileNotificationButtonRef}
        onToggleMobileSearch={() => setIsMobileSearchOpen((current) => !current)}
        setIsNotificationOpen={setIsNotificationOpen}
        searchAriaLabel="Search"
        textSecondary="text-white/70"
        unreadCount={2}
      />
    </div>
  );
}

const meta = {
  title: 'App Shell/Header/Header Actions',
  component: HeaderDesktopActionsStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
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

export const Mobile: Story = {
  render: () => <HeaderMobileActionsStory />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
