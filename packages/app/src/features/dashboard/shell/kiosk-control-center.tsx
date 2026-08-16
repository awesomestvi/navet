import type { MobileHeaderEditActions } from '@navet/app/components/layout/mobile-header-actions';
import type { MobileRoomNavigation } from '@navet/app/components/layout/mobile-room-dropdown';
import {
  filterHiddenRooms,
  getVisibleRoomNavRooms,
  type RoomNavigationGroup,
} from '@navet/app/components/layout/room-nav.utils';
import { RoomOrderDialog } from '@navet/app/components/layout/room-order-dialog';
import { getSectionNavigationItems } from '@navet/app/components/layout/section-navigation';
import { NavigationWorkspace } from '@navet/app/components/patterns';
import {
  BaseCardDialog,
  Button,
  IconButton,
  InteractivePill,
  Switch,
} from '@navet/app/components/primitives';
import { getNavetAccentWashStyle } from '@navet/app/components/shared/theme/accent-wash-style';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { getDashboardRoomLabel } from '@navet/app/constants/rooms';
import { useI18n, useMediaQuery, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type { Section } from '@navet/app/navigation/sections';
import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { getCustomExtensionIcon } from '@navet/app/utils/custom-extension-icons';
import {
  ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
  isSidebarActionVisible,
  openCustomExtensionUrl,
} from '@navet/app/utils/custom-extensions';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Compass,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  LogOut,
  type LucideIcon,
  Menu,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Fragment, memo, type ReactNode, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AllViewGrouping } from '../all-view-grid/types';
import { DashboardCreateDialog } from '../dashboards/dashboard-create-dialog';
import { useDashboardSwitcher } from '../dashboards/dashboard-switcher';

type KioskPanel = 'navigate' | 'customize' | 'behavior';

interface KioskControlCenterProps {
  editActions?: MobileHeaderEditActions;
  onCustomizeSidebar?: () => void;
  onEditSidebarItem?: (id: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  roomNavigation?: MobileRoomNavigation;
}

interface KioskNavigationItem {
  active?: boolean;
  icon: LucideIcon;
  id: string;
  label: string;
  onSelect: () => void;
}

interface RoomCollection {
  groups: RoomNavigationGroup[];
  standaloneRooms: string[];
  visibleRooms: string[];
}

const GROUPING_OPTIONS: Array<{ labelKey: TranslationKey; value: AllViewGrouping }> = [
  { labelKey: 'dashboard.roomNav.grouping.custom', value: 'custom' },
  { labelKey: 'dashboard.roomNav.grouping.room', value: 'room' },
  { labelKey: 'dashboard.roomNav.grouping.type', value: 'type' },
  { labelKey: 'dashboard.roomNav.grouping.none', value: 'none' },
];

function resolveRooms(navigation?: MobileRoomNavigation): RoomCollection {
  if (!navigation) {
    return { groups: [], standaloneRooms: [], visibleRooms: [] };
  }

  const visibleRooms = getVisibleRoomNavRooms(
    filterHiddenRooms(navigation.rooms, navigation.hiddenRoomNames ?? [])
  );
  const visibleRoomSet = new Set(visibleRooms);
  const groups = (navigation.groups ?? [])
    .map((group) => ({
      ...group,
      rooms: group.rooms.filter((room) => visibleRoomSet.has(room)),
    }))
    .filter((group) => group.rooms.length > 0);
  const groupedRooms = new Set(groups.flatMap((group) => group.rooms));

  return {
    groups,
    standaloneRooms: visibleRooms.filter((room) => !groupedRooms.has(room)),
    visibleRooms,
  };
}

function KioskWorkspaceItem({ active = false, icon: Icon, label, onSelect }: KioskNavigationItem) {
  const { accentColor } = useTheme();

  return (
    <NavigationWorkspace.Item active={active} accentColor={accentColor}>
      <NavigationWorkspace.ItemButton aria-current={active ? 'page' : undefined} onClick={onSelect}>
        <NavigationWorkspace.ItemIcon>
          <Icon className={navetIconSizeTokens.sm} />
        </NavigationWorkspace.ItemIcon>
        <NavigationWorkspace.ItemText title={label} />
      </NavigationWorkspace.ItemButton>
    </NavigationWorkspace.Item>
  );
}

function KioskMobileIndexGroup({ children, label }: { children: ReactNode[]; label?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section>
      {label ? (
        <h2
          className={cn(
            'mb-2 px-2 font-semibold',
            navetTypographyTokens.caption,
            surface.textMuted
          )}
        >
          {label}
        </h2>
      ) : null}
      <NavigationWorkspace.Group>
        {children.map((child, index) => (
          <Fragment key={index}>
            {index > 0 ? <NavigationWorkspace.Separator /> : null}
            {child}
          </Fragment>
        ))}
      </NavigationWorkspace.Group>
    </section>
  );
}

function KioskMobileIndexItem({ icon: Icon, label, onSelect }: KioskNavigationItem) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <NavigationWorkspace.Item active={false} accentColor={accentColor}>
      <NavigationWorkspace.ItemButton onClick={onSelect}>
        <NavigationWorkspace.ItemIcon>
          <Icon className={navetIconSizeTokens.sm} />
        </NavigationWorkspace.ItemIcon>
        <NavigationWorkspace.ItemText title={label} />
        <ChevronRight
          className={cn(navetIconSizeTokens.sm, surface.textMuted)}
          aria-hidden="true"
        />
      </NavigationWorkspace.ItemButton>
    </NavigationWorkspace.Item>
  );
}

