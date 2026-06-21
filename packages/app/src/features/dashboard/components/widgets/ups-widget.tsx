import {
  CardDialogSection,
  CardEmptyState,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  BaseCard,
  BaseCardDialogWithState,
  Button,
  CardMetric,
  EntityCardHeader,
  EntityCardHeaderIcon,
  Select,
} from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useAreaRooms, useI18n, useTheme } from '@navet/app/hooks';
import { formatSensorValue } from '@navet/app/hooks/entity-utils';
import { useSettingsStore } from '@navet/app/stores';
import { BatteryCharging, Gauge, Settings2, Zap } from 'lucide-react';
import { type KeyboardEvent, memo, useEffect, useMemo, useState } from 'react';
import {
  getUpsStatusTone,
  resolveUpsMetricReadings,
  type UpsDeviceOption,
} from './ups-widget-data';
import { useProviderUpsWidgetData } from './use-provider-ups-widget-data';
import { useDashboardWidgetRoomOptions } from './use-widget-room-options';

export interface UpsWidgetData {
  deviceId?: string;
  statusEntityId?: string;
  metricEntityIds?: string[];
  tintColor?: string;
}

interface UpsWidgetProps {
  size?: CardSize;
  data?: UpsWidgetData;
  onUpdate?: (data: UpsWidgetData) => void;
  isEditMode?: boolean;
  room?: string;
  onRoomChange?: (room: string) => void;
  openSettingsRequestKey?: number;
}

const SMALL_METRIC_KINDS = new Set(['battery', 'load']);

function normalizeUpsCardSize(size: CardSize): 'small' | 'medium' | 'large' {
  if (size === 'small') {
    return 'small';
  }
  if (size === 'large') {
    return 'large';
  }
  return 'medium';
}

