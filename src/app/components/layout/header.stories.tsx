import type { Meta, StoryObj } from '@storybook/react';
import { type Dispatch, type ReactNode, type SetStateAction, useRef, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { TranslateFn, TranslationKey } from '@/app/i18n';
import type { PrimaryColor } from '@/app/stores/theme-store';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Header } from './header';
import type { MobileHeaderEditActions } from './mobile-header-actions';
import type { MobileRoomNavigation } from './mobile-room-dropdown';
import type { HeaderController } from './use-header-controller';

const STORY_ROOMS = ['Living Room', 'Kitchen', 'Bedroom'];
const STORY_AREAS = STORY_ROOMS.map((name, index) => ({
  area_id: String(index + 1),
  name,
}));
const STORY_TEXT: Partial<Record<TranslationKey, string>> = {
  'header.searchPlaceholder': 'Search devices',
  'notifications.title': 'Notifications',
  'common.moreActions': 'More actions',
  'common.done': 'Done',
  'common.cancel': 'Cancel',
  'dashboard.roomNav.all': 'All',
  'dashboard.roomNav.customize': 'Customize',
  'dashboard.roomNav.doneEditing': 'Done editing',
  'dashboard.roomNav.reorder': 'Reorder rooms',
  'dashboard.roomNav.add': 'Add',
  'dashboard.roomNav.groupBy': 'Group by',
  'dashboard.roomNav.openRooms': 'Rooms',
  'dashboard.roomNav.grouping.custom': 'Custom',
  'dashboard.roomNav.grouping.room': 'Room',
  'dashboard.roomNav.grouping.type': 'Type',
  'dashboard.roomNav.grouping.none': 'None',
  'dashboard.roomNav.reorderDialog.title': 'Reorder rooms',
  'dashboard.roomNav.reorderDialog.description': 'Adjust room order and cleanup from one place.',
  'dashboard.roomNav.reorderDialog.deleteTitle': 'Delete room',
  'dashboard.roomNav.reorderDialog.deleteAction': 'Delete',
  'dashboard.roomNav.reorderDialog.moveUp': 'Move up',
  'dashboard.roomNav.reorderDialog.moveDown': 'Move down',
  'dashboard.addEntity.title': 'Add entity',
};

const translateHeaderStory: TranslateFn = (key, params) => {
  switch (key) {
    case 'header.greeting.welcome':
      return `Welcome back, ${params?.name ?? 'Vishal'}!`;
    case 'header.weekLabel':
      return `Week ${params?.week ?? 18}`;
    case 'dashboard.roomNav.reorderDialog.deleteDescription':
      return `Delete ${params?.room ?? 'room'}?`;
    case 'dashboard.roomNav.reorderDialog.dragRoom':
      return `Drag ${params?.room ?? 'room'}`;
    case 'dashboard.roomNav.reorderDialog.deleteRoom':
      return `Delete ${params?.room ?? 'room'}`;
    case 'dashboard.roomNav.reorderDialog.itemCount.one':
      return `${params?.count ?? 1} item`;
    case 'dashboard.roomNav.reorderDialog.itemCount.other':
      return `${params?.count ?? 0} items`;
    case 'dashboard.roomNav.reorderDialog.hiddenCount':
      return `${params?.count ?? 0} hidden`;
    default:
      return STORY_TEXT[key] ?? key;
  }
};

function createHeaderStoryController(args: {
  desktopNotificationButtonRef: HeaderController['desktopNotificationButtonRef'];
  mobileNotificationButtonRef: HeaderController['mobileNotificationButtonRef'];
  mobileSearchInputRef: HeaderController['mobileSearchInputRef'];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: Dispatch<SetStateAction<boolean>>;
  isNotificationOpen: boolean;
  setIsNotificationOpen: Dispatch<SetStateAction<boolean>>;
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: Dispatch<SetStateAction<boolean>>;
  isMobileUtilityOpen: boolean;
  setIsMobileUtilityOpen: Dispatch<SetStateAction<boolean>>;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  primaryColor: PrimaryColor;
  unreadCount: number;
}): HeaderController {
  const {
    desktopNotificationButtonRef,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    isNotificationOpen,
    setIsNotificationOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    isMobileUtilityOpen,
    setIsMobileUtilityOpen,
    surface,
    primaryColor,
    unreadCount,
  } = args;

  return {
    activeColorValue: getThemeColorValue(primaryColor),
    avatarUrl: null,
    border: surface.border,
    closeMobileSearch: () => setIsMobileSearchOpen(false),
    closeMobileUtility: () => setIsMobileUtilityOpen(false),
    closeNotifications: () => setIsNotificationOpen(false),
    desktopNotificationButtonRef,
    dividerColor: surface.textMuted,
    firstName: 'Vishal',
    formattedDate: 'Sunday, May 3',
    formattedTime: '09:41',
    greetingKey: 'header.greeting.welcome',
    handleClearSearch: () => setSearchQuery(''),
    handleSearchChange: (value: string) => setSearchQuery(value),
    handleToggleMobileSearch: () => setIsMobileSearchOpen((current) => !current),
    hoverBg: surface.hoverBg,
    inputBg: surface.inputBg,
    isMobileSearchOpen,
    isMobileUtilityOpen,
    isNotificationOpen,
    isSearchActive: searchQuery.length > 0,
    isSearchFocused,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    openMobileUtility: () => setIsMobileUtilityOpen(true),
    openNotifications: () => setIsNotificationOpen(true),
    placeholder: surface.placeholder,
    searchQuery,
    setIsMobileSearchOpen,
    setIsMobileUtilityOpen,
    setIsNotificationOpen,
    setIsSearchFocused,
    surface,
    t: translateHeaderStory,
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    unreadCount,
    weekNumber: 18,
  };
}