function KioskPanelIntro({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section
      className={cn('relative overflow-hidden rounded-[24px] border px-5 py-6', surface.border)}
      style={getNavetAccentWashStyle(accentColor)}
    >
      <div className="relative flex flex-col items-center text-center">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-[18px] border',
            surface.iconBg,
            surface.borderStrong,
            surface.textPrimary
          )}
        >
          <Icon className={navetIconSizeTokens.md} aria-hidden="true" />
        </span>
        <h2 className={cn('mt-3', navetTypographyTokens.pageHeading, surface.textPrimary)}>
          {title}
        </h2>
        <p className={cn('mt-1 max-w-2xl', navetTypographyTokens.body, surface.textSecondary)}>
          {description}
        </p>
      </div>
    </section>
  );
}

function KioskRoomButton({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={onSelect}
      className={cn(
        'flex min-h-12 min-w-0 items-center gap-3 rounded-[18px] border px-3 py-2 text-left',
        'transition-[background-color,border-color] motion-reduce:transition-none',
        active ? surface.borderStrong : 'border-transparent',
        active ? surface.panelMuted : surface.hoverBg,
        surface.textPrimary
      )}
      style={active ? { backgroundColor: `${accentColor}14` } : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-[13px] border text-xs font-semibold',
          surface.iconBg,
          surface.borderStrong
        )}
      >
        {label.trim().slice(0, 1).toLocaleUpperCase()}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
      {active ? <Check className={navetIconSizeTokens.sm} style={{ color: accentColor }} /> : null}
    </button>
  );
}

