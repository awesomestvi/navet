import { Battery, Palette, Sliders } from 'lucide-react';
import { memo, useEffect, useId, useMemo, useState } from 'react';
import {
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
  SelectableCheckboxRow,
} from '@/app/components/patterns';
import {
  BaseCard,
  Button,
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { CompactRoomSelector, CustomCardTintPicker } from '@/app/components/shared/device-editor';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard/stores/custom-cards-store';
import { useAreaRooms, useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import type { HaBatterySensorRow } from '@/app/hooks/ha-battery-sensor-rows';
import {
  haBatterySensorRowsEqual,
  selectBatterySensorRowsFromHa,
} from '@/app/hooks/ha-battery-sensor-rows';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

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
}

interface BatteryLevelIconProps {
  level: number;
  color: string;
  className?: string;
}

function BatteryLevelIcon({ level, color, className }: BatteryLevelIconProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const fillWidth = (clampedLevel / 100) * 11;
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2.25" y="5" width="14.5" height="10" rx="2.25" stroke={color} strokeWidth="1.5" />
      <rect x="17.25" y="8" width="1.75" height="4" rx="0.75" fill={color} />
      <defs>
        <clipPath id={maskId}>
          <rect x="4" y="6.75" width={fillWidth} height="6.5" rx="1.1" />
        </clipPath>
      </defs>
      <rect
        x="4"
        y="6.75"
        width="11"
        height="6.5"
        rx="1.1"
        fill={color}
        opacity={clampedLevel <= 20 ? 0.28 : 0.18}
      />
      <rect
        x="4"
        y="6.75"
        width="11"
        height="6.5"
        rx="1.1"
        fill={color}
        clipPath={`url(#${maskId})`}
      />
    </svg>
  );
}

function getSelectedEntityIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

interface BatterySettingsDialogProps {
  batteries: HaBatterySensorRow[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntityIds?: string[];
  onSelectionChange?: (selectedEntityIds: string[]) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function BatterySettingsDialog({
  batteries,
  isOpen,
  onOpenChange,
  selectedEntityIds,
  onSelectionChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  tintColor,
  onTintColorChange,
}: BatterySettingsDialogProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      maxWidth: 'md',
      padding: false,
      height: 'capped',
    }
  );
  const effectiveSelectedIds = useMemo(
    () => selectedEntityIds ?? batteries.map((battery) => battery.id),
    [batteries, selectedEntityIds]
  );
  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');

  const updateSelection = (nextSelectedIds: string[]) => {
    onSelectionChange?.(nextSelectedIds);
  };

  const handleToggle = (batteryId: string) => {
    if (!onSelectionChange) {
      return;
    }

    const nextSelectedIds = selectedIdSet.has(batteryId)
      ? effectiveSelectedIds.filter((id) => id !== batteryId)
      : [...effectiveSelectedIds, batteryId];

    updateSelection(nextSelectedIds);
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      contentAriaDescribedBy={undefined}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <div className="max-h-[85vh] w-full min-w-0 overflow-y-auto">
        <div className="w-full min-w-0 p-6">
          <CardDialogHeader
            title={t('widgets.battery.settings.title')}
            showRoomSelector={false}
            eyebrow={
              <CompactRoomSelector
                value={roomValue}
                label={roomLabel}
                options={roomOptions}
                onChange={onRoomChange}
              />
            }
          />

          <Tabs
            value={activeTab}
            defaultValue="controls"
            onValueChange={(value) => setActiveTab(value as 'controls' | 'card')}
          >
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Customize
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5">
              <CardDialogSection
                label={t('widgets.battery.settings.sensors')}
                helperText={t('widgets.battery.settings.help')}
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateSelection(batteries.map((battery) => battery.id))}
                      variant="soft"
                      size="compact"
                      className={surface.textSecondary}
                    >
                      {t('widgets.battery.settings.selectAll')}
                    </Button>
                    <Button
                      onClick={() => updateSelection([])}
                      variant="soft"
                      size="compact"
                      className={surface.textSecondary}
                    >
                      {t('widgets.battery.settings.clearAll')}
                    </Button>
                  </div>

