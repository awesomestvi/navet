import type { MobileHeaderEditActions } from '@navet/app/components/layout/mobile-header-actions';
import type { MobileRoomNavigation } from '@navet/app/components/layout/mobile-room-dropdown';
import { getVisibleRoomNavRooms } from '@navet/app/components/layout/room-nav.utils';
import { RoomOrderDialog } from '@navet/app/components/layout/room-order-dialog';
import { InteractivePill, SheetSurfaceHeader } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getDashboardRoomLabel } from '@navet/app/constants/rooms';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslationKey } from '@navet/app/i18n';
import type { Section } from '@navet/app/navigation/sections';
import { useNavigationStore, useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import {
  getCustomExtensionIcon,
  isSidebarActionVisible,
  openCustomExtensionUrl,
} from '@navet/app/utils/custom-extensions';
import {
  Check,
  Compass,
  Home,
  LayoutGrid,
  Lightbulb,
  type LucideIcon,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { memo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { AllViewGrouping } from '../all-view-grid/types';

interface KioskOrbitMenuProps {
  editActions?: MobileHeaderEditActions;
  roomNavigation?: MobileRoomNavigation;
}

const SECTION_ITEMS: Array<{
  icon: LucideIcon;
  labelKey: 'sidebar.home' | 'sidebar.settings';
  section: Extract<Section, 'home' | 'settings'>;
}> = [
  { icon: Home, labelKey: 'sidebar.home', section: 'home' },
  { icon: Settings, labelKey: 'sidebar.settings', section: 'settings' },
];

const GROUPING_OPTIONS: Array<{ labelKey: TranslationKey; value: AllViewGrouping }> = [
  { labelKey: 'dashboard.roomNav.grouping.custom', value: 'custom' },
  { labelKey: 'dashboard.roomNav.grouping.room', value: 'room' },
  { labelKey: 'dashboard.roomNav.grouping.type', value: 'type' },
  { labelKey: 'dashboard.roomNav.grouping.none', value: 'none' },
];

export const KioskOrbitMenu = memo(function KioskOrbitMenu({
  editActions,
  roomNavigation,
}: KioskOrbitMenuProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [isOpen, setIsOpen] = useState(false);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const { activeSection, setActiveSection } = useNavigationStore(
    useShallow((state) => ({
      activeSection: state.activeSection,
      setActiveSection: state.setActiveSection,
    }))
  );
  const advancedCustomizationEnabled = useSettingsStore(
    settingsSelectors.advancedCustomizationEnabled
  );
  const customSidebarActions = useSettingsStore(settingsSelectors.customSidebarActions);
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
  const showEditActions = Boolean(
    editActions?.isEditMode && (editActions.onAddEntity || editActions.reorderRooms || showGroupBy)
  );

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
      active: item.targetType === 'section' && item.targetSection === activeSection,
      icon: getCustomExtensionIcon(item.icon),
      label: item.label,
      onClick: () => {
        if (item.targetType === 'section' && item.targetSection) {
          const targetSection = item.targetSection;
          closeAfter(() => setActiveSection(targetSection));
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
            className={`w-[min(22rem,calc(100vw-1.5rem))] rounded-[26px] border p-3 ${surface.panel} ${surface.border} ${surface.cardShadow}`}
          >
            <div className="space-y-3">
              <SheetSurfaceHeader
                eyebrow={t('sidebar.orbit')}
                title={t('sidebar.orbitTitle')}
                closeLabel={t('common.close')}
                onClose={() => setIsOpen(false)}
              />

              <section>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_ITEMS.map(({ icon: Icon, labelKey, section }) => (
                    <OrbitActionButton
                      key={section}
                      active={activeSection === section}
                      icon={Icon}
                      label={t(labelKey)}
                      onClick={() => closeAfter(() => setActiveSection(section))}
                    />
                  ))}
                </div>
              </section>

              {showRooms ? (
                <section className="space-y-2">
                  <OrbitSectionLabel>{t('dashboard.roomNav.openRooms')}</OrbitSectionLabel>
                  <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                    {visibleRooms.map((room) => {
                      const label = getDashboardRoomLabel(room, t('dashboard.roomNav.all'));
                      const isActive = roomNavigation?.activeRoom === room;

                      return (
                        <InteractivePill
                          key={room}
                          active={isActive}
                          intent="navigation"
                          size="small"
                          onClick={() =>
                            closeAfter(() => {
                              roomNavigation?.onRoomChange(room);
                            })
                          }
                          className="max-w-full"
                        >
                          <span className="truncate">{label}</span>
                        </InteractivePill>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {customActionItems.length > 0 ? (
                <section className="space-y-2">
                  <OrbitSectionLabel>Custom extensions</OrbitSectionLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {customActionItems.map((item) => (
                      <OrbitActionButton
                        key={item.id}
                        active={item.active}
                        icon={item.icon}
                        label={item.label}
                        onClick={item.onClick}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {editActions ? (
                <section className="space-y-2">
                  <OrbitSectionLabel>{t('common.moreActions')}</OrbitSectionLabel>
                  <div className="grid gap-2">
                    <OrbitActionButton
                      active={editActions.isEditMode}
                      icon={editActions.isEditMode ? Check : LayoutGrid}
                      label={
                        editActions.isEditMode
                          ? t('dashboard.roomNav.doneEditing')
                          : t('dashboard.roomNav.customize')
                      }
                      onClick={() => closeAfter(editActions.onToggleEditMode)}
                    />

                    {showEditActions ? (
                      <div className="grid grid-cols-2 gap-2">
                        {editActions.onAddEntity ? (
                          <OrbitActionButton
                            icon={Lightbulb}
                            label={editActions.addEntityLabel ?? t('dashboard.addEntity.title')}
                            onClick={() => closeAfter(editActions.onAddEntity ?? (() => {}))}
                          />
                        ) : null}
                        {editActions.reorderRooms ? (
                          <OrbitActionButton
                            icon={SlidersHorizontal}
                            label={t('dashboard.roomNav.reorder')}
                            onClick={openReorderDialog}
                          />
                        ) : null}
                      </div>
                    ) : null}

                    {showGroupBy ? (
                      <div className="grid grid-cols-2 gap-1.5">
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
                </section>
              ) : null}
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
          roomDescriptors={editActions.reorderRooms.roomDescriptors}
          roomHiddenItemCounts={editActions.reorderRooms.roomHiddenItemCounts}
          roomEntityCounts={editActions.reorderRooms.roomItemCounts}
          onRoomOrderChange={editActions.reorderRooms.onRoomOrderChange}
          onHiddenRoomsChange={editActions.reorderRooms.onHiddenRoomsChange}
        />
      ) : null}
    </>
  );
});

function OrbitSectionLabel({ children }: { children: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
      {children}
    </p>
  );
}

function OrbitActionButton({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
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
      onClick={onClick}
      className="w-full justify-start"
    >
      <span className="truncate">{label}</span>
    </InteractivePill>
  );
}
