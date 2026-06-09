import { CardActionRow } from '@navet/app/components/patterns/card-action-row';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Crosshair, HousePlug, Pause, Play, Sparkles, Square, Wind } from 'lucide-react';
import type { VacuumCapabilities } from './vacuum-features';
import type { VacuumStatus } from './vacuum-utils';

interface VacuumControlsCompactProps {
  currentStatus: VacuumStatus;
  onStartCleaning: () => void;
  onPause: () => void;
  onStop: () => void;
  onReturnHome: () => void;
  onLocate: () => void;
  onCleanSpot: () => void;
  onCycleFanSpeed: (fanSpeed: string) => void;
  onOpenSettings: () => void;
  theme: ThemeType;
  capabilities: VacuumCapabilities;
  isUpdatingFanSpeed: boolean;
  disabled?: boolean;
}

export function VacuumControlsCompact({
  currentStatus,
  onStartCleaning,
  onPause,
  onStop,
  onReturnHome,
  onLocate,
  onCleanSpot,
  onCycleFanSpeed,
  onOpenSettings,
  theme,
  capabilities,
  isUpdatingFanSpeed,
  disabled = false,
}: VacuumControlsCompactProps) {
  const { t } = useI18n();
  const isRunning = currentStatus === 'cleaning' || currentStatus === 'mopping';
  const currentFanSpeed = capabilities.currentFanSpeed;
  const canCycleFanSpeed = capabilities.canCycleFanSpeed;
  const handleCycleFanSpeed = () => {
    if (!canCycleFanSpeed || disabled) {
      return;
    }

    const options = capabilities.fanSpeedOptions;
    const currentIndex = currentFanSpeed == null ? -1 : options.indexOf(currentFanSpeed);
    const nextSpeed = options[(currentIndex + 1 + options.length) % options.length];
    if (nextSpeed) {
      onCycleFanSpeed(nextSpeed);
    }
  };
  const fanSpeedLabel = currentFanSpeed
    ? `${t('vacuum.settings.fanSpeed')}: ${currentFanSpeed}`
    : t('vacuum.settings.fanSpeed');
  const runningActionLabel = capabilities.canStop
    ? t('vacuum.action.stop')
    : t('vacuum.action.pause');
  const RunningActionIcon = capabilities.canStop ? Square : Pause;
  const handleRunningAction = capabilities.canStop ? onStop : onPause;

  return (
    <CardActionRow
      theme={theme}
      size="medium"
      leftContent={
        <>
          {isRunning ? (
            capabilities.canPause || capabilities.canStop ? (
              <RoundControlButton
                theme={theme}
                size="medium"
                variant="soft"
                onClick={handleRunningAction}
                aria-label={runningActionLabel}
                disabled={disabled}
                className="transition-colors"
              >
                <RunningActionIcon className="h-3.5 w-3.5" />
              </RoundControlButton>
            ) : null
          ) : capabilities.canStart ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onStartCleaning}
              aria-label={t('vacuum.action.startCleaning')}
              disabled={disabled}
              className="transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : null}
          {capabilities.canReturnHome ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onReturnHome}
              aria-label={t('vacuum.action.returnToDock')}
              disabled={disabled}
              className="transition-colors"
            >
              <HousePlug className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : null}
          {capabilities.canLocate ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onLocate}
              aria-label={t('vacuum.action.locate')}
              disabled={disabled}
              className="transition-colors"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : null}
          {capabilities.canCleanSpot ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onCleanSpot}
              aria-label={t('vacuum.action.cleanSpot')}
              disabled={disabled}
              className="transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : null}
          {canCycleFanSpeed ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={handleCycleFanSpeed}
              aria-label={fanSpeedLabel}
              title={fanSpeedLabel}
              disabled={disabled || isUpdatingFanSpeed}
              className="transition-colors"
            >
              <Wind className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : null}
        </>
      }
      rightContent={
        <CardSettingsActionButton
          theme={theme}
          size="medium"
          variant="soft"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
        />
      }
    />
  );
}