                  {batteries.length === 0 ? (
                    <p
                      className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
                    >
                      {t('widgets.battery.settings.noneAvailable')}
                    </p>
                  ) : (
                    <ul className="max-h-72 min-w-0 max-w-full space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
                      {batteries.map((battery) => {
                        const isChecked = selectedIdSet.has(battery.id);
                        return (
                          <li key={battery.id} className="w-full min-w-0 max-w-full">
                            <SelectableCheckboxRow
                              checked={isChecked}
                              onCheckedChange={() => handleToggle(battery.id)}
                              label={
                                <span className="block truncate" title={battery.name}>
                                  {battery.name}
                                </span>
                              }
                              description={battery.id}
                              trailing={
                                <div className="text-sm font-semibold tabular-nums">
                                  {battery.level}%
                                </div>
                              }
                              rowClassName={`w-full min-w-0 max-w-full overflow-hidden ${surface.borderClassName} ${surface.textPrimary}`}
                              labelClassName="truncate"
                              descriptionClassName={`whitespace-normal break-all ${surface.textMuted}`}
                              checkboxPaletteColor={accentHex}
                              style={{ background: surface.subtleFill }}
                              selectedStyle={{
                                background: surface.subtleFill,
                                borderColor: `${accentHex}4d`,
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </CardDialogSection>
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  defaultColor="#f97316"
                  className={surface.textMuted}
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </div>
    </DialogShell>
  );
}

export const BatteryOverviewWidget = memo(function BatteryOverviewWidget({
  size = 'large',
  data,
  onUpdate,
  isEditMode = false,
  room,
  onRoomChange,
}: BatteryOverviewWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const surface = getThemeSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const rooms = useAreaRooms();
  const batteries = useHomeAssistant(selectBatterySensorRowsFromHa, haBatterySensorRowsEqual);
  const selectedEntityIds = getSelectedEntityIds(data?.selectedEntityIds);
  const selectedIdSet = useMemo(() => new Set(selectedEntityIds ?? []), [selectedEntityIds]);
  const filteredBatteries =
    selectedEntityIds === undefined
      ? batteries
      : batteries.filter((battery) => selectedIdSet.has(battery.id));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chromeSize = size === 'large' ? 'medium' : size;
  const roomValue = room === 'All' || !room ? HOME_WIDGET_ROOM : room;
  const roomLabel = roomValue === HOME_WIDGET_ROOM ? t('dashboard.roomNav.all') : roomValue;
  const roomOptions = [
    { label: t('dashboard.roomNav.all'), value: HOME_WIDGET_ROOM },
    ...rooms.map((entry) => ({ label: entry, value: entry })),
  ];

  const isCompact = isCompactCardSize(size);
  const accentHex = getThemeColorValue(primaryColor);
  const subtleFill =
    tintSurface.subtleFill ??
    (theme === 'light'
      ? '#f3f4f6'
      : theme === 'black'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.08)');

  const getLevelColor = (level: number) => {
    if (level <= 20) return '#ef4444';
    if (level <= 40) return '#f97316';
    return accentHex;
  };

  useEffect(() => {
    if (!isEditMode) {
      setIsSettingsOpen(false);
    }
  }, [isEditMode]);

  const handleSelectionChange = (nextSelectedEntityIds: string[]) => {
    onUpdate?.({ selectedEntityIds: nextSelectedEntityIds });
  };

  const emptyStateLabel =
    batteries.length === 0
      ? t('widgets.battery.noBatteries')
      : selectedEntityIds !== undefined
        ? t('widgets.battery.noSelectedBatteries')
        : t('widgets.battery.noBatteries');

  return (
    <div className="h-full">
      <BaseCard
        size={size}
        fullBleed
        className="transition-all duration-500"
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
          {onUpdate ? (
            <CardSettingsActionButton
              theme={theme}
              size={chromeSize === 'small' ? 'small' : 'medium'}
              variant="soft"
              className="absolute right-3 top-3 z-[3]"
              onClick={(event) => {
                event.stopPropagation();
                setIsSettingsOpen(true);
              }}
              aria-label={t('widgets.battery.settings.title')}
            />
          ) : null}
          <EntityCardHeader
            title={t('widgets.battery.title')}
            subtitle="Custom"
            layout="eyebrow-first"
            size={chromeSize}
            titleClassName={surface.textPrimary}
            subtitleClassName={surface.textMuted}
            leading={<EntityCardHeaderIcon IconComponent={Battery} isActive size={chromeSize} />}
          />
          {filteredBatteries.length === 0 ? (
            <div className={`flex flex-1 items-center justify-center text-sm ${surface.textMuted}`}>
              {emptyStateLabel}
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
              <ul className="mt-auto min-w-0 space-y-1.5">
                {filteredBatteries.map((device) => (
                  <li key={device.id} className="flex min-w-0 items-center gap-2">
                    <BatteryLevelIcon
                      level={device.level}
                      color={getLevelColor(device.level)}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    <span className={`min-w-0 flex-1 truncate text-xs ${surface.textSecondary}`}>
                      {device.name}
                    </span>
                    {!isCompact && (
                      <div
                        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                        style={{ background: subtleFill }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${device.level}%`,
                            backgroundColor: getLevelColor(device.level),
                          }}
                        />
                      </div>
                    )}
                    <span
                      className="w-10 shrink-0 text-right text-xs font-medium tabular-nums"
                      style={{ color: getLevelColor(device.level) }}
                    >
                      {device.level}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BaseCard>
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
    </div>
  );
});
