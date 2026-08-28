import type { MobileHeaderEditActions } from '@navet/app/components/layout/mobile-header-actions';
import type { RoomNavigationGroup } from '@navet/app/components/layout/room-nav.utils';
import {
  createDashboardDefinition,
  createLegacyDashboardCollection,
  sanitizeDashboardCollection,
} from '@navet/app/features/dashboard/dashboards/dashboard-collection';
import { useDashboardCollectionStore } from '@navet/app/features/dashboard/dashboards/dashboard-collection-store';
import { useSettingsStore } from '@navet/app/stores';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { KioskControlCenter } from './kiosk-control-center';

const STORY_ROOMS = [
  'All',
  'Living Room',
  'Guest Room',
  'Office',
  'Kitchen',
  'Bathroom',
  'Hallway',
  'Basement',
  'Outside',
];
const STORY_GROUPS: RoomNavigationGroup[] = [
  {
    id: 'upstairs',
    name: 'Upstairs',
    rooms: ['Living Room', 'Guest Room', 'Office'],
    symbol: 'Layers3',
  },
  {
    id: 'shared-spaces',
    name: 'Shared spaces',
    rooms: ['Kitchen', 'Bathroom', 'Hallway'],
    symbol: 'Home',
  },
];
const MANAGEABLE_ROOMS: PlatformManageableRoomReference[] = STORY_ROOMS.filter(
  (room) => room !== 'All'
).map((name) => ({
  id: name.toLocaleLowerCase().replaceAll(' ', '-'),
  name,
  providerId: 'home_assistant',
  canAssign: true,
  canDelete: true,
  canOrder: true,
}));

