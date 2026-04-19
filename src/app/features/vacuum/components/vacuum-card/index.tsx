import { Bot } from 'lucide-react';
import { memo } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useVacuumControl } from '../vacuum/use-vacuum-control';
import { VacuumControlsLarge } from '../vacuum/vacuum-controls-large';
import { VacuumControlsMedium } from '../vacuum/vacuum-controls-medium';
import { VacuumControlsSmall } from '../vacuum/vacuum-controls-small';
import { VacuumSettingsDialog } from '../vacuum/vacuum-settings-dialog';
import { VacuumStatusDisplay } from '../vacuum/vacuum-status-display';
import {
  getVacuumThemeStatus,
  normalizeVacuumStatus,
  type VacuumStatus,
} from '../vacuum/vacuum-utils';

type VacuumCardSize = 'small' | 'medium' | 'large';

interface VacuumCardProps {
  id: string;
  name: string;
  status: VacuumStatus;
  battery: number;
  cleaningProgress?: number;
  cleanedArea?: string;
  cleaningTime?: string;
  room?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function normalizeVacuumCardSize(size: CardSize): VacuumCardSize {
  if (size === 'small' || size === 'medium' || size === 'large') {
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

export const VacuumCard = memo(function VacuumCard({
  id,
  name,
  status,
  battery,
  cleaningProgress,
  cleanedArea = '0 m²',
  cleaningTime = '0 min',
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
  const liveStatus = normalizeVacuumStatus(liveEntity?.state, status);
  const {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    handleStartCleaning,
    handlePause,
    handleReturnHome,
  } = useVacuumControl({ initialStatus: liveStatus });
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveName =
    typeof liveAttrs?.friendly_name === 'string' && liveAttrs.friendly_name.length > 0
      ? normalizeVacuumDisplayName(liveAttrs.friendly_name)
      : normalizeVacuumDisplayName(name);
  const liveBattery =
    parseNumberish(liveAttrs?.battery_level) ??
    parseNumberish(liveAttrs?.battery) ??
    parseNumberish(liveAttrs?.battery_percent) ??
    battery;
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
  const areaBasedCleaningProgress = (() => {
    const totalAreaValue =
      parseNumberish(liveAttrs?.total_clean_area) ??
      parseNumberish(liveAttrs?.clean_area_total) ??
      parseNumberish(liveAttrs?.total_area);

    if (
      typeof liveCleanedAreaValue === 'number' &&
      typeof totalAreaValue === 'number' &&
      totalAreaValue > 0
    ) {
      return Math.max(0, Math.min(100, (liveCleanedAreaValue / totalAreaValue) * 100));
    }

    return undefined;
  })();
  const liveCleaningProgress =
    parseNumberish(liveAttrs?.cleaning_progress) ??
    parseNumberish(liveAttrs?.clean_progress) ??
    parseNumberish(liveAttrs?.progress) ??
    parseNumberish(liveAttrs?.cleaned_percentage) ??
    parseNumberish(liveAttrs?.cleaning_percentage) ??
    parseNumberish(liveAttrs?.clean_percent) ??
    parseNumberish(liveAttrs?.completed_percentage) ??
    areaBasedCleaningProgress ??
    cleaningProgress;
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
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const { t } = useI18n();
  const isActive = currentStatus !== 'idle';
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const cardColors = colors.vacuum[getVacuumThemeStatus(currentStatus)];

  const isSmall = isCompactCardSize(resolvedSize);
  const isMedium = resolvedSize === 'medium';
  const padding = 'p-3';

  return (
    <div className="h-full w-full relative">
      <div
        className={`relative h-full bg-gradient-to-br ${cardColors.gradient} ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} ${cardColors.border} overflow-hidden ${stateSurface.containerClassName}`}
      >
        {isActive && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${cardColors.glow} to-transparent`}
          ></div>
        )}

        {stateSurface.overlayClassName && (
          <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
        )}

        <div className="relative h-full flex flex-col">
          <EntityCardHeader
            title={liveName}
            subtitle={t('vacuum.subtitle')}
            layout="eyebrow-first"
            size={resolvedSize}
            accentColor={cardColors.accent}
            tone={
              currentStatus === 'returning'
                ? 'purple'
                : currentStatus === 'paused'
                  ? 'yellow'
                  : currentStatus === 'cleaning' || currentStatus === 'docked'
                    ? 'primary'
                    : 'neutral'
            }
            leading={
              <EntityCardHeaderIcon
                IconComponent={Bot}
                isActive={isActive}
                size={resolvedSize}
                baseColor={cardColors.accent}
                tone={
                  currentStatus === 'returning'
                    ? 'purple'
                    : currentStatus === 'paused'
                      ? 'yellow'
                      : currentStatus === 'cleaning' || currentStatus === 'docked'
                        ? 'primary'
                        : 'neutral'
                }
              />
            }
          />

          <div className={`flex-1 flex flex-col ${isMedium ? 'justify-end' : ''}`}>
            <div className={isMedium ? 'mt-auto' : ''}>
              <VacuumStatusDisplay
                currentStatus={currentStatus}
                battery={liveBattery}
                cleaningProgress={liveCleaningProgress}
                room={liveRoom}
                theme={theme}
                accentColorValue={cardColors.accent}
                isSmall={isSmall}
                isMedium={isMedium}
              />
            </div>

            <div className={isMedium ? 'pt-3' : 'mt-auto pt-4'}>
              {isSmall ? (
                <VacuumControlsSmall
                  currentStatus={currentStatus}
                  onStartCleaning={handleStartCleaning}
                  onPause={handlePause}
                  onReturnHome={handleReturnHome}
                  onOpenSettings={() => setIsDialogOpen(true)}
                  theme={theme}
                  accentColorValue={cardColors.accent}
                />
              ) : isMedium ? (
                <VacuumControlsMedium
                  currentStatus={currentStatus}
                  onStartCleaning={handleStartCleaning}
                  onPause={handlePause}
                  onReturnHome={handleReturnHome}
                  onOpenSettings={() => setIsDialogOpen(true)}
                  theme={theme}
                  accentColorValue={cardColors.accent}
                />
              ) : (
                <VacuumControlsLarge
                  currentStatus={currentStatus}
                  onStartCleaning={handleStartCleaning}
                  onPause={handlePause}
                  onReturnHome={handleReturnHome}
                  onOpenSettings={() => setIsDialogOpen(true)}
                  theme={theme}
                  accentColorValue={cardColors.accent}
                />
              )}
            </div>
          </div>
        </div>
      </div>

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
          accentColorValue={cardColors.accent}
          currentStatus={currentStatus}
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
          surfaceGradientClassName={cardColors.gradient}
          surfaceBorderClassName={theme !== 'dark' ? cardColors.border : undefined}
          surfaceBackdropClassName={cardShell.backdropClassName}
          surfaceStateClassName={stateSurface.containerClassName}
          surfaceGlowClassName={isActive ? cardColors.glow : undefined}
          surfaceOverlayClassName={stateSurface.overlayClassName ?? undefined}
        />
      ) : null}
    </div>
  );
});
