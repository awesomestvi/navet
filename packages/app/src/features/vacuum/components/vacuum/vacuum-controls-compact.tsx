import { CardActionRow } from '@navet/app/components/patterns/card-action-row';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { HousePlug, Pause, Play } from 'lucide-react';
import type { VacuumStatus } from './vacuum-utils';

interface VacuumControlsCompactProps {
  currentStatus: VacuumStatus;
  onStartCleaning: () => void;
  onPause: () => void;
  onReturnHome: () => void;
  onOpenSettings: () => void;
  theme: ThemeType;
}

export function VacuumControlsCompact({
  currentStatus,
  onStartCleaning,
  onPause,
  onReturnHome,
  onOpenSettings,
  theme,
}: VacuumControlsCompactProps) {
  const { t } = useI18n();
  return (
    <CardActionRow
      theme={theme}
      size="medium"
      leftContent={
        <>
          {currentStatus === 'cleaning' || currentStatus === 'mopping' ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onPause}
              aria-label={t('vacuum.action.pause')}
              className="transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
            </RoundControlButton>
          ) : (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="soft"
              onClick={onStartCleaning}
              aria-label={t('vacuum.action.startCleaning')}
              className="transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
            </RoundControlButton>
          )}
          <RoundControlButton
            theme={theme}
            size="medium"
            variant="soft"
            onClick={onReturnHome}
            aria-label={t('vacuum.action.returnToDock')}
            className="transition-colors"
          >
            <HousePlug className="h-3.5 w-3.5" />
          </RoundControlButton>
        </>
      }
      rightContent={
        <CardSettingsActionButton
          theme={theme}
          size="medium"
          variant="soft"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
        />
      }
    />
  );
}
