import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { useI18n } from '@navet/app/hooks';
import { Crosshair, Home, Sparkles } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { VacuumCapabilities } from './vacuum-features';

interface VacuumCleaningControlsProps {
  fanSpeed: string;
  onFanSpeedChange: (speed: string) => void;
  fanSpeedOptions: string[];
  supportsFanSpeed: boolean;
  isUpdatingFanSpeed?: boolean;
  onReturnHome: () => void;
  onLocate?: () => void;
  onCleanSpot?: () => void;
  capabilities?: VacuumCapabilities;
  activePillStyle?: CSSProperties;
}

export function hasVacuumDialogControls(options: {
  supportsFanSpeed: boolean;
  fanSpeedOptions: string[];
  capabilities?: VacuumCapabilities;
}) {
  const canReturnHome = options.capabilities?.canReturnHome ?? false;
  const hasFanSpeedChoices = options.supportsFanSpeed && options.fanSpeedOptions.length > 1;
  const hasSecondaryActions = Boolean(
    options.capabilities?.canLocate || options.capabilities?.canCleanSpot
  );

  return canReturnHome || hasFanSpeedChoices || hasSecondaryActions;
}

export function VacuumCleaningControls({
  fanSpeed,
  onFanSpeedChange,
  fanSpeedOptions,
  supportsFanSpeed,
  isUpdatingFanSpeed = false,
  onReturnHome,
  onLocate,
  onCleanSpot,
  capabilities,
  activePillStyle,
}: VacuumCleaningControlsProps) {
  const { t } = useI18n();
  const canReturnHome = capabilities?.canReturnHome ?? false;
  const hasFanSpeedChoices = supportsFanSpeed && fanSpeedOptions.length > 1;
  const hasSecondaryActions = Boolean(capabilities?.canLocate || capabilities?.canCleanSpot);

  if (
    !hasVacuumDialogControls({
      supportsFanSpeed,
      fanSpeedOptions,
      capabilities,
    })
  ) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-col gap-5">
      {canReturnHome ? (
        <CardDialogSection label={t('vacuum.settings.actions')} className="mb-0">
          <CardDialogChoicePill
            active={false}
            onClick={onReturnHome}
            size="compact"
            className="min-w-24"
          >
            <Home className="mr-1.5 h-3.5 w-3.5" />
            {t('vacuum.action.returnToDock')}
          </CardDialogChoicePill>
        </CardDialogSection>
      ) : null}

      {hasSecondaryActions ? (
        <CardDialogSection label={t('vacuum.settings.moreActions')} className="mb-0">
          <div className="flex flex-wrap gap-2">
            {capabilities?.canLocate ? (
              <CardDialogChoicePill
                active={false}
                onClick={() => onLocate?.()}
                size="compact"
                className="min-w-24"
              >
                <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                {t('vacuum.action.locate')}
              </CardDialogChoicePill>
            ) : null}
            {capabilities?.canCleanSpot ? (
              <CardDialogChoicePill
                active={false}
                onClick={() => onCleanSpot?.()}
                size="compact"
                className="min-w-24"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t('vacuum.action.cleanSpot')}
              </CardDialogChoicePill>
            ) : null}
          </div>
        </CardDialogSection>
      ) : null}

      {hasFanSpeedChoices ? (
        <CardDialogSection label={t('vacuum.settings.fanSpeed')} className="mb-0">
          <div className="flex flex-wrap gap-2">
            {fanSpeedOptions.map((speed) => (
              <CardDialogChoicePill
                key={speed}
                active={fanSpeed === speed}
                onClick={() => {
                  if (!isUpdatingFanSpeed) {
                    onFanSpeedChange(speed);
                  }
                }}
                size="compact"
                className="min-w-18"
                style={fanSpeed === speed ? activePillStyle : undefined}
              >
                {speed}
              </CardDialogChoicePill>
            ))}
          </div>
        </CardDialogSection>
      ) : null}
    </div>
  );
}
