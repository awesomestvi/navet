import { NotificationPanel } from '@navet/app/features/notifications';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';
import { expect, within } from 'storybook/test';
import { NotificationCenter } from './index';
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
  const [open, setOpen] = useState(isOpen);

  return (
    <NotificationPanelMobilePreview triggerRef={notificationButtonRef}>
      <NotificationPanel
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRefs={[notificationButtonRef]}
      />
    </NotificationPanelMobilePreview>
  );
}

function NotificationExamplePanel({ notification }: { notification: Notification }) {
  return <BusyCenter initialNotifications={[notification]} />;
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
    docs: {
      story: {
        height: '36rem',
      },
      description: {
        component:
          'Notification panel for header bell interactions. Uses a focused desktop side panel and a shared mobile coversheet with separate notification and update views. Clear-all confirmation should reset cleanly when the panel closes.',
      },
    },
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
    docs: {
      story: {
        height: '44rem',
      },
    },
  },

  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
};

export const MobileDoneCloses: Story = {
  ...MobileOpen,
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Notifications' });
    const header = dialog.querySelector('[data-sheet-surface-header]');
    const footer = dialog.querySelector('footer');
    if (!header) throw new Error('Notification header is missing');
    if (!footer) throw new Error('Notification footer is missing');
    const dismiss = within(dialog).getByRole('button', { name: 'Close' });
    await expect(dialog.querySelector('[data-mobile-cover-sheet-dismiss]')).toBeVisible();
    await expect(dialog.getBoundingClientRect().top).toBeGreaterThan(0);
    const done = within(footer).getByRole('button', { name: 'Done' });
    await expect(dismiss.getBoundingClientRect().top).toBeGreaterThanOrEqual(
      dialog.getBoundingClientRect().top
    );
    await expect(done.getBoundingClientRect().top).toBeGreaterThan(
      header.getBoundingClientRect().bottom
    );
    await userEvent.click(done);
    await expect(page.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    await expect(page.getByRole('button', { name: /^Notifications$/ })).toHaveFocus();
  },
};

export const MobileDismissCloses: Story = {
  ...MobileOpen,
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Notifications' });
    const header = dialog.querySelector('[data-sheet-surface-header]');
    if (!header) throw new Error('Notification header is missing');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await expect(page.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  },
};

export const NotificationExample: Story = {
  render: () => <NotificationExamplePanel notification={normalNotification} />,
};

export const UpdateExample: Story = {
  render: () => <NotificationExamplePanel notification={updateNotification} />,
};

const busyFeed: Notification[] = [
  normalNotification,
  {
    ...normalNotification,
    id: 'backup',
    title: 'Backup completed',
    type: 'success',
    message: 'Your household backup is ready.',
    read: true,
  },
  {
    ...normalNotification,
    id: 'long',
    title: 'Upstairs hallway sensor has stopped responding to the household controller',
    type: 'error',
    message:
      'Check the battery and bring the sensor closer to its hub.\n\n' +
      'The last reading was received yesterday. '.repeat(20),
  },
  ...Array.from({ length: 18 }, (_, index) => ({
    ...updateNotification,
    id: `update-${index}`,
    title: `${['Living room lights', 'Heating controller', 'Home dashboard'][index % 3]} ${index + 1}`,
    message:
      index === 0
        ? `${updateNotification.message}\n\n${'Improved reliability when devices reconnect to the household controller. '.repeat(5)}Release notes end.`
        : updateNotification.message,
    installedVersion: ['2.8.1', '4.12.0', '1.12.0'][index % 3],
    latestVersion: ['2.9.0', '4.12.1', '1.13.0'][index % 3],
  })),
];

function BusyCenter({
  empty = false,
  initialNotifications = busyFeed,
}: {
  empty?: boolean;
  initialNotifications?: Notification[];
}) {
  const [notifications, setNotifications] = useState(empty ? [] : initialNotifications);
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
        Open notifications
      </button>
      <NotificationCenter
        isOpen={open}
        triggerRefs={[triggerRef]}
        onClose={() => setOpen(false)}
        notifications={notifications}
        unreadCount={notifications.filter((item) => !item.read).length}
        runPrimaryAction={async (id) =>
          setNotifications((items) =>
            items.map((item) => (item.id === id ? { ...item, read: true } : item))
          )
        }
        markAllAsRead={() =>
          setNotifications((items) => items.map((item) => ({ ...item, read: true })))
        }
        deleteNotification={async (id) =>
          setNotifications((items) => items.filter((item) => item.id !== id))
        }
        clearAll={async () => setNotifications([])}
      />
    </>
  );
}