function KioskControlCenterStory({ manyRooms = false }: { manyRooms?: boolean }) {
  const [open, setOpen] = useState(true);
  const rooms = useMemo(
    () =>
      manyRooms
        ? [...STORY_ROOMS, ...Array.from({ length: 32 }, (_, index) => `Room ${index + 1}`)]
        : STORY_ROOMS,
    [manyRooms]
  );
  const [activeRoom, setActiveRoom] = useState('Living Room');

  useEffect(() => {
    const previousCollection = useDashboardCollectionStore.getState();
    const previousSettings = useSettingsStore.getState();
    const home = createDashboardDefinition({ id: 'home', name: 'Home' });
    const upstairs = createDashboardDefinition({ id: 'upstairs', name: 'Upstairs lights' });
    const guests = createDashboardDefinition({ id: 'guests', name: 'Guest controls' });
    useDashboardCollectionStore.setState({
      collection: sanitizeDashboardCollection(
        {
          schemaVersion: 1,
          defaultDashboardId: 'home',
          order: ['home', 'upstairs', 'guests'],
          dashboardsById: { home, upstairs, guests },
          dashboardIdByClientId: {},
        },
        createLegacyDashboardCollection({ homeLayout: null })
      ),
      activeDashboardId: 'home',
    });
    useSettingsStore.getState().updateSettings({ kioskMode: true, kioskSwipeRooms: true });

    return () => {
      useDashboardCollectionStore.setState({
        collection: previousCollection.collection,
        activeDashboardId: previousCollection.activeDashboardId,
        activeSource: previousCollection.activeSource,
        pendingAssignedDashboardId: previousCollection.pendingAssignedDashboardId,
        layoutHistory: previousCollection.layoutHistory,
      });
      useSettingsStore.getState().updateSettings({
        kioskMode: previousSettings.kioskMode,
        kioskSwipeRooms: previousSettings.kioskSwipeRooms,
      });
    };
  }, []);

  const editActions: MobileHeaderEditActions = {
    isEditMode: false,
    onToggleEditMode: () => {},
    onAddEntity: () => {},
    allViewGrouping: 'custom',
    onAllViewGroupingChange: () => {},
    reorderRooms: {
      rooms,
      manageableRooms: MANAGEABLE_ROOMS,
      roomHiddenItemCounts: new Map(),
      roomItemCounts: new Map(rooms.map((room, index) => [room, index + 1])),
      onRoomOrderChange: () => {},
      onHiddenRoomsChange: () => {},
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <KioskControlCenter
        open={open}
        onOpenChange={setOpen}
        editActions={editActions}
        onCustomizeSidebar={() => {}}
        roomNavigation={{
          activeRoom,
          onRoomChange: setActiveRoom,
          rooms,
          groups: STORY_GROUPS,
        }}
      />
    </div>
  );
}

const meta = {
  title: 'App Shell/Kiosk/Kiosk Control Center',
  component: KioskControlCenterStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: getStoryDocsDescription('App Shell/Kiosk/Kiosk Control Center'),
      },
    },
    layout: 'fullscreen',
  },
} satisfies Meta<typeof KioskControlCenterStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopNavigation: Story = {
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },

  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Kiosk control' });
    await waitFor(() => expect(dialog).toBeVisible());
    const desktopNavigation = page.queryByRole('navigation', { name: 'Navigate' });
    if (desktopNavigation) {
      await expect(desktopNavigation).toBeVisible();
      await expect(page.queryByText('Current location')).toBeNull();
      await expect(
        page.queryByText('Switch dashboards, sections, and rooms without leaving kiosk mode.')
      ).toBeNull();
      await expect(page.getByRole('button', { name: 'Guest controls' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Kitchen' })).toBeVisible();
    } else {
      await expect(page.getByRole('navigation', { name: 'Kiosk control' })).toBeVisible();
    }
  },
};

export const TabletPortrait: Story = {
  globals: { viewport: { value: 'ipadPro', isRotated: false } },
};

export const MobileIndex: Story = {
  globals: { viewport: { value: 'iphone14', isRotated: false } },

  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole('dialog', { name: 'Kiosk control' });
    await waitFor(() => expect(dialog).toBeVisible());
    const safeAreaHeader = canvasElement.ownerDocument.querySelector<HTMLElement>(
      '[data-kiosk-control-header]'
    );
    await expect(safeAreaHeader?.className).toContain('safe-area-inset-top');
    await expect(page.queryByRole('navigation', { name: 'Navigate' })).toBeNull();
    await userEvent.click(page.getByRole('button', { name: 'Home' }));
    await expect(page.queryByText('Current location')).toBeNull();
    await expect(page.getByRole('button', { name: 'Kitchen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to kiosk menu' })).toBeVisible();
  },
};

export const KioskBehavior: Story = {
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },

  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('button', { name: 'Kiosk behavior' }));
    const swipeSwitch = await page.findByRole('switch', { name: 'Swipe between rooms' });
    await expect(swipeSwitch).toHaveAttribute('aria-checked', 'true');
  },
};

export const ManageRoomsHandoff: Story = {
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },

  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('button', { name: 'Manage Rooms' }));
    const dialog = await page.findByRole('dialog', { name: 'Rooms' });
    await waitFor(() => expect(dialog).toBeVisible());
  },
};

export const ManyRooms: Story = {
  args: { manyRooms: true },
  globals: { viewport: { value: 'desktop1080p', isRotated: false } },
};

export const MobileScrollableRooms: Story = {
  args: { manyRooms: true },
  globals: { viewport: { value: 'iphone14', isRotated: false } },

  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(await page.findByRole('button', { name: 'Home' }));

    const scrollArea = canvasElement.ownerDocument.querySelector<HTMLElement>(
      '[data-kiosk-control-center] [data-navigation-workspace-scroll-area]'
    );
    await expect(scrollArea).not.toBeNull();
    await expect((scrollArea?.scrollHeight ?? 0) > (scrollArea?.clientHeight ?? 0)).toBe(true);

    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
      await expect(scrollArea.scrollTop).toBeGreaterThan(0);
    }
  },
};
