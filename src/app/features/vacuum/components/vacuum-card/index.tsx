import { Battery, Bot, Clock3, type LucideIcon, Map as MapIcon } from 'lucide-react';
import { memo } from 'react';
import { BaseCard } from '@/app/components/primitives';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { useVacuumControl } from '../vacuum/use-vacuum-control';
import { VacuumControlsMedium } from '../vacuum/vacuum-controls-medium';
import { VacuumControlsSmall } from '../vacuum/vacuum-controls-small';
import { resolveVacuumGlanceMetrics } from '../vacuum/vacuum-metrics';
import { VacuumSettingsDialog } from '../vacuum/vacuum-settings-dialog';
import {
  getVacuumStatusLabelKey,
  getVacuumThemeStatus,
  normalizeVacuumStatus,
  type VacuumStatus,
} from '../vacuum/vacuum-utils';

type VacuumCardSize = 'small' | 'medium';

interface VacuumCardProps {
  id: string;
  name: string;
  status: VacuumStatus;
  battery: number;
  cleanedArea?: string;
  cleaningTime?: string;
  nextCleaning?: string;
  waterLevel?: number | string;
  binLevel?: number | string;
  room?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function normalizeVacuumCardSize(size: CardSize): VacuumCardSize {
  if (size === 'small' || size === 'medium') {
    return size;
  }

  return 'medium';
}

function normalizeVacuumDisplayName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  const parts = trimmed.split(' ');

  if (parts.length % 2 === 0) {
    const half = parts.length / 2;
    const left = parts.slice(0, half).join(' ');
    const right = parts.slice(half).join(' ');

    if (left === right) {
      return left;
    }
  }

  return trimmed;
}

interface VacuumMetricItem {
  key: string;
  icon: LucideIcon;
  value: string;
  unit?: string;
  label: string;
}

