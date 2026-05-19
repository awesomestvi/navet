import { memo } from 'react';
import { CardActionRow, CardActionRowGroup } from '@/app/components/patterns/card-action-row';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { cn } from '@/app/components/ui/utils';
import type { ThemeType } from '@/app/hooks';
import { HVACModeControls } from '../hvac-mode-controls';
import { HVACTempControls } from '../hvac-temp-controls';
import type { HVACCardController } from '../use-hvac-card-controller';

interface HVACCardLargeLayoutProps {
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

const TEMPERATURE_PRESETS = [18, 21, 24] as const;

export const HVACCardLargeLayout = memo(function HVACCardLargeLayout({
  controller,
  targetTemperatureLabel,
  readableTokens,
  stateSurface,
  theme,
}: HVACCardLargeLayoutProps) {
  return (
    <div className="relative flex h-full flex-col">
      {/* Gauge would be rendered here - kept in parent for positioning */}
      <div className="flex flex-1 flex-col">
        <div className="mt-4 inline-flex w-fit max-w-[58%] flex-col">
          <div
            className={`mb-1 text-4xl font-bold leading-none transition-colors duration-500 ${stateSurface.primaryTextClassName}`}
            style={{ color: readableTokens.titleColor }}
          >
            {controller.formatTemperature(controller.currentTemp)}
          </div>
          <div
            className={`text-sm ${stateSurface.secondaryTextClassName}`}
            style={{ color: readableTokens.subtitleColor }}
          >
            {targetTemperatureLabel}
          </div>
        </div>

        <div className="mt-auto">
          <div className="mb-4 flex max-w-[72%] items-center gap-1.5">
            {TEMPERATURE_PRESETS.map((preset) => {
              const isSelected = Math.abs(controller.targetTemp - preset) < 0.05;

              return (
                <button
                  type="button"
                  key={preset}
                  onClick={(event) => {
                    event.stopPropagation();
                    controller.commitTargetTemp(preset);
                  }}
                  className={cn(
                    'relative z-[3] min-w-[4.5rem] rounded-2xl border px-3 py-2 text-sm font-semibold transition-all',
                    isSelected
                      ? 'border-white/20 bg-white/16'
                      : 'border-white/10 bg-white/6 hover:bg-white/10'
                  )}
                  style={{
                    color: isSelected ? readableTokens.titleColor : readableTokens.subtitleColor,
                  }}
                >
                  {controller.formatTemperatureValue(preset)}°
                </button>
              );
            })}
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
