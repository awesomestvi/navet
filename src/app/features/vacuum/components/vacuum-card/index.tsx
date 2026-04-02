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
import { getVacuumThemeStatus, type VacuumStatus } from '../vacuum/vacuum-utils';

interface VacuumCardProps {
  id: string;
  name: string;
  status: VacuumStatus;
  battery: number;
  cleanedArea?: string;
  cleaningTime?: string;
  room?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const VacuumCard = memo(function VacuumCard({
  id,
  name,
  status,
  battery,
  cleanedArea = '0 m²',
  cleaningTime = '0 min',
  room = 'Living Room',
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: VacuumCardProps) {
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const liveState = liveEntity?.state;
  const liveStatus: typeof status =
    liveState === 'cleaning' ||
    liveState === 'returning' ||
    liveState === 'docked' ||
    liveState === 'paused' ||
    liveState === 'idle'
      ? liveState
      : status;
  const {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    handleStartCleaning,
    handlePause,
    handleReturnHome,
  } = useVacuumControl({ initialStatus: liveStatus });
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveBattery =
    typeof liveAttrs?.battery_level === 'number' ? liveAttrs.battery_level : battery;
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const { t } = useI18n();
  const isActive = currentStatus === 'cleaning' || currentStatus === 'returning';
  const stateSurface = getCardStateSurfaceTokens(theme, isActive);
  const cardColors = colors.vacuum[getVacuumThemeStatus(currentStatus)];

  const isSmall = isCompactCardSize(size);
  const isMedium = size === 'medium';
  const padding = isSmall ? 'p-4' : 'p-5';

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
            title={name}
            subtitle={t('vacuum.subtitle')}
            layout="eyebrow-first"
            size={size}
            tone={
              currentStatus === 'returning'
                ? 'purple'
                : currentStatus === 'paused'
                  ? 'yellow'
                  : currentStatus === 'cleaning'
                    ? 'primary'
                    : 'neutral'
            }
            leading={
              <EntityCardHeaderIcon
                IconComponent={Bot}
                isActive={currentStatus === 'cleaning' || currentStatus === 'returning'}
                size={size}
                tone={
                  currentStatus === 'returning'
                    ? 'purple'
                    : currentStatus === 'paused'
                      ? 'yellow'
                      : currentStatus === 'cleaning'
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
                cleanedArea={cleanedArea}
                cleaningTime={cleaningTime}
                room={room}
                theme={theme}
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
          onReturnHome={handleReturnHome}
          name={name}
          room={room}
          theme={theme}
          accentColorValue={cardColors.accent}
        />
      ) : null}
    </div>
  );
});
