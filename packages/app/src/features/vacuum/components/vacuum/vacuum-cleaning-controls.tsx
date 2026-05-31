import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { Button } from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import { Home, Pause, Play } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { VacuumStatus } from './vacuum-utils';

type CleaningMode = 'auto' | 'spot' | 'edge' | 'room';

interface VacuumCleaningControlsProps {
  cleaningMode: CleaningMode;
  onCleaningModeChange: (mode: CleaningMode) => void;
  fanSpeed: string;
  onFanSpeedChange: (speed: string) => void;
  fanSpeedOptions: string[];
  currentStatus: VacuumStatus;
  onStartCleaning: () => void;
  onPauseCleaning?: () => void;
  onReturnHome: () => void;
  activePillStyle?: CSSProperties;
  softControlStyle?: CSSProperties;
  activeControlColor: string;
  theme: 'light' | 'dark' | 'glass' | 'black';
}

export function VacuumCleaningControls({
  cleaningMode,
  onCleaningModeChange,
  fanSpeed,
  onFanSpeedChange,
  fanSpeedOptions,
  currentStatus,
  onStartCleaning,
  onPauseCleaning,
  onReturnHome,
  activePillStyle,
  softControlStyle,
  activeControlColor,
  theme,
}: VacuumCleaningControlsProps) {
  const { t } = useI18n();
  const isRunning = currentStatus === 'cleaning' || currentStatus === 'mopping';

  const primaryActionLabel = isRunning
    ? t('vacuum.action.pause')
    : t('vacuum.action.startCleaning');

  const handlePrimaryAction = () => {
    if (isRunning) {
      onPauseCleaning?.();
    } else {
      onStartCleaning();
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-5">
      <CardDialogSection label={t('vacuum.settings.profile')} className="mb-0">
        <div className="flex flex-wrap gap-2">
          {(['auto', 'spot', 'edge', 'room'] as CleaningMode[]).map((mode) => (
            <CardDialogChoicePill
              key={mode}
              active={cleaningMode === mode}
              onClick={() => onCleaningModeChange(mode)}
              size="compact"
              className="min-w-18"
              style={cleaningMode === mode ? activePillStyle : undefined}
            >
              {t(`vacuum.mode.${mode}`)}
            </CardDialogChoicePill>
          ))}
        </div>
      </CardDialogSection>

      <CardDialogSection label={t('vacuum.settings.fanSpeed')} className="mb-0">
        <div className="flex flex-wrap gap-2">
          {fanSpeedOptions.map((speed) => (
            <CardDialogChoicePill
              key={speed}
              active={fanSpeed === speed}
              onClick={() => onFanSpeedChange(speed)}
              size="compact"
              className="min-w-18"
              style={fanSpeed === speed ? activePillStyle : undefined}
            >
              {speed}
            </CardDialogChoicePill>
          ))}
        </div>
      </CardDialogSection>

      <CardDialogSection label={t('vacuum.settings.actions')} className="mb-0">
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="primary"
            size="default"
            leading={isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            onClick={handlePrimaryAction}
            style={{ backgroundColor: activeControlColor }}
          >
            {primaryActionLabel}
          </Button>

          <Button
            variant="secondary"
            size="default"
            leading={<Home className="h-4 w-4" />}
            onClick={onReturnHome}
            className={theme !== 'light' ? 'border-white/10 bg-white/8 hover:bg-white/12' : ''}
            style={softControlStyle}
          >
            {t('vacuum.action.returnToDock')}
          </Button>
        </div>
      </CardDialogSection>
    </div>
  );
}