function VacuumMetricGrid({
  metrics,
  accentClassName,
  surfaceTextClassName,
  size,
}: {
  metrics: VacuumMetricItem[];
  accentClassName: string;
  surfaceTextClassName: string;
  size: VacuumCardSize;
}) {
  const isSmall = size === 'small';

  if (isSmall) {
    return (
      <div className="w-full space-y-0.5">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center justify-between gap-2 text-xs">
            <span className={cn(surfaceTextClassName, 'flex min-w-0 items-center gap-1')}>
              <metric.icon className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{metric.label}</span>
            </span>
            <span className={cn('shrink-0 font-medium', accentClassName)}>
              {metric.value}
              {metric.unit ? ` ${metric.unit}` : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-3">
      {metrics.map((metric, index) => (
        <div
          key={metric.key}
          className={cn(
            'flex min-w-0 flex-col',
            index > 0 && 'border-l border-white/10 pl-3',
            index === 0 && 'pr-3',
            index > 0 && index < metrics.length - 1 && 'pr-3'
          )}
        >
          <span
            className={cn('mb-1 flex items-center gap-1 truncate text-xs', surfaceTextClassName)}
          >
            <metric.icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{metric.label}</span>
          </span>
          <div>
            <span className={cn('text-xl font-bold leading-none', accentClassName)}>
              {metric.value}
            </span>
            {metric.unit ? (
              <span className={cn('ml-1 text-sm', accentClassName)}>{metric.unit}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function splitMetricValue(value: string): { value: string; unit?: string } {
  const match = value.match(/^(.+?)\s+([^-\d\s].*)$/);
  if (!match) {
    return { value };
  }

  return { value: match[1], unit: match[2] };
}

export const VacuumCard = memo(function VacuumCard({
  id,
  name,
  status,
  battery,
  cleanedArea = '0 m²',
  cleaningTime = '0 min',
  nextCleaning,
  waterLevel,
  binLevel,
  room = 'Living Room',
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: VacuumCardProps) {
  const resolvedSize = normalizeVacuumCardSize(size);
  const readStringList = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : undefined;
  const parseNumberish = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const allEntities = useHomeAssistant(homeAssistantSelectors.entities);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveStatus = normalizeVacuumStatus(
    (typeof liveAttrs?.status === 'string' && liveAttrs.status) ||
      (typeof liveAttrs?.state === 'string' && liveAttrs.state) ||
      (typeof liveAttrs?.activity === 'string' && liveAttrs.activity) ||
      liveEntity?.state,
    status
  );
  const {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    handleStartCleaning,
    handlePause,
    handleReturnHome,
  } = useVacuumControl({ entityId: id, initialStatus: liveStatus });
  const liveName =
    typeof liveAttrs?.friendly_name === 'string' && liveAttrs.friendly_name.length > 0
      ? normalizeVacuumDisplayName(liveAttrs.friendly_name)
      : normalizeVacuumDisplayName(name);
  const glanceMetrics = resolveVacuumGlanceMetrics({
    vacuumEntity: liveEntity,
    vacuumEntityId: id,
    fallbackBattery: battery,
    fallbackNextCleaning: nextCleaning,
    fallbackWaterLevel: waterLevel,
    fallbackBinLevel: binLevel,
    use24HourTime,
    entities: allEntities,
    entityRegistry,
  });
  const liveBattery = glanceMetrics.battery;
  const displayStatus: VacuumStatus =
    currentStatus === 'docked' || currentStatus === 'charging'
      ? liveBattery >= 100
        ? 'charging-complete'
        : 'charging'
      : currentStatus;
  const liveRoom =
    typeof liveAttrs?.current_room === 'string' && liveAttrs.current_room.length > 0
      ? liveAttrs.current_room
      : typeof liveAttrs?.current_zone === 'string' && liveAttrs.current_zone.length > 0
        ? liveAttrs.current_zone
        : typeof liveAttrs?.room === 'string' && liveAttrs.room.length > 0
          ? liveAttrs.room
          : room;
  const liveCleanedAreaValue =
    parseNumberish(liveAttrs?.cleaned_area) ??
    parseNumberish(liveAttrs?.cleaned_area_today) ??
    parseNumberish(liveAttrs?.last_cleaned_area);
  const liveCleanedArea =
    typeof liveCleanedAreaValue === 'number'
      ? `${liveCleanedAreaValue.toFixed(liveCleanedAreaValue >= 10 ? 0 : 1)} m²`
      : cleanedArea;
  const liveCleaningTimeMinutes =
    parseNumberish(liveAttrs?.cleaning_time) ??
    parseNumberish(liveAttrs?.clean_time) ??
    parseNumberish(liveAttrs?.cleaning_duration);
  const liveCleaningTime =
    typeof liveCleaningTimeMinutes === 'number'
      ? `${Math.max(0, Math.round(liveCleaningTimeMinutes))} min`
      : cleaningTime;
  const liveFanSpeed = typeof liveAttrs?.fan_speed === 'string' ? liveAttrs.fan_speed : undefined;
  const liveFanSpeeds =
    readStringList(liveAttrs?.fan_speed_list) ??
    readStringList(liveAttrs?.fan_speeds) ??
    readStringList(liveAttrs?.preset_modes);
  const liveCleaningMode =
    typeof liveAttrs?.cleaning_mode === 'string'
      ? liveAttrs.cleaning_mode
      : typeof liveAttrs?.clean_mode === 'string'
        ? liveAttrs.clean_mode
        : undefined;
  const availableRooms =
    readStringList(liveAttrs?.rooms) ??
    readStringList(liveAttrs?.room_names) ??
    readStringList(liveAttrs?.segments);
  const availableZones =
    readStringList(liveAttrs?.zones) ??
    readStringList(liveAttrs?.zone_names) ??
    readStringList(liveAttrs?.available_zones);
  const { theme, colors, accentColor } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const { t } = useI18n();
  const isActive =
    displayStatus === 'cleaning' || displayStatus === 'mopping' || displayStatus === 'returning';
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const vacuumThemeStatus = getVacuumThemeStatus(displayStatus);
  const cardColors = colors.vacuum[vacuumThemeStatus];
  const activeShellBackgroundClassName = isActive ? `bg-gradient-to-br ${cardColors.gradient}` : '';
  const frameClassName = `${cardShell.rootFrameClassName} ${activeShellBackgroundClassName} ${cardColors.border} ${stateSurface.containerClassName}`;

  const isSmall = isCompactCardSize(resolvedSize);
  const actionRowPaddingClassName = isSmall ? 'pt-2' : 'pt-4';
  const metricStackClassName = cn('flex flex-1 flex-col justify-end', isSmall ? 'gap-2' : 'gap-3');
  const surface = getThemeSurfaceTokens(theme);
  const statusLabel = t(getVacuumStatusLabelKey(displayStatus));
  const headerTone =
    displayStatus === 'returning'
      ? 'purple'
      : displayStatus === 'cleaning' || displayStatus === 'mopping'
        ? 'primary'
        : 'neutral';
  const areaMetric = splitMetricValue(liveCleanedArea);
  const runTimeMetric = splitMetricValue(liveCleaningTime);
  const metricItems: VacuumMetricItem[] = [
    {
      key: 'battery',
      icon: Battery,
      value: String(liveBattery),
      unit: '%',
      label: t('vacuum.settings.battery'),
    },
    {
      key: 'area',
      icon: MapIcon,
      value: areaMetric.value,
      unit: areaMetric.unit,
      label: t('vacuum.metric.area'),
    },
    {
      key: 'runtime',
      icon: Clock3,
      value: runTimeMetric.value,
      unit: runTimeMetric.unit,
      label: t('vacuum.metric.runTime'),
    },
  ];
  const subtitle = `${t('vacuum.subtitle')} · ${statusLabel}`;
  return (
    <div className="h-full w-full relative">
      <BaseCard
        size={resolvedSize}
        frameClassName={frameClassName}
        disableDefaultSheen
        overlay={
          <>
            {isActive ? (
              <div
                className={`absolute inset-0 bg-gradient-to-br ${cardColors.glow} to-transparent`}
              />
            ) : null}
            {stateSurface.overlayClassName ? (
              <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
            ) : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative h-full flex flex-col">
          <EntityCardHeader
            title={liveName}
            subtitle={subtitle}
            layout="eyebrow-first"
            size={resolvedSize}
            accentColor={cardColors.accent}
            tone={headerTone}
            leading={
              <EntityCardHeaderIcon
                IconComponent={Bot}
                isActive={isActive}
                size={resolvedSize}
                baseColor={cardColors.accent}
                tone={headerTone}
              />
            }
          />

          <div className="flex flex-1 flex-col">
            <div className={metricStackClassName}>
              <VacuumMetricGrid
                metrics={metricItems}
                accentClassName={cardColors.accent}
                surfaceTextClassName={surface.textSubtle}
                size={resolvedSize}
              />
            </div>

            <div className={cn(actionRowPaddingClassName, isSmall && 'mt-auto')}>
              {isSmall ? (
                <VacuumControlsSmall
                  currentStatus={currentStatus}
                  onStartCleaning={handleStartCleaning}
                  onPause={handlePause}
                  onReturnHome={handleReturnHome}
                  onOpenSettings={() => setIsDialogOpen(true)}
                  theme={theme}
                />
              ) : (
                <VacuumControlsMedium
                  currentStatus={currentStatus}
                  onStartCleaning={handleStartCleaning}
                  onPause={handlePause}
                  onReturnHome={handleReturnHome}
                  onOpenSettings={() => setIsDialogOpen(true)}
                  theme={theme}
                />
              )}
            </div>
          </div>
        </div>
      </BaseCard>

      {isDialogOpen ? (
        <VacuumSettingsDialog
          entityId={id}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onStartCleaning={handleStartCleaning}
          onPauseCleaning={handlePause}
          onReturnHome={handleReturnHome}
          name={liveName}
          room={liveRoom}
          theme={theme}
          accentColorValue={accentColor}
          currentStatus={displayStatus}
          battery={liveBattery}
          cleanedArea={liveCleanedArea}
          cleaningTime={liveCleaningTime}
          cleaningMode={
            liveCleaningMode === 'spot' ||
            liveCleaningMode === 'edge' ||
            liveCleaningMode === 'room' ||
            liveCleaningMode === 'auto'
              ? liveCleaningMode
              : 'auto'
          }
          fanSpeed={liveFanSpeed}
          fanSpeeds={liveFanSpeeds}
          availableRooms={availableRooms}
          availableZones={availableZones}
        />
      ) : null}
    </div>
  );
});
