import type { Meta, StoryObj } from '@storybook/react';
import { Bell } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { useRef } from 'react';
import { NotificationPanel } from '@/app/features/notifications';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { NotificationHeader } from './notification-header';
import { NotificationItem } from './notification-item';
import { getNotificationSurfaceTokens } from './notification-surface-tokens';
import { formatTimestamp, getColorValue } from './notification-utils';
import type { Notification } from './use-notifications';

function NotificationPanelPreview({
  triggerRef,
  children,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-[36rem] p-6 md:p-8">
      <div className="relative flex justify-end">
        <button
          ref={triggerRef}
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-[22px] bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />
        </button>
        {children}
      </div>
    </div>
  );
}

function NotificationPanelMobilePreview({
  triggerRef,
  children,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-[44rem] justify-center bg-slate-950 p-6">
      <div className="relative w-full max-w-[24rem] overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Mobile Header
            </p>
            <p className="truncate text-sm font-semibold text-white/88">Notifications sheet</p>
          </div>
          <button
            ref={triggerRef}
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-[22px] bg-white/8 text-white/70 transition-colors hover:bg-white/12"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400" />
          </button>
        </div>

        <div className="h-[38rem] bg-[linear-gradient(180deg,rgba(15,23,42,0.42),rgba(2,6,23,0.82))]" />
        {children}
      </div>
    </div>
  );
}

function NotificationPanelStory({ isOpen = true }: { isOpen?: boolean }) {
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <NotificationPanelPreview triggerRef={notificationButtonRef}>
      <NotificationPanel isOpen={isOpen} onClose={() => {}} triggerRefs={[notificationButtonRef]} />
    </NotificationPanelPreview>
  );
}

function NotificationPanelMobileStory({ isOpen = true }: { isOpen?: boolean }) {
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <NotificationPanelMobilePreview triggerRef={notificationButtonRef}>
      <NotificationPanel isOpen={isOpen} onClose={() => {}} triggerRefs={[notificationButtonRef]} />
    </NotificationPanelMobilePreview>
  );
}

function NotificationExamplePanel({ notification }: { notification: Notification }) {
  const { theme, primaryColor } = useTheme();
  const surface = getNotificationSurfaceTokens(theme);
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <NotificationPanelPreview triggerRef={notificationButtonRef}>
      <div
        className={`absolute right-0 top-full z-10 mt-2 flex w-96 max-h-[60vh] flex-col overflow-hidden rounded-2xl ${surface.panelClassName}`}
      >
        <NotificationHeader
          onClose={() => {}}
          onMarkAllAsRead={!notification.read ? () => {} : undefined}
          onClearAll={() => {}}
          unreadCount={notification.read ? 0 : 1}
          hasNotifications
          theme={theme}
          primaryColor={primaryColor}
          getColorValue={getColorValue}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <section>
            <div className="mb-2 px-1">
              <h4
                className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
              >
                {notification.source === 'update' ? 'Updates' : 'Notifications'}
              </h4>
            </div>
            <div
              className={`overflow-hidden rounded-2xl border divide-y ${surface.dividerClassName} ${surface.borderClassName}`}
            >
              <NotificationItem
                notification={notification}
                onPrimaryAction={async () => {}}
                onDelete={async () => {}}
                theme={theme}
                primaryColor={primaryColor}
                formatTimestamp={(date) =>
                  formatTimestamp(date, {
                    daysAgo: '{count}d ago',
                    hoursAgo: '{count}h ago',
                    justNow: 'Just now',
                    minutesAgo: '{count}m ago',
                  })
                }
              />
            </div>
          </section>
        </div>
      </div>
    </NotificationPanelPreview>
  );
}

const normalNotification: Notification = {
  id: 'story-normal-notification',
  type: 'warning',
  title: 'Kitchen window is still open',
  message: 'The kitchen window has been open for 18 minutes while the thermostat is heating.',
  timestamp: new Date(Date.now() - 18 * 60 * 1000),
  read: false,
  notificationId: 'story-normal-notification',
  source: 'persistent_notification',
};

const updateNotification: Notification = {
  id: 'story-update-notification',
  type: 'info',
  title: 'Dashboard update available',
  message:
    'Navet 1.12.0 is ready to install.\n\n- Refined header stories\n- Improved toast docs\n- Better Storybook layouts',
  timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  read: false,
  notificationId: 'story-update-notification',
  source: 'update',
  requiresRestart: false,
};

const meta = {
  title: 'App Shell/Header/Notification Panel',
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

export const MobileOpen: Story = {
  render: () => <NotificationPanelMobileStory />,
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const NotificationExample: Story = {
  render: () => <NotificationExamplePanel notification={normalNotification} />,
};

export const UpdateExample: Story = {
  render: () => <NotificationExamplePanel notification={updateNotification} />,
};
