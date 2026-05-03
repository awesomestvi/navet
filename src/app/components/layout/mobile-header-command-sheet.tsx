import { Bell, Check, Edit3, GripVertical, LayoutGrid, Lightbulb } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Button, SheetSurface } from '@/app/components/primitives';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import type { AllViewGrouping } from '@/app/features/dashboard';
import { useTheme } from '@/app/hooks';
import type { MobileHeaderEditActions } from './mobile-header-actions';
import { getMobileHeaderActionAvailability } from './mobile-layout-helpers';
import { RoomOrderDialog } from './room-order-dialog';
import type { HeaderController } from './use-header-controller';

interface MobileHeaderCommandSheetProps {
  controller: HeaderController;
  actions?: MobileHeaderEditActions;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenNotifications: () => void;
}

export const MobileHeaderCommandSheet = memo(function MobileHeaderCommandSheet({
  controller,
  actions,
  isOpen,
  onOpenChange,
  onOpenNotifications,
}: MobileHeaderCommandSheetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = controller;
  const surface = getThemeSurfaceTokens(theme);
  const accentColor = getThemeColorValue(primaryColor);
  const availability = useMemo(() => getMobileHeaderActionAvailability(actions), [actions]);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);
  const allViewGroupingOptions: Array<{ label: string; value: AllViewGrouping }> = [
    { label: t('dashboard.roomNav.grouping.custom'), value: 'custom' },
    { label: t('dashboard.roomNav.grouping.room'), value: 'room' },
    { label: t('dashboard.roomNav.grouping.type'), value: 'type' },
    { label: t('dashboard.roomNav.grouping.none'), value: 'none' },
  ];

  const openNotifications = () => {
    onOpenChange(false);
    onOpenNotifications();
  };

  const toggleEditMode = () => {
    availability?.onToggleEditMode();
    onOpenChange(false);
  };

  const openReorderDialog = () => {
    onOpenChange(false);
    setIsReorderDialogOpen(true);
  };

  const handleAddEntity = () => {
    availability?.onAddEntity?.();
    onOpenChange(false);
  };

  const notificationLabel =
    controller.unreadCount > 0
      ? `${t('notifications.title')} · ${controller.unreadCount}`
      : t('notifications.title');

  return (
    <>
      <SheetSurface
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        title={t('common.moreActions')}
        description={t('common.moreActions')}
        accentColor={accentColor}
        overlayClassName={`animate-in fade-in bg-black/45 backdrop-blur-[2px] md:hidden ${surface.dialogBackdrop}`}
        contentClassName={`${surface.panel} ${surface.border}`}
        bodyClassName="px-4"
      >
        <div className="space-y-3 pb-1">
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="min-w-0">
              <p
                className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
              >
                {t('common.moreActions')}
              </p>
              <p className={`mt-1 text-base font-semibold ${surface.textPrimary}`}>
                {availability?.isEditMode
                  ? t('dashboard.roomNav.doneEditing')
                  : t('dashboard.roomNav.customize')}
              </p>
            </div>
            {controller.unreadCount > 0 ? (
              <div
                className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {controller.unreadCount}
              </div>
            ) : null}
          </div>

          {availability ? (
            <button
              type="button"
              onClick={toggleEditMode}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[24px] border px-4 py-4 text-left transition-colors',
                availability.isEditMode
                  ? 'border-transparent text-white shadow-[0_18px_36px_-24px_rgba(0,0,0,0.45)]'
                  : `${surface.border} ${surface.hoverBg} ${surface.textPrimary}`
              )}
              style={availability.isEditMode ? { backgroundColor: accentColor } : undefined}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px]',
                    availability.isEditMode ? 'bg-white/16' : surface.subtleBg
                  )}
                >
                  {availability.isEditMode ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <Edit3 className={`h-5 w-5 ${surface.textSecondary}`} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {availability.isEditMode
                      ? t('dashboard.roomNav.doneEditing')
                      : t('dashboard.roomNav.customize')}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-xs',
                      availability.isEditMode ? 'text-white/74' : surface.textSecondary
                    )}
                  >
                    {availability.isEditMode
                      ? t('dashboard.roomNav.reorderDialog.description')
                      : t('common.moreActions')}
                  </span>
                </span>
              </span>
            </button>
          ) : null}

          <div className="space-y-2">
            <MobileHeaderSheetAction
              icon={Bell}
              label={t('notifications.title')}
              detail={notificationLabel}
              onClick={openNotifications}
            />

            {availability?.isEditMode && availability.onAddEntity ? (
              <MobileHeaderSheetAction
                icon={Lightbulb}
                label={availability.addEntityLabel ?? t('dashboard.addEntity.title')}
                detail={t('dashboard.roomNav.add')}
                onClick={handleAddEntity}
              />
            ) : null}

            {availability?.isEditMode && availability.reorderRooms ? (
              <MobileHeaderSheetAction
                icon={GripVertical}
                label={t('dashboard.roomNav.reorder')}
                detail={t('dashboard.roomNav.reorderDialog.title')}
                onClick={openReorderDialog}
              />
            ) : null}
          </div>

          {availability?.showAllViewGrouping ? (
            <section className="space-y-2 pt-1">
              <div>
                <p
                  className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                >
                  {t('dashboard.roomNav.groupBy')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allViewGroupingOptions.map((option) => {
                  const isActive = availability.allViewGrouping === option.value;

                  return (
                    <Button
                      key={option.value}
                      variant={isActive ? 'primary' : 'secondary'}
                      size="small"
                      onClick={() => availability.onAllViewGroupingChange?.(option.value)}
                      className={cn(
                        'justify-start rounded-[18px] text-left',
                        !isActive && surface.textPrimary
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <LayoutGrid className="h-4 w-4 shrink-0" />
                        <span className="truncate">{option.label}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </SheetSurface>

      {availability?.reorderRooms ? (
        <RoomOrderDialog
          isOpen={isReorderDialogOpen}
          onOpenChange={setIsReorderDialogOpen}
          rooms={availability.reorderRooms.rooms}
          areas={availability.reorderRooms.areas}
          roomHiddenItemCounts={availability.reorderRooms.roomHiddenItemCounts}
          roomEntityCounts={availability.reorderRooms.roomItemCounts}
          onRoomOrderChange={availability.reorderRooms.onRoomOrderChange}
        />
      ) : null}
    </>
  );
});

function MobileHeaderSheetAction({
  detail,
  icon: Icon,
  label,
  onClick,
}: {
  detail: string;
  icon: typeof Bell;
  label: string;
  onClick: () => void;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-colors ${surface.border} ${surface.hoverBg}`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] ${surface.subtleBg}`}
      >
        <Icon className={`h-[1.125rem] w-[1.125rem] ${surface.textSecondary}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${surface.textPrimary}`}>
          {label}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${surface.textSecondary}`}>{detail}</span>
      </span>
    </button>
  );
}
