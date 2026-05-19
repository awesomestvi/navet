import { memo } from 'react';
import { CardActionRow, CardActionRowGroup } from '@/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import type { ThemeType } from '@/app/hooks';
import { HVACModeControls } from '../hvac-mode-controls';
import { HVACTempControls } from '../hvac-temp-controls';
import type { HVACCardController } from '../use-hvac-card-controller';

interface HVACCardMediumLayoutProps {
  controller: HVACCardController;
  targetTemperatureLabel: string;
  readableTokens: {
    titleColor: string;
    subtitleColor: string;
  };
  stateSurface: {
    primaryTextClassName: string;
    secondaryTextClassName: string;
    containerClassName: string;
  };
  theme: ThemeType;
}

export const HVACCardMediumLayout = memo(function HVACCardMediumLayout({
  controller,
  targetTemperatureLabel,
  readableTokens,
  stateSurface,
  theme,
}: HVACCardMediumLayoutProps) {
  return (
    <div className="relative flex h-full flex-col">
      {/* Gauge would be rendered here - kept in parent for positioning */}
      <div className="mt-auto inline-flex w-fit flex-col self-start">
        <div className="min-w-0">
          <div
            className={`mb-1 text-3xl font-bold leading-none transition-colors duration-500 ${stateSurface.primaryTextClassName}`}
            style={{ color: readableTokens.titleColor }}
          >
            {controller.formatTemperature(controller.currentTemp)}
          </div>
          <div
            className={`text-xs ${stateSurface.secondaryTextClassName}`}
            style={{ color: readableTokens.subtitleColor }}
          >
            {targetTemperatureLabel}
          </div>
        </div>
      </div>

      <div className="pt-4">
        <CardActionRow
          theme={theme}
          size="medium"
          leftContent={
            <div className="relative z-[3]">
              <CardActionRowGroup>
                <HVACTempControls
                  targetTemp={controller.displayTargetTemp}
                  onTempChange={controller.setDisplayTargetTemp}
                  onTempCommit={controller.commitDisplayTargetTemp}
                  isOn={controller.isOn}
                  size="medium"
                  minTemp={controller.displayMinTemp}
                  maxTemp={controller.displayMaxTemp}
                  step={controller.displayStep}
                />
                <HVACModeControls
                  mode={controller.visualMode}
                  isOn={controller.isOn}
                  onModeChange={controller.setMode}
                  supportedHvacModes={controller.supportedHvacModes}
                  size="medium"
                />
              </CardActionRowGroup>
            </div>
          }
          rightContent={
            <div className="relative z-[3]">
              <CardSettingsActionButton
                {...controller.cardInteraction.settingsButtonProps}
                theme={theme}
                size="medium"
                tone={controller.isOn ? 'default' : 'muted'}
                variant="soft"
              />
            </div>
          }
        />
      </div>
    </div>
  );
});