function createStoryMobileEditActions(
  isEditMode: boolean,
  setIsEditMode: Dispatch<SetStateAction<boolean>>
): MobileHeaderEditActions {
  return {
    isEditMode,
    onToggleEditMode: () => setIsEditMode((current) => !current),
    onAddEntity: () => undefined,
    addEntityLabel: 'Add entity',
    allViewGrouping: 'custom',
    onAllViewGroupingChange: () => undefined,
    reorderRooms: {
      rooms: STORY_ROOMS,
      areas: STORY_AREAS,
      roomHiddenItemCounts: new Map([
        ['Living Room', 1],
        ['Kitchen', 0],
        ['Bedroom', 0],
      ]),
      roomItemCounts: new Map([
        ['Living Room', 8],
        ['Kitchen', 5],
        ['Bedroom', 4],
      ]),
      onRoomOrderChange: () => undefined,
    },
  };
}

function HeaderStoryFrame({ children, mobile = false }: { children: ReactNode; mobile?: boolean }) {
  return (
    <div className={mobile ? 'mx-auto max-w-[26rem]' : undefined}>
      <div className="rounded-[32px] border border-white/10 bg-black/20 p-3 backdrop-blur-xl md:p-5">
        {children}
      </div>
    </div>
  );
}

function HeaderStoryPreview({
  editMode = false,
  roomLabel = 'Living Room',
  unreadCount = 2,
}: {
  editMode?: boolean;
  roomLabel?: string;
  unreadCount?: number;
}) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const desktopNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileNotificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileUtilityOpen, setIsMobileUtilityOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState(roomLabel);
  const [isEditMode, setIsEditMode] = useState(editMode);
  const controller = createHeaderStoryController({
    desktopNotificationButtonRef,
    mobileNotificationButtonRef,
    mobileSearchInputRef,
    searchQuery,
    setSearchQuery,
    isSearchFocused,
    setIsSearchFocused,
    isNotificationOpen,
    setIsNotificationOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    isMobileUtilityOpen,
    setIsMobileUtilityOpen,
    surface,
    primaryColor,
    unreadCount,
  });

  const mobileRoomNavigation: MobileRoomNavigation = {
    activeRoom,
    onRoomChange: setActiveRoom,
    rooms: [roomLabel, ...STORY_ROOMS.filter((room) => room !== roomLabel)],
  };
  const mobileEditActions = createStoryMobileEditActions(isEditMode, setIsEditMode);

  return (
    <HeaderStoryFrame mobile>
      <Header
        controller={controller}
        mobileEditActions={mobileEditActions}
        mobileRoomNavigation={mobileRoomNavigation}
      />
    </HeaderStoryFrame>
  );
}

const meta = {
  title: 'App Shell/Header/Topbar',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Topbar with greeting, date/time, room switching, utility actions, notifications, and user entry points.',
      },
    },
  },
} satisfies Meta<typeof Header>;

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

export const Default: Story = {};

export const MobileUtilityDefault: Story = {
  render: () => <HeaderStoryPreview />,
};

export const MobileUtilityEditing: Story = {
  render: () => <HeaderStoryPreview editMode />,
};

export const MobileLongRoomName: Story = {
  render: () => (
    <HeaderStoryPreview
      roomLabel="Kitchen and Family Lounge with Oversized Entertaining Zone"
      unreadCount={7}
    />
  ),
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
