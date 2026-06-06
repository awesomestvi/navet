import { CardEmptyState } from '@navet/app/components/patterns';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useAreaRooms, useI18n, useProviderBatterySensorRows, useTheme } from '@navet/app/hooks';
import { Battery, Settings2 } from 'lucide-react';
import { type KeyboardEvent, lazy, memo, Suspense, useEffect, useMemo, useState } from 'react';
import { BatteryList, getLevelColor } from './battery-list';
import { useDashboardWidgetRoomOptions } from './use-widget-room-options';

const BatterySettingsDialog = lazy(async () => {
  const module = await import('./battery-settings-dialog');
  return { default: module.BatterySettingsDialog };
});

export interface BatteryOverviewWidgetData {
  selectedEntityIds?: string[];
  tintColor?: string;
}

interface BatteryOverviewWidgetProps {
  size?: CardSize;
  data?: BatteryOverviewWidgetData;
  onUpdate?: (data: BatteryOverviewWidgetData) => void;
  isEditMode?: boolean;
  room?: string;
  onRoomChange?: (room: string) => void;
  openSettingsRequestKey?: number;
}

function getSelectedEntityIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export const BatteryOverviewWidget = memo(function BatteryOverviewWidget({
  size = 'large',
  data,
  onUpdate,
  isEditMode = false,
  room,
  onRoomChange,
  openSettingsRequestKey = 0,
}: BatteryOverviewWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const surface = getThemeSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const rooms = useAreaRooms();
  const batteries = useProviderBatterySensorRows();
  const selectedEntityIds = getSelectedEntityIds(data?.selectedEntityIds);
  const selectedIdSet = useMemo(() => new Set(selectedEntityIds ?? []), [selectedEntityIds]);
  const filteredBatteries = useMemo(
    () =>
      selectedEntityIds === undefined
        ? batteries
        : batteries.filter((battery) => selectedIdSet.has(battery.id)),
    [batteries, selectedEntityIds, selectedIdSet]
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chromeSize = size === 'large' ? 'medium' : size;
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);

  const isCompact = isCompactCardSize(size);
  const accentHex = getThemeColorValue(primaryColor);
  const subtleFill =
    tintSurface.subtleFill ??
    (theme === 'light'
      ? '#f3f4f6'
      : theme === 'black'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.08)');

  useEffect(() => {
    if (!isEditMode) {
      setIsSettingsOpen(false);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (openSettingsRequestKey > 0 && onUpdate) {
      setIsSettingsOpen(true);
    }
  }, [onUpdate, openSettingsRequestKey]);

  const handleSelectionChange = (nextSelectedEntityIds: string[]) => {
    onUpdate?.({ selectedEntityIds: nextSelectedEntityIds });
  };

  const emptyStateLabel =
    batteries.length === 0
      ? t('widgets.battery.noBatteries')
      : selectedEntityIds !== undefined
        ? t('widgets.battery.noSelectedBatteries')
        : t('widgets.battery.noBatteries');
  const emptyStateDescription =
    batteries.length === 0
      ? t('widgets.battery.settings.noneAvailable')
      : t('widgets.battery.settings.help');
  const isEmpty = filteredBatteries.length === 0;
  const canOpenSettingsFromCard = Boolean(onUpdate) && !isEmpty;
  const openSettings = () => setIsSettingsOpen(true);
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openSettings();
    }
  };

  return (
    <div className="h-full">
      <BaseCard
        size={size}
        role={canOpenSettingsFromCard ? 'button' : undefined}
        tabIndex={canOpenSettingsFromCard ? 0 : undefined}
        aria-label={
          canOpenSettingsFromCard
            ? t('entityCardInteraction.openSettings', { name: t('widgets.battery.title') })
            : undefined
        }
        onClick={canOpenSettingsFromCard ? openSettings : undefined}
        onKeyDown={canOpenSettingsFromCard ? handleCardKeyDown : undefined}
        interactive={canOpenSettingsFromCard}
        fullBleed
        className="transition-all duration-500"
        style={tintSurface.panelStyle}
        frameClassName="overflow-hidden"
        overlay={
          <>
            {tintSurface.glowStyle ? (
              <div className="pointer-events-none absolute inset-0" style={tintSurface.glowStyle} />
            ) : null}
            {tintSurface.overlayClassName ? (
              <div
                className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`}
              />
            ) : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative flex h-full min-w-0 flex-col p-3">
          {isEmpty ? (
            <CardEmptyState
              title={emptyStateLabel}
              description={emptyStateDescription}
              icon={Battery}
              actionLabel={onUpdate ? t('widgets.battery.settings.title') : undefined}
              onAction={onUpdate ? openSettings : undefined}
              actionIcon={onUpdate ? Settings2 : undefined}
              size={size}
              accentColor={tintColor ?? accentHex}
            />
          ) : (
            <>
              <EntityCardHeader
                title={t('widgets.battery.title')}
                subtitle={t('widgets.common.widget')}
                layout="eyebrow-first"
                size={chromeSize}
                titleClassName={surface.textPrimary}
                subtitleClassName={surface.textMuted}
                leading={
                  <EntityCardHeaderIcon IconComponent={Battery} isActive size={chromeSize} />
                }
              />
              <BatteryList
                devices={filteredBatteries}
                isCompact={isCompact}
                subtleFill={subtleFill}
                textSecondary={surface.textSecondary}
                emptyStateLabel={emptyStateLabel}
                getLevelColor={(level) => getLevelColor(level, accentHex)}
              />
            </>
          )}
        </div>
      </BaseCard>
      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <BatterySettingsDialog
            batteries={batteries}
            isOpen={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
            selectedEntityIds={selectedEntityIds}
            onSelectionChange={handleSelectionChange}
            roomValue={roomValue}
            roomLabel={roomLabel}
            roomOptions={roomOptions}
            onRoomChange={onRoomChange}
            tintColor={tintColor}
            onTintColorChange={(nextTintColor) =>
              onUpdate?.({ ...(data ?? {}), tintColor: nextTintColor })
            }
          />
        </Suspense>
      ) : null}
    </div>
  );
});
