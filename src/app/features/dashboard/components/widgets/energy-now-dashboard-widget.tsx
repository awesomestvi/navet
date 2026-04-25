import type { HassEntity } from 'home-assistant-js-websocket';
import { Bolt, Palette, Sliders } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import {
  CardDialogChoicePill,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import { CardMetric, customCardDialogShellProps, DialogShell } from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import {
  CompactRoomSelector,
  CustomCardTintPicker,
  CustomScrollbar,
} from '@/app/components/shared/device-editor';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { HOME_WIDGET_ROOM } from '@/app/features/dashboard/stores/custom-cards-store';
import { EnergySparkline } from '@/app/features/energy/components/charts/energy-sparkline';
import { useEnergyDashboard } from '@/app/features/energy/hooks/use-energy-dashboard';
import { useEnergyLoadHistory } from '@/app/features/energy/hooks/use-energy-load-history';
import type { EnergySeriesPoint } from '@/app/features/energy/types/energy.types';
import { useDevices, useHomeAssistant, useI18n, useRooms, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { DashboardCustomCardShell } from './dashboard-custom-card-shell';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface EnergyNowDashboardWidgetProps {
  size?: CardSize;
  data?: EnergyNowWidgetData;
  onUpdate?: (data: EnergyNowWidgetData) => void;
  isEditMode?: boolean;
  room?: string;
  onRoomChange?: (room: string) => void;
}

export interface EnergyNowWidgetData {
  selectedSourceId?: string;
  tintColor?: string;
}

interface EnergySourceOption {
  id: string;
  name: string;
  currentPowerW: number;
  todayUsageKWh: number;
  trendEntityId?: string;
  group: 'home' | 'sources' | 'devices';
}

function parsePowerEntityWatts(entity: HassEntity | undefined): number | null {
  if (!entity) {
    return null;
  }

  const raw = Number.parseFloat(String(entity.state));
  if (!Number.isFinite(raw)) {
    return null;
  }

  const unit = String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toUpperCase();

  if (unit === 'W') {
    return raw;
  }
  if (unit === 'KW') {
    return raw * 1000;
  }

  const deviceClass = String(entity.attributes?.device_class ?? '').toLowerCase();
  return deviceClass === 'power' ? raw : null;
}

function parseEnergyEntityKWh(entity: HassEntity | undefined): number | null {
  if (!entity) {
    return null;
  }

  const raw = Number.parseFloat(String(entity.state));
  if (!Number.isFinite(raw)) {
    return null;
  }

  const unit = String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toUpperCase();

  if (unit === 'KWH') {
    return raw;
  }
  if (unit === 'WH') {
    return raw / 1000;
  }
  if (unit === 'MWH') {
    return raw * 1000;
  }

  const deviceClass = String(entity.attributes?.device_class ?? '').toLowerCase();
  return deviceClass === 'energy' ? raw : null;
}

function getEntityLabel(entityId: string, entity: HassEntity | undefined): string {
  const friendlyName =
    typeof entity?.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : '';
  return friendlyName.trim() || entityId;
}

function inferRelatedPowerEntityId(
  entityId: string,
  entities: Record<string, HassEntity> | null | undefined
): string | undefined {
  const candidates = [
    entityId.replace('_energy_usage', '_power_usage'),
    entityId.replace('_energy_usage', '_power_consumed'),
    entityId.replace('_energy_usage', '_power'),
    entityId.replace('_energy_usage', '_power_now'),
    entityId.replace('_energy_usage', '_current_power'),
  ];

  for (const candidate of candidates) {
    if (candidate === entityId) {
      continue;
    }
    const watts = parsePowerEntityWatts(entities?.[candidate]);
    if (watts !== null) {
      return candidate;
    }
  }

  return parsePowerEntityWatts(entities?.[entityId]) !== null ? entityId : undefined;
}

function getSelectedSourceId(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

interface EnergyNowSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  options: EnergySourceOption[];
  selectedSourceId?: string;
  onSelectionChange?: (selectedSourceId: string) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function EnergyNowSettingsDialog({
  isOpen,
  onOpenChange,
  options,
  selectedSourceId,
  onSelectionChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  tintColor,
  onTintColorChange,
}: EnergyNowSettingsDialogProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      maxWidth: 'sm',
      padding: false,
      height: 'capped',
    }
  );
  const selectedId = selectedSourceId ?? options[0]?.id;
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');
  const groupedOptions = [
    {
      key: 'home',
      label: t('widgets.energyNow.settings.group.home'),
      items: options.filter((option) => option.group === 'home'),
    },
    {
      key: 'sources',
      label: t('widgets.energyNow.settings.group.sources'),
      items: options.filter((option) => option.group === 'sources'),
    },
    {
      key: 'devices',
      label: t('widgets.energyNow.settings.group.devices'),
      items: options.filter((option) => option.group === 'devices'),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={theme !== 'light'}>
        <div className="p-6">
          <CardDialogHeader
            title={t('widgets.energyNow.settings.title')}
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
                label={t('widgets.energyNow.settings.sources')}
                helperText={t('widgets.energyNow.settings.help')}
              >
                {options.length === 0 ? (
                  <p
                    className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
                  >
                    {t('widgets.energyNow.settings.noneAvailable')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {groupedOptions.map((group) => (
                      <div key={group.key} className="space-y-2">
                        <div
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
                        >
                          {group.label}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((option) => {
                            const isSelected = option.id === selectedId;
                            return (
                              <CardDialogChoicePill
                                key={option.id}
                                onClick={() => {
                                  onSelectionChange?.(option.id);
                                }}
                                active={isSelected}
                                className={`flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left ${surface.borderClassName} ${surface.textPrimary}`}
                                style={{
                                  background: isSelected
                                    ? (surface.panelStyle?.background ?? surface.subtleFill)
                                    : surface.subtleFill,
                                }}
                              >
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${surface.borderClassName}`}
                                  style={{ background: surface.subtleFill }}
                                >
                                  <Bolt
                                    className={`h-4 w-4 ${isSelected ? (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400') : theme === 'light' ? 'text-slate-500' : 'text-white/60'}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium">{option.name}</div>
                                  <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
                                    {option.currentPowerW > 0
                                      ? `${Math.round(option.currentPowerW)}W • ${option.todayUsageKWh.toFixed(1)} kWh`
                                      : `${option.todayUsageKWh.toFixed(1)} kWh`}
                                  </div>
                                </div>
                              </CardDialogChoicePill>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

          <CardDialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
}

interface EnergyNowDashboardCardViewProps {
  title: string;
  currentLoadW: number;
  todayUsageKWh: number;
  trend: EnergySeriesPoint[];
  accentColor: string;
  size?: CardSize;
  tintColor?: string;
}

export const EnergyNowDashboardCardView = memo(function EnergyNowDashboardCardView({
  title,
  currentLoadW,
  todayUsageKWh,
  trend,
  accentColor,
  size = 'medium',
  tintColor,
}: EnergyNowDashboardCardViewProps) {
  const { theme } = useTheme();
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const headerSize: CardSize = isSmall ? 'small' : size;
  const tickIndexes = isSmall
    ? [0, trend.length - 1]
    : isMedium
      ? [0, Math.floor((trend.length - 1) / 2), trend.length - 1]
      : [
          0,
          Math.floor((trend.length - 1) / 3),
          Math.floor(((trend.length - 1) * 2) / 3),
          trend.length - 1,
        ];
  const trendTicks = trend.filter((_, index) => tickIndexes.includes(index));

  return (
    <DashboardCustomCardShell theme={theme} size={size} tintColor={tintColor}>
      {({ baseSurface, stateSurface }) => (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                theme === 'light'
                  ? `radial-gradient(circle at 50% 100%, ${accentColor}16 0%, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 100%)`
                  : `radial-gradient(circle at 50% 100%, ${accentColor}18 0%, transparent 52%), linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)`,
            }}
          />

          <div className={`absolute inset-x-0 ${isSmall ? 'bottom-0 top-16' : 'bottom-0 top-20'}`}>
            <EnergySparkline
              data={trend.map((point) => ({
                value: point.value,
                timestampMs: point.timestampMs,
                endTimestampMs: point.endTimestampMs,
                minValue: point.minValue,
                maxValue: point.maxValue,
              }))}
              accentColor={accentColor}
              height={isSmall ? 126 : isMedium ? 152 : 176}
              className="h-full w-full opacity-95"
              padX={0}
            />
          </div>

          <div
            className={`pointer-events-none absolute bottom-0 left-0 ${isSmall ? 'top-16 w-8' : 'top-20 w-10'}`}
            style={{
              background:
                theme === 'light'
                  ? 'linear-gradient(90deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0) 100%)'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 100%)',
            }}
          />

          <div
            className={`pointer-events-none absolute bottom-0 right-0 ${isSmall ? 'top-16 w-8' : 'top-20 w-10'}`}
            style={{
              background:
                theme === 'light'
                  ? 'linear-gradient(270deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.14) 42%, rgba(255,255,255,0) 100%)'
                  : 'linear-gradient(270deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 100%)',
            }}
          />

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 ${isSmall ? 'top-16' : 'top-20'}`}
            style={{
              background: isSmall
                ? theme === 'light'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.06) 32%, rgba(248,250,252,0.48) 100%)'
                  : 'linear-gradient(180deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.1) 32%, rgba(0,0,0,0.74) 100%)'
                : theme === 'light'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 34%, rgba(248,250,252,0.58) 100%)'
                  : 'linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.03) 34%, rgba(0,0,0,0.64) 100%)',
            }}
          />

          <div
            className={`pointer-events-none absolute inset-x-0 border-t border-dashed ${theme === 'light' ? 'border-slate-400/70' : 'border-white/65'} ${isSmall ? 'top-[48%]' : 'top-[45%]'}`}
          />

          <div className="pointer-events-none relative z-10 flex h-full flex-col p-3">
            <div className="flex items-start justify-between gap-4">
              {isSmall ? (
                <div />
              ) : (
                <EntityCardHeader
                  title={title}
                  subtitle="Energy"
                  size={headerSize}
                  layout="eyebrow-first"
                  className="mb-0"
                  marginBottomClassName="mb-0"
                  titleClassName={stateSurface.primaryTextClassName}
                  subtitleClassName={stateSurface.mutedTextClassName}
                  leading={
                    <EntityCardHeaderIcon
                      IconComponent={Bolt}
                      isActive
                      size={headerSize}
                      baseColor={accentColor}
                    />
                  }
                />
              )}
              <CardMetric
                value={`${Math.round(currentLoadW)}W`}
                label={`${todayUsageKWh.toFixed(1)} kWh`}
                size={isSmall ? 'sm' : isMedium ? 'lg' : 'xl'}
                isActive
                accentClassName={stateSurface.primaryTextClassName}
                theme={theme}
                className="shrink-0 text-right"
                labelClassName={theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}
                valueStyle={{
                  fontSize: isSmall ? '1.25rem' : isMedium ? '1.45rem' : '1.7rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              />
            </div>

            <div className="mt-auto">
              <div
                className={`mt-3 flex items-center justify-between gap-2 text-xs ${baseSurface.textMuted}`}
              >
                {trendTicks.map((point, index) => (
                  <div
                    key={`${point.label || 'tick'}-${index}`}
                    className="min-w-0 flex-1 truncate whitespace-nowrap text-center first:text-left last:text-right"
                  >
                    {point.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardCustomCardShell>
  );
});

function EnergyNowStatusWidget({ message }: { message: string }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <DashboardCustomCardShell theme={theme} size="medium">
      {({ stateSurface }) => (
        <div className="relative z-10 flex h-full flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className={`text-xs font-semibold uppercase tracking-[0.16em] ${stateSurface.mutedTextClassName}`}
              >
                {t('energy.widgets.now.eyebrow')}
              </div>
              <div className={`mt-1 text-sm font-semibold ${stateSurface.primaryTextClassName}`}>
                {t('energy.widgets.now.title')}
              </div>
            </div>
            <Bolt className={`h-4 w-4 ${stateSurface.mutedTextClassName}`} />
          </div>
          <div className={`relative z-10 text-sm ${stateSurface.secondaryTextClassName}`}>
            {message}
          </div>
        </div>
      )}
    </DashboardCustomCardShell>
  );
}

export const EnergyNowDashboardWidget = memo(function EnergyNowDashboardWidget({
  size = 'medium',
  data,
  onUpdate,
  room,
  onRoomChange,
}: EnergyNowDashboardWidgetProps) {
  const { accentColor } = useTheme();
  const { t } = useI18n();
  const devices = useDevices();
  const rooms = useRooms(devices);
  const hassEntities = useHomeAssistant(homeAssistantSelectors.entities);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    overview,
    sourceConfig,
    currentLoadStatisticId,
    todayTotalUsageKWh,
    isConnected,
    isConfigured,
  } = useEnergyDashboard();
  const selectedSourceId = getSelectedSourceId(data?.selectedSourceId);
  const tintColor = typeof data?.tintColor === 'string' ? data.tintColor : undefined;
  const roomValue = room === 'All' || !room ? HOME_WIDGET_ROOM : room;
  const roomLabel = roomValue === HOME_WIDGET_ROOM ? t('dashboard.roomNav.all') : roomValue;
  const roomOptions = [
    { label: t('dashboard.roomNav.all'), value: HOME_WIDGET_ROOM },
    ...rooms.map((entry) => ({ label: entry, value: entry })),
  ];

  const sourceOptions = useMemo(() => {
    const options: EnergySourceOption[] = [
      {
        id: 'home-load',
        name: t('widgets.energyNow.settings.home'),
        currentPowerW: overview.totals.currentLoadW,
        todayUsageKWh: todayTotalUsageKWh,
        trendEntityId: currentLoadStatisticId,
        group: 'home',
      },
    ];

    if (!sourceConfig) {
      return options;
    }

    if (sourceConfig.solarPowerEntityId) {
      options.push({
        id: 'solar',
        name: t('energy.setup.fields.solarPower.label'),
        currentPowerW: overview.totals.solarW,
        todayUsageKWh: overview.totals.solarTodayKWh,
        trendEntityId: sourceConfig.solarPowerEntityId,
        group: 'sources',
      });
    }

    if (sourceConfig.gridImportPowerEntityId) {
      options.push({
        id: 'grid-import',
        name: t('energy.stats.gridImport'),
        currentPowerW: overview.totals.importW,
        todayUsageKWh: overview.totals.importTodayKWh,
        trendEntityId: sourceConfig.gridImportPowerEntityId,
        group: 'sources',
      });
    }

    const consumersById = new Map(overview.topConsumers.map((consumer) => [consumer.id, consumer]));
    for (const device of sourceConfig.devices) {
      if (!device.powerEntityId) {
        continue;
      }

      const consumer = consumersById.get(device.entityId);
      options.push({
        id: `device:${device.entityId}`,
        name: device.name,
        currentPowerW: consumer?.powerW ?? 0,
        todayUsageKWh: consumer?.energyKWh ?? 0,
        trendEntityId: device.powerEntityId,
        group: 'devices',
      });
    }

    const usedTrendEntityIds = new Set(
      options.map((option) => option.trendEntityId).filter(Boolean)
    );
    const extraUsageSensorOptions = Object.entries(hassEntities ?? {})
      .filter(([entityId, entity]) => {
        if (!entityId.startsWith('sensor.')) {
          return false;
        }

        const friendlyName = getEntityLabel(entityId, entity).toLowerCase();
        const haystack = `${entityId} ${friendlyName}`;

        return (
          entityId === 'sensor.power_consumed' ||
          haystack.includes('_energy_usage') ||
          haystack.includes(' energy usage')
        );
      })
      .map(([entityId, entity]) => {
        const trendEntityId = inferRelatedPowerEntityId(entityId, hassEntities) ?? entityId;
        const currentPowerW = parsePowerEntityWatts(hassEntities?.[trendEntityId]) ?? 0;
        const todayUsageKWh = parseEnergyEntityKWh(entity) ?? 0;

        return {
          id: `entity:${entityId}`,
          name: getEntityLabel(entityId, entity),
          currentPowerW,
          todayUsageKWh,
          trendEntityId,
          group: 'devices' as const,
        };
      })
      .filter(
        (option) =>
          !usedTrendEntityIds.has(option.trendEntityId) &&
          (option.todayUsageKWh > 0 || option.currentPowerW > 0)
      )
      .sort((left, right) =>
        right.todayUsageKWh === left.todayUsageKWh
          ? right.currentPowerW - left.currentPowerW
          : right.todayUsageKWh - left.todayUsageKWh
      );

    options.push(...extraUsageSensorOptions);

    return options;
  }, [currentLoadStatisticId, hassEntities, overview, sourceConfig, t, todayTotalUsageKWh]);

  const selectedOption =
    sourceOptions.find((option) => option.id === selectedSourceId) ?? sourceOptions[0] ?? null;
  const selectedTrend = useEnergyLoadHistory(
    selectedOption?.trendEntityId,
    selectedOption?.currentPowerW ?? overview.totals.currentLoadW
  );

  if (!isConnected) {
    return <EnergyNowStatusWidget message={t('network.disconnectedDescription')} />;
  }

  if (!isConfigured) {
    return <EnergyNowStatusWidget message={t('energy.setup.panelDescription')} />;
  }

  return (
    <>
      {onUpdate ? (
        <button
          type="button"
          className="h-full w-full cursor-pointer text-left"
          onClick={() => setIsSettingsOpen(true)}
        >
          <EnergyNowDashboardCardView
            title={selectedOption?.name ?? t('widgets.energyNow.settings.home')}
            currentLoadW={selectedOption?.currentPowerW ?? overview.totals.currentLoadW}
            todayUsageKWh={selectedOption?.todayUsageKWh ?? todayTotalUsageKWh}
            trend={selectedTrend}
            accentColor={accentColor}
            size={size}
            tintColor={tintColor}
          />
        </button>
      ) : (
        <EnergyNowDashboardCardView
          title={selectedOption?.name ?? t('widgets.energyNow.settings.home')}
          currentLoadW={selectedOption?.currentPowerW ?? overview.totals.currentLoadW}
          todayUsageKWh={selectedOption?.todayUsageKWh ?? todayTotalUsageKWh}
          trend={selectedTrend}
          accentColor={accentColor}
          size={size}
          tintColor={tintColor}
        />
      )}

      <EnergyNowSettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        options={sourceOptions}
        selectedSourceId={selectedOption?.id}
        onSelectionChange={(nextSelectedSourceId) =>
          onUpdate?.({ selectedSourceId: nextSelectedSourceId })
        }
        roomValue={roomValue}
        roomLabel={roomLabel}
        roomOptions={roomOptions}
        onRoomChange={onRoomChange}
        tintColor={tintColor}
        onTintColorChange={(nextTintColor) =>
          onUpdate?.({ ...(data ?? {}), tintColor: nextTintColor })
        }
      />
    </>
  );
});