function getMetricEntityIds(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function getSelectedDevice(
  devices: UpsDeviceOption[],
  deviceId: string | undefined
): UpsDeviceOption | null {
  if (!deviceId) {
    return devices[0] ?? null;
  }

  return devices.find((device) => device.deviceId === deviceId) ?? null;
}

function getStatusColorClasses(tone: ReturnType<typeof getUpsStatusTone>, theme: string) {
  switch (tone) {
    case 'green':
      return theme === 'light'
        ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
        : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
    case 'amber':
      return theme === 'light'
        ? 'border-amber-300 bg-amber-100 text-amber-800'
        : 'border-amber-400/30 bg-amber-500/15 text-amber-200';
    case 'red':
      return theme === 'light'
        ? 'border-red-300 bg-red-100 text-red-800'
        : 'border-red-400/30 bg-red-500/15 text-red-200';
    default:
      return theme === 'light'
        ? 'border-slate-300 bg-slate-100 text-slate-700'
        : 'border-white/12 bg-white/8 text-white/72';
  }
}

function getMetricLabel(kind: string, fallbackLabel: string, t: ReturnType<typeof useI18n>['t']) {
  switch (kind) {
    case 'battery':
      return t('widgets.ups.metrics.battery');
    case 'load':
      return t('widgets.ups.metrics.load');
    case 'input-voltage':
      return t('widgets.ups.metrics.inputVoltage');
    case 'output-voltage':
      return t('widgets.ups.metrics.outputVoltage');
    case 'runtime':
      return t('widgets.ups.metrics.runtime');
    default:
      return fallbackLabel;
  }
}

function UpsSettingsDialog({
  devices,
  isOpen,
  onOpenChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  data,
  onUpdate,
}: {
  devices: UpsDeviceOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  data?: UpsWidgetData;
  onUpdate?: (data: UpsWidgetData) => void;
}) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const surface = getThemeSurfaceTokens(theme);
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const baseSurface = getThemeSurfaceTokens(theme);
  const selectedDevice = getSelectedDevice(devices, data?.deviceId);
  const selectedMetricIds =
    getMetricEntityIds(data?.metricEntityIds) ?? selectedDevice?.defaultMetricEntityIds ?? [];
  const selectedMetricIdSet = useMemo(() => new Set(selectedMetricIds), [selectedMetricIds]);
  const statusEntityId = data?.statusEntityId ?? selectedDevice?.defaultStatusEntityId;

  const handleDeviceChange = (deviceId: string) => {
    const nextDevice = devices.find((device) => device.deviceId === deviceId);
    if (!nextDevice) {
      return;
    }

    onUpdate?.({
      ...data,
      deviceId,
      statusEntityId: nextDevice.defaultStatusEntityId,
      metricEntityIds: nextDevice.defaultMetricEntityIds,
    });
  };

  const handleMetricToggle = (entityId: string) => {
    if (!selectedDevice) {
      return;
    }

    const nextMetricIds = selectedMetricIdSet.has(entityId)
      ? selectedMetricIds.filter((id) => id !== entityId)
      : selectedDevice.metrics
          .filter((metric) => metric.kind !== 'status')
          .map((metric) => metric.entityId)
          .filter((id) => id === entityId || selectedMetricIdSet.has(id));

    onUpdate?.({
      ...data,
      deviceId: selectedDevice.deviceId,
      statusEntityId,
      metricEntityIds: nextMetricIds,
    });
  };

  const metricOptions = selectedDevice?.metrics.filter((metric) => metric.kind !== 'status') ?? [];
  const statusOptions = selectedDevice?.statusOptions ?? [];

  const controlsTabContent = (
    <>
      <CardDialogSection
        label={t('widgets.ups.settings.device')}
        helperText={t('widgets.ups.settings.deviceHelp')}
      >
        <Select
          aria-label={t('widgets.ups.settings.device')}
          value={selectedDevice?.deviceId ?? ''}
          onChange={(event) => handleDeviceChange(event.target.value)}
          disabled={devices.length === 0}
          selectClassName={`${surface.textPrimary} ${surface.border}`}
        >
          {devices.length === 0 ? (
            <option value="">{t('widgets.ups.settings.noneAvailable')}</option>
          ) : null}
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.room ? `${device.name} · ${device.room}` : device.name}
            </option>
          ))}
        </Select>
      </CardDialogSection>

      <CardDialogSection
        label={t('widgets.ups.settings.status')}
        helperText={t('widgets.ups.settings.statusHelp')}
      >
        <Select
          aria-label={t('widgets.ups.settings.status')}
          value={statusEntityId ?? ''}
          onChange={(event) =>
            onUpdate?.({
              ...data,
              deviceId: selectedDevice?.deviceId,
              statusEntityId: event.target.value || undefined,
              metricEntityIds: selectedMetricIds,
            })
          }
          disabled={statusOptions.length === 0}
          selectClassName={`${surface.textPrimary} ${surface.border}`}
        >
          {statusOptions.length === 0 ? (
            <option value="">{t('widgets.ups.settings.noStatusSource')}</option>
          ) : null}
          {statusOptions.map((metric) => (
            <option key={metric.entityId} value={metric.entityId}>
              {metric.label}
            </option>
          ))}
        </Select>
      </CardDialogSection>

      <CardDialogSection
        label={t('widgets.ups.settings.metrics')}
        helperText={t('widgets.ups.settings.metricsHelp')}
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() =>
                onUpdate?.({
                  ...data,
                  deviceId: selectedDevice?.deviceId,
                  statusEntityId,
                  metricEntityIds: selectedDevice?.defaultMetricEntityIds ?? [],
                })
              }
              variant="soft"
              size="compact"
              className={surface.textSecondary}
            >
              {t('widgets.ups.settings.resetDefaults')}
            </Button>
          </div>

          {metricOptions.length === 0 ? (
            <p
              className={`rounded-2xl border px-4 py-4 text-sm ${surface.border} ${surface.textMuted}`}
            >
              {t('widgets.ups.settings.noneAvailable')}
            </p>
          ) : (
            <ul className="max-h-72 min-w-0 max-w-full space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
              {metricOptions.map((metric) => (
                <li key={metric.entityId} className="w-full min-w-0 max-w-full">
                  <SelectableCheckboxRow
                    checked={selectedMetricIdSet.has(metric.entityId)}
                    onCheckedChange={() => handleMetricToggle(metric.entityId)}
                    label={
                      <span className="block truncate" title={metric.label}>
                        {metric.label}
                      </span>
                    }
                    description={getMetricLabel(metric.kind, metric.label, t)}
                    trailing={
                      <div className="text-sm font-semibold tabular-nums">
                        {metric.value}
                        {metric.unit ? ` ${metric.unit}` : ''}
                      </div>
                    }
                    rowClassName={`w-full min-w-0 max-w-full overflow-hidden ${surface.border} ${surface.textPrimary}`}
                    labelClassName="truncate"
                    descriptionClassName={`whitespace-normal break-all ${surface.textMuted}`}
                    checkboxPaletteColor={accentHex}
                    style={{ background: baseSurface.subtleBg }}
                    selectedStyle={{
                      background: baseSurface.subtleBg,
                      borderColor: `${accentHex}4d`,
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardDialogSection>
    </>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('widgets.ups.settings.title')}
      description={t('widgets.common.widget')}
      roomSelector={{
        value: roomValue,
        label: roomLabel,
        options: roomOptions,
        onChange: onRoomChange,
      }}
      controlsTabContent={controlsTabContent}
      tintColor={tintColor}
      onTintColorChange={
        onUpdate
          ? (nextTintColor) => onUpdate({ ...(data ?? {}), tintColor: nextTintColor })
          : undefined
      }
      defaultTintAccent="#16a34a"
      theme={theme}
      maxWidth="md"
      height="capped"
      scrollClassName="max-h-[85vh] w-full min-w-0"
      bodyClassName="max-h-[85vh] w-full min-w-0"
    />
  );
}

export const UpsWidget = memo(function UpsWidget({
  size = 'medium',
  data,
  onUpdate,
  isEditMode = false,
  room,
  onRoomChange,
  openSettingsRequestKey = 0,
}: UpsWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const rooms = useAreaRooms();
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const surface = getThemeSurfaceTokens(theme);
  const textPrimaryStyle = tintSurface.textPrimaryColor
    ? { color: tintSurface.textPrimaryColor }
    : undefined;
  const textSecondaryStyle = tintSurface.textSecondaryColor
    ? { color: tintSurface.textSecondaryColor }
    : undefined;
  const textPrimaryClassName = tintSurface.textPrimaryColor ? '' : surface.textPrimary;
  const textMutedClassName = tintSurface.textSecondaryColor ? '' : surface.textMuted;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const resolvedSize = normalizeUpsCardSize(size);
  const { devices, entities, formatOptions } = useProviderUpsWidgetData({ use24HourTime });
  const selectedDevice = getSelectedDevice(devices, data?.deviceId);
  const missingPersistedDevice = Boolean(data?.deviceId) && selectedDevice === null;
  const metricEntityIds =
    getMetricEntityIds(data?.metricEntityIds) ?? selectedDevice?.defaultMetricEntityIds ?? [];
  const selectedMetrics = useMemo(
    () =>
      selectedDevice
        ? resolveUpsMetricReadings({
            entities,
            metricEntityIds,
            availableMetrics: selectedDevice.metrics,
            formatOptions,
          })
        : [],
    [entities, formatOptions, metricEntityIds, selectedDevice]
  );
  const batteryMetric =
    selectedMetrics.find((metric) => metric.kind === 'battery') ??
    selectedDevice?.metrics.find((metric) => metric.kind === 'battery');
  const loadMetric =
    selectedMetrics.find((metric) => metric.kind === 'load') ??
    selectedDevice?.metrics.find((metric) => metric.kind === 'load');
  const visibleMetrics =
    resolvedSize === 'small'
      ? selectedMetrics.filter((metric) => SMALL_METRIC_KINDS.has(metric.kind))
      : selectedMetrics
          .filter((metric) => metric.entityId !== batteryMetric?.entityId)
          .slice(0, resolvedSize === 'medium' ? 4 : 6);
  const statusEntityId = data?.statusEntityId ?? selectedDevice?.defaultStatusEntityId;
  const statusEntity = statusEntityId ? entities?.[statusEntityId] : undefined;
  const statusValue = statusEntity
    ? (formatSensorValue(statusEntity, formatOptions)?.value ?? String(statusEntity.state))
    : missingPersistedDevice
      ? t('widgets.ups.status.unavailable')
      : t('widgets.ups.status.noStatus');
  const statusTone = getUpsStatusTone(statusValue);
  const statusClasses = getStatusColorClasses(statusTone, theme);
  const { roomValue, roomLabel, roomOptions } = useDashboardWidgetRoomOptions(room, rooms);
  const accentHex = getThemeColorValue(primaryColor);
  const cardCanOpenSettings = Boolean(onUpdate) && (!missingPersistedDevice || devices.length > 0);
  const hasDeviceData = Boolean(selectedDevice);
  const isEmpty = !hasDeviceData || (!batteryMetric && visibleMetrics.length === 0);

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
        size={resolvedSize}
        role={cardCanOpenSettings && !isEmpty ? 'button' : undefined}
        tabIndex={cardCanOpenSettings && !isEmpty ? 0 : undefined}
        aria-label={
          cardCanOpenSettings && !isEmpty
            ? t('entityCardInteraction.openSettings', { name: t('widgets.ups.title') })
            : undefined
        }
        onClick={cardCanOpenSettings && !isEmpty ? openSettings : undefined}
        onKeyDown={cardCanOpenSettings && !isEmpty ? handleCardKeyDown : undefined}
        interactive={cardCanOpenSettings && !isEmpty}
        fullBleed
        style={tintSurface.panelStyle}
        readableBackgroundColor={tintSurface.backgroundColor}
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
              title={
                missingPersistedDevice
                  ? t('widgets.ups.missingDeviceTitle')
                  : t('widgets.ups.noDevices')
              }
              description={
                missingPersistedDevice
                  ? t('widgets.ups.missingDeviceDescription')
                  : t('widgets.ups.settings.noneAvailable')
              }
              icon={BatteryCharging}
              actionLabel={onUpdate ? t('widgets.ups.settings.title') : undefined}
              onAction={onUpdate ? openSettings : undefined}
              actionIcon={onUpdate ? Settings2 : undefined}
              size={resolvedSize}
              accentColor={tintColor ?? accentHex}
            />
          ) : (
            <>
              <EntityCardHeader
                title={selectedDevice?.name ?? t('widgets.ups.title')}
                subtitle={selectedDevice?.room || t('widgets.common.widget')}
                layout="eyebrow-first"
                size={resolvedSize === 'large' ? 'medium' : resolvedSize}
                titleClassName={textPrimaryClassName}
                subtitleClassName={textMutedClassName}
                backgroundColor={tintSurface.backgroundColor}
                titleStyle={textPrimaryStyle}
                subtitleStyle={textSecondaryStyle}
                leading={
                  <EntityCardHeaderIcon
                    IconComponent={BatteryCharging}
                    isActive={statusTone !== 'neutral'}
                    size={resolvedSize === 'large' ? 'medium' : resolvedSize}
                  />
                }
              />

              <div className="mt-3 flex flex-1 flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <CardMetric
                    value={
                      batteryMetric
                        ? `${batteryMetric.value}${batteryMetric.unit ? ` ${batteryMetric.unit}` : ''}`
                        : t('widgets.ups.status.unavailable')
                    }
                    label={t('widgets.ups.metrics.battery')}
                    size={resolvedSize === 'large' ? 'xl' : 'lg'}
                    isActive={Boolean(batteryMetric)}
                    accentClassName={
                      tintSurface.textPrimaryColor
                        ? ''
                        : theme === 'light'
                          ? 'text-slate-900'
                          : 'text-white'
                    }
                    theme={theme}
                    labelClassName={textMutedClassName}
                    valueStyle={textPrimaryStyle}
                    labelStyle={textSecondaryStyle}
                  />
                  <div
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses}`}
                  >
                    {statusValue}
                  </div>
                </div>

                {resolvedSize === 'small' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(loadMetric ? [loadMetric] : visibleMetrics).map((metric) => (
                      <div
                        key={metric.entityId}
                        className={`rounded-2xl border px-3 py-2 ${surface.border} ${surface.panelMuted}`}
                      >
                        <div
                          className={`text-xs uppercase tracking-[0.12em] ${textMutedClassName}`}
                          style={textSecondaryStyle}
                        >
                          {getMetricLabel(metric.kind, metric.label, t)}
                        </div>
                        <div
                          className={`mt-1 text-lg font-semibold ${textPrimaryClassName}`}
                          style={textPrimaryStyle}
                        >
                          {metric.value}
                          {metric.unit ? ` ${metric.unit}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`grid gap-2 ${
                      resolvedSize === 'medium' ? 'grid-cols-2' : 'grid-cols-3'
                    }`}
                  >
                    {visibleMetrics.map((metric) => (
                      <div
                        key={metric.entityId}
                        className={`rounded-2xl border px-3 py-3 ${surface.border} ${surface.panelMuted}`}
                      >
                        <div
                          className={`flex items-center gap-2 text-xs uppercase tracking-[0.12em] ${textMutedClassName}`}
                          style={textSecondaryStyle}
                        >
                          {metric.kind === 'load' ? (
                            <Gauge className="h-3.5 w-3.5" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          <span>{getMetricLabel(metric.kind, metric.label, t)}</span>
                        </div>
                        <div
                          className={`mt-2 text-xl font-semibold ${textPrimaryClassName}`}
                          style={textPrimaryStyle}
                        >
                          {metric.value}
                          {metric.unit ? ` ${metric.unit}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </BaseCard>

      <UpsSettingsDialog
        devices={devices}
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        roomValue={roomValue}
        roomLabel={roomLabel}
        roomOptions={roomOptions}
        onRoomChange={onRoomChange}
        data={data}
        onUpdate={onUpdate}
      />
    </div>
  );
});
