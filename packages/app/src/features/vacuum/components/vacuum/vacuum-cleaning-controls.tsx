import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { useI18n } from '@navet/app/hooks';
import { Crosshair, Home, Sparkles } from 'lucide-react';
import type { VacuumCapabilities } from './vacuum-features';

interface VacuumCleaningControlsProps {
  isLawnMower?: boolean;
  fanSpeed: string;
  onFanSpeedChange: (speed: string) => void;
  fanSpeedOptions: string[];
  supportsFanSpeed: boolean;
  isUpdatingFanSpeed?: boolean;
  onReturnHome: () => void;
  onLocate?: () => void;
  onCleanSpot?: () => void;
  capabilities?: VacuumCapabilities;
  accentColor?: string;
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
  isLawnMower = false,
  fanSpeed,
  onFanSpeedChange,
  fanSpeedOptions,
  supportsFanSpeed,
  isUpdatingFanSpeed = false,
  onReturnHome,
  onLocate,
  onCleanSpot,
  capabilities,
  accentColor,
}: VacuumCleaningControlsProps) {
  const { t } = useI18n();
  const returnActionLabel = t(
    isLawnMower ? 'lawnMower.action.returnToBase' : 'vacuum.action.returnToDock'
  );
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
            accentColor={accentColor}
            onClick={onReturnHome}
            size="compact"
            className="min-w-24"
          >
            <Home className="mr-1.5 h-3.5 w-3.5" />
            {returnActionLabel}
          </CardDialogChoicePill>
        </CardDialogSection>
      ) : null}

      {hasSecondaryActions ? (
        <CardDialogSection label={t('vacuum.settings.moreActions')} className="mb-0">
          <div className="flex flex-wrap gap-2">
            {capabilities?.canLocate ? (
              <CardDialogChoicePill
                active={false}
                accentColor={accentColor}
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
                accentColor={accentColor}
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
                accentColor={accentColor}
                onClick={() => {
                  if (!isUpdatingFanSpeed) {
                    onFanSpeedChange(speed);
                  }
                }}
                size="compact"
                className="min-w-18"
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
