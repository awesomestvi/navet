import { Battery, BatteryLow, Check, Palette, Sliders } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import {
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import {
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
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard/stores/custom-cards-store';
import { useDevices, useHomeAssistant, useI18n, useRooms, useTheme } from '@/app/hooks';
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
                            <button
                              type="button"
                              onClick={() => handleToggle(battery.id)}
                              className={`flex w-full min-w-0 max-w-full items-start gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-colors ${surface.borderClassName} ${surface.textPrimary}`}
                              style={{ background: surface.subtleFill }}
                            >
                              <span
                                aria-hidden="true"
                                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors ${
                                  isChecked
                                    ? 'border-transparent text-white'
                                    : surface.borderClassName
                                }`}
                                style={isChecked ? { backgroundColor: accentHex } : undefined}
                              >
                                {isChecked ? (
                                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                ) : null}
                              </span>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div
                                  className="block truncate text-sm font-medium"
                                  title={battery.name}
                                >
                                  {battery.name}
                                </div>
                                <div
                                  className={`mt-0.5 whitespace-normal break-all text-xs ${surface.textMuted}`}
                                >
                                  {battery.id}
                                </div>
                              </div>
                              <div className="shrink-0 text-sm font-semibold tabular-nums">
                                {battery.level}%
                              </div>
                            </button>
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
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const cardShell = getCardShellSurfaceTokens(theme);
  const baseSurface = getThemeSurfaceTokens(theme);
  const devices = useDevices();
  const rooms = useRooms(devices);
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
  const frameStyle = {
    borderColor:
      typeof surface.panelStyle?.borderColor === 'string'
        ? surface.panelStyle.borderColor
        : undefined,
    boxShadow: surface.panelStyle?.boxShadow,
  };

  return (
    <div
      className={`relative h-full overflow-hidden rounded-[28px] border ${surface.borderClassName}`}
      style={frameStyle}
    >
      <div
        className={`absolute inset-px overflow-hidden rounded-[26px] ${baseSurface.panel} ${cardShell.backdropClassName}`}
        style={surface.panelStyle}
      >
        {surface.glowStyle ? (
          <div className="pointer-events-none absolute inset-0" style={surface.glowStyle} />
        ) : null}
        {surface.overlayClassName ? (
          <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
        ) : null}
        {baseSurface.lightOverlay ? (
          <div className={`pointer-events-none absolute inset-0 ${baseSurface.lightOverlay}`} />
        ) : null}

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
                    {device.level <= 20 ? (
                      <BatteryLow className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    ) : (
                      <Battery
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: getLevelColor(device.level) }}
                      />
                    )}
                    <span className={`min-w-0 flex-1 truncate text-xs ${surface.textSecondary}`}>
                      {device.name}
                    </span>
                    {!isCompact && (
                      <div
                        className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                        style={{ background: surface.subtleFill }}
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
      </div>
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