export const Interactions: Story = {
  render: () => <BusyCenter />,
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('button', { name: 'Mark as read: Kitchen window is still open' })
    );
    await expect(page.getByRole('article', { name: 'Kitchen window is still open' })).toBeVisible();
    await expect(
      page.queryByRole('button', { name: 'Mark as read: Kitchen window is still open' })
    ).not.toBeInTheDocument();
    await userEvent.click(
      await page.findByRole('button', { name: 'Delete: Kitchen window is still open' })
    );
    await expect(
      page.queryByRole('article', { name: 'Kitchen window is still open' })
    ).not.toBeInTheDocument();
    await expect(page.getByRole('article', { name: 'Backup completed' })).toBeInTheDocument();
    await userEvent.click(page.getByRole('tab', { name: 'Notifications 2' }));
    await userEvent.keyboard('{ArrowRight}');
    await expect(page.getByRole('tab', { name: 'Updates 18' })).toHaveFocus();
    await expect(page.getByRole('tab', { name: 'Updates 18' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getAllByRole('article')).toHaveLength(18);
    const firstUpdate = within(page.getByRole('article', { name: 'Living room lights 1' }));
    await expect(firstUpdate.getByText('Refined header stories')).toBeVisible();
    await expect(firstUpdate.queryByText(/Release notes end/)).not.toBeInTheDocument();
    await expect(
      within(page.getByRole('article', { name: 'Heating controller 2' })).queryByRole('button', {
        name: 'Read more',
      })
    ).not.toBeInTheDocument();
    await userEvent.click(firstUpdate.getByRole('button', { name: 'Read more' }));
    await expect(firstUpdate.getByText(/Release notes end/)).toBeVisible();
    await userEvent.click(firstUpdate.getByRole('button', { name: 'Show less' }));
    await expect(firstUpdate.queryByText(/Release notes end/)).not.toBeInTheDocument();
    await expect(
      within(page.getByRole('article', { name: 'Living room lights 1' })).getByText(
        'Refined header stories'
      )
    ).toBeVisible();
    await userEvent.click(firstUpdate.getByRole('button', { name: 'Hide: Living room lights 1' }));
    await expect(page.getAllByRole('article')).toHaveLength(17);
    await userEvent.click(page.getByRole('button', { name: 'Clear all' }));
    await userEvent.click(page.getByRole('button', { name: 'Cancel' }));
    await expect(page.getAllByRole('article')).toHaveLength(17);
    await userEvent.keyboard('{Escape}');
    await expect(page.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(page.getByRole('button', { name: 'Open notifications' })).toHaveFocus();
  },
};
export const Empty: Story = { render: () => <BusyCenter empty /> };

export const UpdateStates: Story = {
  render: () => (
    <BusyCenter
      initialNotifications={[
        normalNotification,
        {
          ...updateNotification,
          id: 'installing',
          title: 'Heating controller',
          isBusy: true,
          progress: 42,
          statusLabel: 'Installing · 42%',
        },
        {
          ...updateNotification,
          id: 'restart',
          title: 'Household controller',
          requiresRestart: true,
          isBusy: true,
        },
      ]}
    />
  ),
};

export const Busy: Story = { render: () => <BusyCenter /> };

export const Updates: Story = {
  render: () => <BusyCenter />,
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('tab', { name: 'Updates 18' }));
  },
};

export const MobileUpdateActions: Story = {
  render: () => (
    <BusyCenter
      initialNotifications={[
        {
          ...updateNotification,
          id: 'long-update-title',
          title: 'Upstairs heating controller firmware update',
          detailsUrl: 'https://example.com/updates',
        },
        {
          ...updateNotification,
          id: 'restart-required',
          title: 'Navet Update',
          requiresRestart: true,
          detailsUrl: 'https://example.com/releases',
        },
        {
          ...updateNotification,
          id: 'installing',
          title: 'Bathroom thermostat update',
          isBusy: true,
          progress: 42,
          statusLabel: 'Installing · 42%',
          detailsUrl: 'https://example.com/thermostat',
        },
      ]}
    />
  ),
  globals: {
    viewport: {
      value: 'iphone14',
      isRotated: false,
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('tab', { name: 'Updates 3' }));
    const dialog = page.getByRole('dialog', { name: 'Notifications' });
    const footer = dialog.querySelector('footer');
    if (!footer) throw new Error('Notification footer is missing');
    const done = within(footer).getByRole('button', { name: 'Done' });
    const clearAll = within(footer).getByRole('button', { name: 'Clear all' });
    await expect(
      Math.abs(done.getBoundingClientRect().top - clearAll.getBoundingClientRect().top)
    ).toBeLessThan(3);
    for (const [title, action] of [
      ['Upstairs heating controller firmware update', 'Update'],
      ['Navet Update', 'Restart'],
      ['Bathroom thermostat update', 'Installing'],
    ]) {
      const article = page.getByRole('article', { name: title });
      const row = within(article);
      const heading = row.getByRole('heading', { name: title });
      const primary = row.getByRole('button', { name: action });
      const changes = row.getByRole('link', { name: 'View changes' });
      const hide = row.getByRole('button', { name: `Hide: ${title}` });
      await expect(primary.getBoundingClientRect().top).toBeLessThan(
        changes.getBoundingClientRect().top
      );
      await expect(primary.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        heading.getBoundingClientRect().right
      );
      await expect(hide.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        changes.getBoundingClientRect().right
      );
      await expect(primary.getBoundingClientRect().right).toBeLessThanOrEqual(
        article.getBoundingClientRect().right
      );
    }
  },
};