function KioskNavigatePanel({
  onClose,
  onCreateDashboard,
  roomNavigation,
}: {
  onClose: () => void;
  onCreateDashboard: () => void;
  roomNavigation?: MobileRoomNavigation;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { activeDashboardId, dashboards, openDashboard } = useDashboardSwitcher();
  const rooms = useMemo(() => resolveRooms(roomNavigation), [roomNavigation]);
  const showDashboards = dashboards.length > 1;
  const navigate = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="grid gap-6">
      {showDashboards ? (
        <section aria-labelledby="kiosk-dashboards-title" className="grid gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h3
              id="kiosk-dashboards-title"
              className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}
            >
              {t('dashboard.multiple.title')}
            </h3>
            <Button
              variant="ghost"
              size="compact"
              leading={<Plus className={navetIconSizeTokens.sm} />}
              onClick={onCreateDashboard}
            >
              {t('dashboard.multiple.new')}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dashboards.map((dashboard) => (
              <KioskRoomButton
                key={dashboard.id}
                active={dashboard.id === activeDashboardId}
                label={dashboard.name}
                onSelect={() => navigate(() => openDashboard(dashboard.id))}
              />
            ))}
          </div>
        </section>
      ) : null}

      {roomNavigation && rooms.visibleRooms.length > 0 ? (
        <section
          aria-labelledby="kiosk-rooms-title"
          className="grid gap-4"
          data-testid="kiosk-control-room-list"
        >
          <h3
            id="kiosk-rooms-title"
            className={cn('px-1', navetTypographyTokens.titleMd, surface.textPrimary)}
          >
            {t('dashboard.roomNav.openRooms')}
          </h3>
          {rooms.groups.map((group) => (
            <div key={group.id} className="grid gap-2">
              <h4
                className={cn(
                  'px-1 font-semibold',
                  navetTypographyTokens.caption,
                  surface.textMuted
                )}
              >
                {group.name}
              </h4>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
                {group.rooms.map((room) => (
                  <KioskRoomButton
                    key={room}
                    active={roomNavigation.activeRoom === room}
                    label={getDashboardRoomLabel(room, t('dashboard.roomNav.all'))}
                    onSelect={() => navigate(() => roomNavigation.onRoomChange(room))}
                  />
                ))}
              </div>
            </div>
          ))}
          {rooms.standaloneRooms.length > 0 ? (
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.standaloneRooms.map((room) => (
                <KioskRoomButton
                  key={room}
                  active={roomNavigation.activeRoom === room}
                  label={getDashboardRoomLabel(room, t('dashboard.roomNav.all'))}
                  onSelect={() => navigate(() => roomNavigation.onRoomChange(room))}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function KioskCustomizePanel({
  editActions,
  onCreateDashboard,
  onCustomizeSidebar,
  onManageRooms,
  onOpenChange,
}: {
  editActions?: MobileHeaderEditActions;
  onCreateDashboard: () => void;
  onCustomizeSidebar?: () => void;
  onManageRooms: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
  const customizeSidebarDisabled =
    customSidebarActions.length >= ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT;
  const closeAfter = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <div className="grid gap-6">
      <KioskPanelIntro
        icon={LayoutGrid}
        title={t('dashboard.roomNav.customize')}
        description={t('dashboard.kiosk.customizeDescription')}
      />
      <section className="grid gap-2">
        {editActions ? (
          <Button
            variant="soft"
            className="min-h-12 justify-start"
            leading={<Pencil className={navetIconSizeTokens.sm} />}
            onClick={() => closeAfter(editActions.onToggleEditMode)}
          >
            {editActions.isEditMode
              ? t('dashboard.roomNav.doneEditing')
              : t('dashboard.roomNav.customize')}
          </Button>
        ) : null}
        {editActions?.onAddEntity ? (
          <Button
            variant="soft"
            className="min-h-12 justify-start"
            leading={<Lightbulb className={navetIconSizeTokens.sm} />}
            onClick={() => closeAfter(editActions.onAddEntity ?? (() => {}))}
          >
            {editActions.addEntityLabel ?? t('dashboard.addEntity.title')}
          </Button>
        ) : null}
        {editActions?.reorderRooms ? (
          <Button
            variant="soft"
            className="min-h-12 justify-start"
            leading={<SlidersHorizontal className={navetIconSizeTokens.sm} />}
            onClick={onManageRooms}
          >
            {t('dashboard.roomNav.reorder')}
          </Button>
        ) : null}
        <Button
          variant="soft"
          className="min-h-12 justify-start"
          leading={<LayoutDashboard className={navetIconSizeTokens.sm} />}
          onClick={onCreateDashboard}
        >
          {t('dashboard.multiple.new')}
        </Button>
        {onCustomizeSidebar ? (
          <Button
            variant="soft"
            className="min-h-12 justify-start"
            leading={<Menu className={navetIconSizeTokens.sm} />}
            disabled={customizeSidebarDisabled}
            onClick={() => closeAfter(onCustomizeSidebar)}
          >
            {t('sidebar.customize')}
          </Button>
        ) : null}
      </section>
      {editActions?.isEditMode &&
      editActions.allViewGrouping !== undefined &&
      editActions.onAllViewGroupingChange ? (
        <section className={cn('border-t pt-5', surface.border)}>
          <h3 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
            {t('dashboard.roomNav.grouping.label')}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {GROUPING_OPTIONS.map((option) => {
              const active = editActions.allViewGrouping === option.value;
              return (
                <InteractivePill
                  key={option.value}
                  active={active}
                  intent="navigation"
                  size="small"
                  onClick={() =>
                    closeAfter(() => editActions.onAllViewGroupingChange?.(option.value))
                  }
                >
                  {t(option.labelKey)}
                </InteractivePill>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function KioskBehaviorPanel({ onExitKiosk }: { onExitKiosk: () => void }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const kioskSwipeRooms = useSettingsStore(settingsSelectors.kioskSwipeRooms);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);

  return (
    <div className="grid gap-6">
      <KioskPanelIntro
        icon={Settings2}
        title={t('dashboard.kiosk.behavior')}
        description={t('dashboard.kiosk.behaviorDescription')}
      />
      <section
        className={cn('flex items-start justify-between gap-4 border-b px-1 pb-5', surface.border)}
      >
        <div className="min-w-0">
          <h3 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
            {t('dashboard.kiosk.swipeRooms.title')}
          </h3>
          <p className={cn('mt-1 max-w-2xl text-sm leading-relaxed', surface.textSecondary)}>
            {t('dashboard.kiosk.swipeRooms.description')}
          </p>
        </div>
        <Switch
          checked={kioskSwipeRooms}
          onCheckedChange={(checked) => updateSettings({ kioskSwipeRooms: checked })}
          aria-label={t('dashboard.kiosk.swipeRooms.title')}
          className="mt-0.5 shrink-0"
        />
      </section>
      <section className="px-1">
        <h3 className={cn(navetTypographyTokens.titleMd, surface.textPrimary)}>
          {t('dashboard.kiosk.exit')}
        </h3>
        <p className={cn('mt-1 max-w-2xl text-sm leading-relaxed', surface.textSecondary)}>
          {t('dashboard.kiosk.exitDescription')}
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          leading={<LogOut className={navetIconSizeTokens.sm} />}
          onClick={onExitKiosk}
        >
          {t('dashboard.kiosk.exit')}
        </Button>
      </section>
    </div>
  );
}

export const KioskControlCenter = memo(function KioskControlCenter({
  editActions,
  onCustomizeSidebar,
  onEditSidebarItem,
  onOpenChange,
  open,
  roomNavigation,
}: KioskControlCenterProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isWide = useMediaQuery('(min-width: 768px)');
  const [activePanel, setActivePanel] = useState<KioskPanel>('navigate');
  const [mobilePanel, setMobilePanel] = useState<KioskPanel | 'index'>('index');
  const [isRoomWorkspaceOpen, setIsRoomWorkspaceOpen] = useState(false);
  const [isDashboardCreateOpen, setIsDashboardCreateOpen] = useState(false);
  const {
    activeCustomSidebarActionId,
    activeSection,
    setActiveCustomSidebarAction,
    setActiveSection,
  } = useNavigationStore(
    useShallow((state) => ({
      activeCustomSidebarActionId: state.activeCustomSidebarActionId,
      activeSection: state.activeSection,
      setActiveCustomSidebarAction: state.setActiveCustomSidebarAction,
      setActiveSection: state.setActiveSection,
    }))
  );
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const choresEnabled = useSettingsStore(settingsSelectors.choresEnabled);
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);
  const sectionItems = getSectionNavigationItems(t, choresEnabled);
  const customActionItems = (advancedCustomizationEnabled ? customSidebarActions : [])
    .filter((item) => isSidebarActionVisible(item, true))
    .map((item) => ({
      active:
        item.targetType === 'section'
          ? activeCustomSidebarActionId === null && item.targetSection === activeSection
          : item.targetType === 'iframe'
            ? activeCustomSidebarActionId === item.id
            : false,
      icon: getCustomExtensionIcon(item.icon),
      id: item.id,
      label: item.label,
      onSelect: () => {
        if (editActions?.isEditMode && onEditSidebarItem) {
          onEditSidebarItem(item.id);
          onOpenChange(false);
          return;
        }
        if (item.targetType === 'section' && item.targetSection) {
          setActiveSection(item.targetSection);
        } else if (item.targetType === 'iframe') {
          setActiveCustomSidebarAction(item.id);
        } else if (item.targetType === 'url' && item.targetUrl) {
          openCustomExtensionUrl(item.targetUrl);
        }
        onOpenChange(false);
      },
    }));

  const openSection = (section: Section) => {
    if (section === 'home') {
      setActiveSection('home');
      setActivePanel('navigate');
      if (!isWide) {
        setMobilePanel('navigate');
      }
      return;
    }
    setActiveSection(section);
    onOpenChange(false);
  };
  const openManageRooms = () => {
    onOpenChange(false);
    setIsRoomWorkspaceOpen(true);
  };
  const openCreateDashboard = () => {
    onOpenChange(false);
    setIsDashboardCreateOpen(true);
  };
  const exitKiosk = () => {
    updateSettings({ kioskMode: false });
    onOpenChange(false);
  };
  const selectedPanel = isWide ? activePanel : mobilePanel === 'index' ? 'navigate' : mobilePanel;
  const panelTitle =
    selectedPanel === 'customize'
      ? t('dashboard.roomNav.customize')
      : selectedPanel === 'behavior'
        ? t('dashboard.kiosk.behavior')
        : t('dashboard.kiosk.navigate');

  const renderPanel = () => {
    if (selectedPanel === 'customize') {
      return (
        <KioskCustomizePanel
          editActions={editActions}
          onCreateDashboard={openCreateDashboard}
          onCustomizeSidebar={onCustomizeSidebar}
          onManageRooms={openManageRooms}
          onOpenChange={onOpenChange}
        />
      );
    }
    if (selectedPanel === 'behavior') {
      return <KioskBehaviorPanel onExitKiosk={exitKiosk} />;
    }
    return (
      <KioskNavigatePanel
        onClose={() => onOpenChange(false)}
        onCreateDashboard={openCreateDashboard}
        roomNavigation={roomNavigation}
      />
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('dashboard.kiosk.openControlCenter')}
        aria-expanded={open}
        data-testid="kiosk-orbit-trigger"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'fixed right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-40',
          'flex h-12 w-12 items-center justify-center rounded-full border',
          'transition-[background-color,border-color,box-shadow,transform] motion-reduce:transition-none',
          'hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2',
          surface.panel,
          surface.border,
          surface.hoverBg,
          surface.cardShadow,
          'md:right-5 md:bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]'
        )}
        style={{ borderColor: `${accentColor}55` }}
      >
        <Compass className={cn(navetIconSizeTokens.sm, surface.textPrimary)} aria-hidden="true" />
      </button>

      <BaseCardDialog
        variant="fullscreen"
        isOpen={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setMobilePanel('index');
          }
        }}
        title={t('dashboard.kiosk.controlCenterTitle')}
        description={t('dashboard.kiosk.controlCenterDescription')}
        theme={theme}
        contentClassName={cn(
          'inset-0 rounded-none border-0 md:inset-4 md:rounded-[28px] md:border',
          surface.shellPanel,
          surface.border
        )}
        shellBodyClassName="h-full min-h-0"
      >
        <NavigationWorkspace.Frame
          className="h-full rounded-none border-0 bg-transparent shadow-none"
          data-testid="kiosk-orbit-menu"
          data-kiosk-control-center
        >
          <NavigationWorkspace.Header
            className="flex min-h-[calc(4.5rem+env(safe-area-inset-top,0px))] items-center justify-between gap-3 pb-3 pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:min-h-[4.5rem] md:px-5 md:py-3"
            data-kiosk-control-header
          >
            <div className="flex min-w-0 items-center gap-2">
              {!isWide && mobilePanel !== 'index' ? (
                <IconButton
                  variant="ghost"
                  label={t('dashboard.kiosk.backToMenu')}
                  icon={<ArrowLeft className={navetIconSizeTokens.sm} />}
                  onClick={() => setMobilePanel('index')}
                  className="min-h-11 min-w-11"
                />
              ) : null}
              <div className="min-w-0">
                <h1 className={cn(navetTypographyTokens.pageHeading, surface.textPrimary)}>
                  {!isWide && mobilePanel !== 'index'
                    ? panelTitle
                    : t('dashboard.kiosk.controlCenterTitle')}
                </h1>
                {isWide ? (
                  <p className={cn('mt-0.5 truncate text-sm', surface.textSecondary)}>
                    {t('dashboard.kiosk.controlCenterDescription')}
                  </p>
                ) : null}
              </div>
            </div>
            <IconButton
              variant="ghost"
              label={t('common.close')}
              icon={<X className={navetIconSizeTokens.sm} />}
              onClick={() => onOpenChange(false)}
              className="min-h-11 min-w-11"
            />
          </NavigationWorkspace.Header>

          <NavigationWorkspace.Body className={isWide ? 'grid-cols-[17rem_minmax(0,1fr)]' : ''}>
            {isWide ? (
              <NavigationWorkspace.Sidebar className="flex flex-col">
                <nav
                  aria-label={t('dashboard.kiosk.navigate')}
                  className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
                >
                  <h2
                    className={cn(
                      'mb-2 px-2 font-semibold',
                      navetTypographyTokens.caption,
                      surface.textMuted
                    )}
                  >
                    {t('dashboard.kiosk.navigate')}
                  </h2>
                  <div className="grid gap-1">
                    {sectionItems.map((item) => (
                      <KioskWorkspaceItem
                        key={item.section}
                        id={item.section}
                        icon={item.icon}
                        label={item.label}
                        active={
                          item.section === 'home'
                            ? activePanel === 'navigate'
                            : activeCustomSidebarActionId === null && activeSection === item.section
                        }
                        onSelect={() => openSection(item.section)}
                      />
                    ))}
                    {customActionItems.map((item) => (
                      <KioskWorkspaceItem key={item.id} {...item} />
                    ))}
                  </div>
                  <h2
                    className={cn(
                      'mt-5 mb-2 px-2 font-semibold',
                      navetTypographyTokens.caption,
                      surface.textMuted
                    )}
                  >
                    {t('dashboard.kiosk.manage')}
                  </h2>
                  <div className="grid gap-1">
                    {editActions?.reorderRooms ? (
                      <KioskWorkspaceItem
                        id="rooms"
                        icon={SlidersHorizontal}
                        label={t('dashboard.roomNav.reorder')}
                        onSelect={openManageRooms}
                      />
                    ) : null}
                    <KioskWorkspaceItem
                      id="customize"
                      icon={LayoutGrid}
                      label={t('dashboard.roomNav.customize')}
                      active={activePanel === 'customize'}
                      onSelect={() => setActivePanel('customize')}
                    />
                    <KioskWorkspaceItem
                      id="behavior"
                      icon={Settings2}
                      label={t('dashboard.kiosk.behavior')}
                      active={activePanel === 'behavior'}
                      onSelect={() => setActivePanel('behavior')}
                    />
                  </div>
                </nav>
                <div className={cn('border-t p-3', surface.border)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    leading={<LogOut className={navetIconSizeTokens.sm} />}
                    onClick={exitKiosk}
                  >
                    {t('dashboard.kiosk.exit')}
                  </Button>
                </div>
              </NavigationWorkspace.Sidebar>
            ) : null}

            <NavigationWorkspace.Content>
              {!isWide && mobilePanel === 'index' ? (
                <NavigationWorkspace.ScrollArea>
                  <nav
                    aria-label={t('dashboard.kiosk.controlCenterTitle')}
                    className="grid gap-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pl-[calc(env(safe-area-inset-left,0px)+0.75rem)] pr-[calc(env(safe-area-inset-right,0px)+0.75rem)] pt-4 md:px-3 md:py-4"
                  >
                    <KioskMobileIndexGroup>
                      {sectionItems.map((item) => (
                        <KioskMobileIndexItem
                          key={item.section}
                          id={item.section}
                          icon={item.icon}
                          label={item.label}
                          onSelect={() => openSection(item.section)}
                        />
                      ))}
                    </KioskMobileIndexGroup>
                    {customActionItems.length > 0 ? (
                      <KioskMobileIndexGroup label={t('dashboard.kiosk.customSections')}>
                        {customActionItems.map((item) => (
                          <KioskMobileIndexItem key={item.id} {...item} />
                        ))}
                      </KioskMobileIndexGroup>
                    ) : null}
                    <KioskMobileIndexGroup label={t('dashboard.kiosk.manage')}>
                      {[
                        ...(editActions?.reorderRooms
                          ? [
                              <KioskMobileIndexItem
                                key="rooms"
                                id="rooms"
                                icon={SlidersHorizontal}
                                label={t('dashboard.roomNav.reorder')}
                                onSelect={openManageRooms}
                              />,
                            ]
                          : []),
                        <KioskMobileIndexItem
                          key="customize"
                          id="customize"
                          icon={LayoutGrid}
                          label={t('dashboard.roomNav.customize')}
                          onSelect={() => setMobilePanel('customize')}
                        />,
                        <KioskMobileIndexItem
                          key="behavior"
                          id="behavior"
                          icon={Settings2}
                          label={t('dashboard.kiosk.behavior')}
                          onSelect={() => setMobilePanel('behavior')}
                        />,
                        <KioskMobileIndexItem
                          key="exit"
                          id="exit"
                          icon={LogOut}
                          label={t('dashboard.kiosk.exit')}
                          onSelect={exitKiosk}
                        />,
                      ]}
                    </KioskMobileIndexGroup>
                  </nav>
                </NavigationWorkspace.ScrollArea>
              ) : (
                <NavigationWorkspace.ScrollArea className="pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pl-[calc(env(safe-area-inset-left,0px)+1rem)] pr-[calc(env(safe-area-inset-right,0px)+1rem)] pt-5 md:px-6 md:py-6 lg:px-8">
                  <div className="mx-auto max-w-5xl">{renderPanel()}</div>
                </NavigationWorkspace.ScrollArea>
              )}
            </NavigationWorkspace.Content>
          </NavigationWorkspace.Body>
        </NavigationWorkspace.Frame>
      </BaseCardDialog>

      {editActions?.reorderRooms ? (
        <RoomOrderDialog
          isOpen={isRoomWorkspaceOpen}
          onOpenChange={setIsRoomWorkspaceOpen}
          rooms={editActions.reorderRooms.rooms}
          hiddenRoomNames={editActions.reorderRooms.hiddenRoomNames}
          manageableRooms={editActions.reorderRooms.manageableRooms}
          roomHiddenItemCounts={editActions.reorderRooms.roomHiddenItemCounts}
          roomEntityCounts={editActions.reorderRooms.roomItemCounts}
          dashboardEntityIds={editActions.reorderRooms.dashboardEntityIds}
          dashboardVisibleEntityIds={editActions.reorderRooms.dashboardVisibleEntityIds}
          onRoomOrderChange={editActions.reorderRooms.onRoomOrderChange}
          onHiddenRoomsChange={editActions.reorderRooms.onHiddenRoomsChange}
        />
      ) : null}
      <DashboardCreateDialog
        isOpen={isDashboardCreateOpen}
        onOpenChange={setIsDashboardCreateOpen}
      />
    </>
  );
});
