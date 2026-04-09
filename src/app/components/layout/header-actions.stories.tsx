import type { Meta, StoryObj } from '@storybook/react';
import { type ReactNode, useRef, useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { HeaderDesktopActions, HeaderMobileActions } from './header-actions';

function HeaderActionsDesktopPreview({ children }: { children: ReactNode }) {
  return <div className="flex justify-end p-8">{children}</div>;
}

function HeaderActionsMobilePreview({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center p-8">
      <div className="w-full max-w-[24rem] rounded-[30px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-black/20 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Header
            </p>
            <p className="truncate text-sm font-semibold text-white/88">Mobile actions</p>
          </div>
          <div className="[&>*]:!flex [&>*]:!items-center [&>*]:!gap-2">{children}</div>
        </div>
      </div>
    </div>
  );
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

function HeaderMobileActionsStory() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <HeaderActionsMobilePreview>
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
    </HeaderActionsMobilePreview>
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

export const Mobile: Story = {
  render: () => <HeaderMobileActionsStory />,
};
