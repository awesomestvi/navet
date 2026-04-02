import { Home, Pause, Play } from 'lucide-react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { VacuumStatus } from './vacuum-utils';

interface VacuumControlsCompactProps {
  currentStatus: VacuumStatus;
  onStartCleaning: () => void;
  onPause: () => void;
  onReturnHome: () => void;
  onOpenSettings: () => void;
  theme: ThemeType;
  accentColorValue: string;
}

export function VacuumControlsCompact({
  currentStatus,
  onStartCleaning,
  onPause,
  onReturnHome,
  onOpenSettings,
  theme,
  accentColorValue,
}: VacuumControlsCompactProps) {
  const { t } = useI18n();
  return (
    <CardActionRow
      theme={theme}
      size="medium"
      leftContent={
        <>
          {currentStatus === 'cleaning' ? (
            <RoundControlButton
              theme={theme}
              size="medium"
              variant="neutral"
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
              variant="emphasis"
              onClick={onStartCleaning}
              aria-label={t('vacuum.action.startCleaning')}
              className="shadow-lg"
              style={{
                backgroundColor: accentColorValue,
                boxShadow: `0 8px 18px ${accentColorValue}45`,
              }}
            >
              <Play className="h-3.5 w-3.5 text-white" />
            </RoundControlButton>
          )}
          <RoundControlButton
            theme={theme}
            size="medium"
            variant="neutral"
            onClick={onReturnHome}
            aria-label={t('vacuum.action.returnToDock')}
            className="transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
          </RoundControlButton>
        </>
      }
      rightContent={
        <CardSettingsActionButton
          theme={theme}
          size="medium"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
        />
      }
    />
  );
}
