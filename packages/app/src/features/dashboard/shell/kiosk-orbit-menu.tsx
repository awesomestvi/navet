import type { MobileHeaderEditActions } from '@navet/app/components/layout/mobile-header-actions';
import type { MobileRoomNavigation } from '@navet/app/components/layout/mobile-room-dropdown';
import { getVisibleRoomNavRooms } from '@navet/app/components/layout/room-nav.utils';
import { RoomOrderDialog } from '@navet/app/components/layout/room-order-dialog';
import { getSectionNavigationItems } from '@navet/app/components/layout/section-navigation';
import { InteractivePill, SheetSurfaceHeader } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { getDashboardRoomLabel } from '@navet/app/constants/rooms';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import {
  ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT,
  getCustomExtensionIcon,
  isSidebarActionVisible,
  openCustomExtensionUrl,
} from '@navet/app/utils/custom-extensions';
import {
  Check,
  Compass,
  LayoutGrid,
  Lightbulb,
  type LucideIcon,
  Pencil,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { memo, type ReactNode, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AllViewGrouping } from '../all-view-grid/types';

interface KioskOrbitMenuProps {
  editActions?: MobileHeaderEditActions;
  onEditSidebarItem?: (id: string) => void;
  onCustomizeSidebar?: () => void;
  roomNavigation?: MobileRoomNavigation;
}

const GROUPING_OPTIONS: Array<{ labelKey: TranslationKey; value: AllViewGrouping }> = [
  { labelKey: 'dashboard.roomNav.grouping.custom', value: 'custom' },
  { labelKey: 'dashboard.roomNav.grouping.room', value: 'room' },
  { labelKey: 'dashboard.roomNav.grouping.type', value: 'type' },
  { labelKey: 'dashboard.roomNav.grouping.none', value: 'none' },
];

export const KioskOrbitMenu = memo(function KioskOrbitMenu({
  editActions,
  onEditSidebarItem,
  onCustomizeSidebar,
  roomNavigation,
}: KioskOrbitMenuProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const roomDropdownItemClassName = cn(
    'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors',
    surface.textPrimary,
    surface.hoverBg
  );
  const sectionItems = getSectionNavigationItems(t);
  const [isOpen, setIsOpen] = useState(false);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const {
    activeCustomSidebarActionId,
    activeSection,
    setActiveSection,
    setActiveCustomSidebarAction,
  } = useNavigationStore(
    useShallow((state) => ({
      activeCustomSidebarActionId: state.activeCustomSidebarActionId,
      activeSection: state.activeSection,
      setActiveSection: state.setActiveSection,
      setActiveCustomSidebarAction: state.setActiveCustomSidebarAction,
    }))
  );
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
  const customizeSidebarDisabled =
    customSidebarActions.length >= ADVANCED_CUSTOM_SIDEBAR_ACTION_LIMIT;
  const visibleRooms =
    activeSection === 'home' && roomNavigation
      ? getVisibleRoomNavRooms(
          roomNavigation.rooms.filter(
            (room) => !(roomNavigation.hiddenRoomNames ?? []).includes(room)
          )
        )
      : [];
  const showRooms = visibleRooms.length > 0;
  const showGroupBy =
    editActions?.isEditMode &&
    editActions.allViewGrouping !== undefined &&
    editActions.onAllViewGroupingChange !== undefined;

  const closeAfter = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const openReorderDialog = () => {
    setIsOpen(false);
    setIsReorderDialogOpen(true);
  };
  const customActionItems = (advancedCustomizationEnabled ? customSidebarActions : [])
    .filter((item) => isSidebarActionVisible(item, true))
    .map((item) => ({
      id: item.id,
      active:
        item.targetType === 'section'
          ? activeCustomSidebarActionId === null && item.targetSection === activeSection
          : item.targetType === 'iframe'
            ? activeCustomSidebarActionId === item.id
            : false,
      icon: getCustomExtensionIcon(item.icon),
      label: item.label,
      onClick: () => {
        if (editActions?.isEditMode && onEditSidebarItem) {
          onEditSidebarItem(item.id);
          return;
        }

        if (item.targetType === 'section' && item.targetSection) {
          const targetSection = item.targetSection;
          closeAfter(() => setActiveSection(targetSection));
          return;
        }

        if (item.targetType === 'iframe') {
          closeAfter(() => setActiveCustomSidebarAction(item.id));
          return;
        }

        if (item.targetType === 'url' && item.targetUrl) {
          const targetUrl = item.targetUrl;
          closeAfter(() => openCustomExtensionUrl(targetUrl));
        }
      },
    }));

  return (
    <>
      <div
        data-testid="kiosk-orbit-menu"
        className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-2 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:px-5 md:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
      >
        {isOpen ? (
          <div
            className={`w-[min(72rem,calc(100vw-1.5rem))] rounded-[28px] border p-3 md:p-4 ${surface.panel} ${surface.border} ${surface.cardShadow}`}
          >
            <div className="space-y-3">
              <SheetSurfaceHeader
                title={t('sidebar.orbitTitle')}
                closeLabel={t('common.close')}
                onClose={() => setIsOpen(false)}
                endAccessory={
                  editActions ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <OrbitActionButton
                        active={editActions.isEditMode}
                        compact
                        icon={editActions.isEditMode ? Check : LayoutGrid}
                        label={
                          editActions.isEditMode
                            ? t('dashboard.roomNav.doneEditing')
                            : t('dashboard.roomNav.customize')
                        }
                        onClick={editActions.onToggleEditMode}
                      />
                      {editActions.isEditMode && editActions.onAddEntity ? (
                        <OrbitActionButton
                          compact
                          icon={Lightbulb}
                          label={editActions.addEntityLabel ?? t('dashboard.addEntity.title')}
                          onClick={() => closeAfter(editActions.onAddEntity ?? (() => {}))}
                        />
                      ) : null}
                      {editActions.isEditMode && editActions.reorderRooms ? (
                        <OrbitActionButton
                          compact
                          icon={SlidersHorizontal}
                          label={t('dashboard.roomNav.reorder')}
                          onClick={openReorderDialog}
                        />
                      ) : null}
                    </div>
                  ) : null
                }
              />
              <div className="grid gap-3">
                <section className="min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    {sectionItems.map(({ icon: Icon, label, section }) => (
                      <OrbitCompactActionButton
                        key={section}
                        active={activeCustomSidebarActionId === null && activeSection === section}
                        ariaCurrent={
                          activeCustomSidebarActionId === null && activeSection === section
                            ? 'page'
                            : undefined
                        }
                        icon={Icon}
                        label={label}
                        onClick={() => closeAfter(() => setActiveSection(section))}
                      />
                    ))}
                    {customActionItems.map((item) => (
                      <OrbitCompactActionButton
                        key={item.id}
                        active={item.active}
                        ariaCurrent={item.active ? 'page' : undefined}
                        editable={editActions?.isEditMode}
                        icon={item.icon}
                        label={item.label}
                        onClick={item.onClick}
                      />
                    ))}
                    {editActions?.isEditMode && onCustomizeSidebar ? (
                      <OrbitCompactActionButton
                        icon={Plus}
                        label="Customize sidebar"
                        onClick={onCustomizeSidebar}
                        disabled={customizeSidebarDisabled}
                      />
                    ) : null}
                  </div>
                </section>

                {showRooms ? (
                  <OrbitMegaSection title={t('dashboard.roomNav.openRooms')}>
                    <div
                      data-testid="kiosk-orbit-room-grid"
                      className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                    >
                      {visibleRooms.map((room) => {
                        const label = getDashboardRoomLabel(room, t('dashboard.roomNav.all'));
                        const isActive = roomNavigation?.activeRoom === room;

                        return (
                          <button
                            key={room}
                            type="button"
                            onClick={() =>
                              closeAfter(() => {
                                roomNavigation?.onRoomChange(room);
                              })
                            }
                            className={cn(
                              roomDropdownItemClassName,
                              isActive && 'room-nav-item-active'
                            )}
                          >
                            <span className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="truncate">{label}</span>
                            </span>
                            {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </OrbitMegaSection>
                ) : null}

                {editActions ? (
                  <div className="grid gap-2">
                    {showGroupBy ? (
                      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                        {GROUPING_OPTIONS.map((option) => {
                          const isActive = editActions.allViewGrouping === option.value;

                          return (
                            <InteractivePill
                              key={option.value}
                              active={isActive}
                              intent="navigation"
                              size="compact"
                              onClick={() =>
                                closeAfter(() => {
                                  editActions.onAllViewGroupingChange?.(option.value);
                                })
                              }
                              className="w-full justify-start"
                            >
                              <span className="truncate">{t(option.labelKey)}</span>
                            </InteractivePill>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label={t('sidebar.orbitTitle')}
          aria-expanded={isOpen}
          data-testid="kiosk-orbit-trigger"
          onClick={() => setIsOpen((open) => !open)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[background-color,border-color,box-shadow,transform] hover:scale-[1.03] ${surface.panel} ${surface.border} ${surface.hoverBg} ${surface.cardShadow}`}
          style={
            isOpen
              ? {
                  borderColor: `${accentColor}55`,
                  boxShadow: `0 16px 32px -26px ${accentColor}, 0 12px 28px -24px rgba(0,0,0,0.62)`,
                }
              : undefined
          }
        >
          <Compass className={`h-4.5 w-4.5 ${isOpen ? 'text-current' : surface.textSecondary}`} />
        </button>
      </div>

      {editActions?.reorderRooms ? (
        <RoomOrderDialog
          isOpen={isReorderDialogOpen}
          onOpenChange={setIsReorderDialogOpen}
          rooms={editActions.reorderRooms.rooms}
          hiddenRoomNames={editActions.reorderRooms.hiddenRoomNames}
          manageableRooms={editActions.reorderRooms.manageableRooms}
          roomHiddenItemCounts={editActions.reorderRooms.roomHiddenItemCounts}
          roomEntityCounts={editActions.reorderRooms.roomItemCounts}
          onRoomOrderChange={editActions.reorderRooms.onRoomOrderChange}
          onHiddenRoomsChange={editActions.reorderRooms.onHiddenRoomsChange}
        />
      ) : null}
    </>
  );
});

function OrbitMegaSection({ title, children }: { title: string; children: ReactNode }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section className={`rounded-[22px] border p-3 ${surface.subtleBg} ${surface.border}`}>
      <div className={`mb-3 text-sm font-medium tracking-tight ${surface.textPrimary}`}>
        {title}
      </div>
      {children}
    </section>
  );
}

function OrbitCompactActionButton({
  active = false,
  ariaCurrent,
  disabled = false,
  editable = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  ariaCurrent?: 'page';
  disabled?: boolean;
  editable?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = icon;

  return (
    <button
      type="button"
      aria-current={ariaCurrent}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-13 min-w-[10rem] basis-[11rem] items-center gap-2.5 rounded-[18px] border px-3 py-2 text-left transition-[background-color,border-color,box-shadow] ${
        active
          ? `${surface.panel} ${surface.borderStrong} ${surface.cardShadow}`
          : `${surface.subtleBg} ${surface.border} ${surface.hoverBg}`
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className={`rounded-xl border p-2 ${surface.border} ${surface.subtleBg}`}>
        <Icon className={`h-3.5 w-3.5 ${active ? surface.textPrimary : surface.textSecondary}`} />
      </div>
      <div className={`min-w-0 truncate text-sm font-medium tracking-tight ${surface.textPrimary}`}>
        {label}
      </div>
      {editable ? <Pencil className={`ml-auto h-3.5 w-3.5 shrink-0 ${surface.textMuted}`} /> : null}
    </button>
  );
}

function OrbitActionButton({
  active = false,
  compact = false,
  ariaCurrent,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  compact?: boolean;
  ariaCurrent?: 'page';
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <InteractivePill
      type="button"
      active={active}
      icon={icon}
      intent="navigation"
      size="small"
      aria-current={ariaCurrent}
      onClick={onClick}
      className={compact ? 'w-fit min-w-0 justify-start self-start pr-4' : 'w-full justify-start'}
    >
      <span className="truncate">{label}</span>
    </InteractivePill>
  );
}
