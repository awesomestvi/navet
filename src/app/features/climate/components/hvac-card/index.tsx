import { Flame, Snowflake, Thermometer, Wind } from 'lucide-react';
import { memo } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCardStateSurfaceStyleTokens,
  getCardStateSurfaceTokens,
} from '@/app/components/shared/theme/card-state-surface-tokens';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { cn } from '@/app/components/ui/utils';
import { useI18n, useTheme } from '@/app/hooks';
import { getHvacTemperatureStatusLabel } from '../../utils/hvac-temperature-status-label';
import { HVACSettingsDialog } from '../hvac-settings-dialog';
import type { HVACCardProps } from './hvac-card.types';
import { HVACGauge } from './hvac-gauge';
import { HVACModeControls } from './hvac-mode-controls';
import { HVACTempControls } from './hvac-temp-controls';
import { useHVACCardController } from './use-hvac-card-controller';

export const HVACCard = memo(function HVACCard({
  id,
  name,
  room: _room,
  initialTemp = 21,
  initialCurrentTemp = 22,
  initialMode = 'cool',
  initialAction,
  initialState = true,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: HVACCardProps) {
  const { t } = useI18n();
  const { accentColor } = useTheme();
  const controller = useHVACCardController({
    id,
    name,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    initialState,
    isEditMode,
    size,
  });
  const cardShell = getCardShellSurfaceTokens(controller.theme);
  const stateSurface = getCardStateSurfaceTokens(controller.theme, controller.isOn);
  const targetTemperatureLabel = getHvacTemperatureStatusLabel(
    t,
    controller.targetTemp,
    controller.currentTemp
  );
  const tone = !controller.isOn
    ? 'neutral'
    : controller.visualMode === 'heat'
      ? 'orange'
      : controller.visualMode === 'cool'
        ? 'cyan'
        : 'blue';
  const readableTokens = getCardReadableTextTokens({
    theme: controller.theme,
    tone,
    accentColor,
  });
  const stateSurfaceStyle = getCardStateSurfaceStyleTokens({
    theme: controller.theme,
    isActive: controller.isOn,
    baseColor:
      controller.visualMode === 'heat'
        ? '#f97316'
        : controller.visualMode === 'cool'
          ? '#06b6d4'
          : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
            ? '#3b82f6'
            : accentColor,
    borderAlphaHex:
      controller.visualMode === 'heat'
        ? '40'
        : controller.visualMode === 'cool'
          ? '3a'
          : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
            ? '36'
            : '47',
    tintMidAlphaHex:
      controller.visualMode === 'heat'
        ? '12'
        : controller.visualMode === 'cool'
          ? '10'
          : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
            ? '10'
            : '14',
    tintEndAlphaHex:
      controller.visualMode === 'heat'
        ? '24'
        : controller.visualMode === 'cool'
          ? '1f'
          : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
            ? '1d'
            : '26',
    radialAlphaHex:
      controller.visualMode === 'heat'
        ? '28'
        : controller.visualMode === 'cool'
          ? '24'
          : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
            ? '22'
            : '30',
  });
  const HeaderIcon =
    controller.visualMode === 'heat'
      ? Flame
      : controller.visualMode === 'cool'
        ? Snowflake
        : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
          ? Wind
          : Thermometer;
  const temperaturePresets = [18, 21, 24];

  return (
    <>
      <CardWrapper
        interactionProps={controller.cardInteraction.cardProps}
        className={`bg-gradient-to-br ${controller.cardColors.gradient} ${controller.cardColors.border} p-4 ${stateSurface.containerClassName}`}
        style={stateSurfaceStyle.cardStyle}
        lightOverlayClassName={controller.lightOverlay}
        showShadow={controller.isOn && controller.theme !== 'light'}
      >
        {controller.isOn && (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${controller.cardColors.glow} to-transparent transition-all duration-500`}
          />
        )}

        {cardShell.sheenOverlayClassName ? (
          <div className={cardShell.sheenOverlayClassName} />
        ) : null}
        {stateSurfaceStyle.innerOverlayClassName ? (
          <div
            className={stateSurfaceStyle.innerOverlayClassName}
            style={stateSurfaceStyle.innerOverlayStyle}
          />
        ) : null}
        {stateSurfaceStyle.shineOverlayClassName ? (
          <div className={stateSurfaceStyle.shineOverlayClassName} />
        ) : null}

        {stateSurface.overlayClassName && (
          <div className={`absolute inset-0 ${stateSurface.overlayClassName}`} />
        )}

        <div className="relative z-[2] h-full flex flex-col">
          <EntityCardHeader
            title={name}
            subtitle={t('climate.subtitle')}
            layout="eyebrow-first"
            size={size}
            tone={tone}
            titleClassName={stateSurface.primaryTextClassName}
            subtitleClassName={stateSurface.mutedTextClassName}
            leading={
              <EntityCardHeaderIcon
                IconComponent={HeaderIcon}
                isActive={controller.isOn}
                size={size}
                tone={tone}
                ariaLabel={controller.cardInteraction.iconButtonProps['aria-label']}
                onClick={controller.cardInteraction.iconButtonProps.onClick}
              />
            }
          />

          <div className="flex-1">
            {controller.isSmall ? (
              <div className="relative flex h-full flex-col gap-2">
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.targetTemp}
                  currentTemp={controller.currentTemp}
                  isOn={controller.isOn}
                  onTargetTempChange={controller.setTargetTemp}
                  variant="docked-card-small"
                  className="pointer-events-auto absolute right-[-1.9rem] top-[36%] z-[2] -translate-y-1/2"
                />

                <div className="mt-auto inline-flex w-fit flex-col self-start">
                  <div className="min-w-0">
                    <div
                      className={`mb-1 text-3xl font-bold leading-none transition-colors duration-500 ${stateSurface.primaryTextClassName}`}
                      style={{ color: readableTokens.titleColor }}
                    >
                      {controller.currentTemp}°C
                    </div>
                    <div
                      className={`text-xs ${stateSurface.secondaryTextClassName}`}
                      style={{ color: readableTokens.subtitleColor }}
                    >
                      {targetTemperatureLabel}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <CardActionRow
                    theme={controller.theme}
                    size="small"
                    leftContent={
                      <div className="relative z-[3] flex items-center gap-1">
                        <HVACTempControls
                          targetTemp={controller.targetTemp}
                          onTempChange={controller.setTargetTemp}
                          isOn={controller.isOn}
                          size="small"
                        />
                      </div>
                    }
                    rightContent={
                      <div className="relative z-[3]">
                        <CardSettingsActionButton
                          {...controller.cardInteraction.settingsButtonProps}
                          theme={controller.theme}
                          size="small"
                          tone={controller.isOn ? 'default' : 'muted'}
                          variant="soft"
                        />
                      </div>
                    }
                  />
                </div>
              </div>
            ) : controller.isMedium ? (
              <div className="relative flex h-full flex-col">
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.targetTemp}
                  currentTemp={controller.currentTemp}
                  isOn={controller.isOn}
                  onTargetTempChange={controller.setTargetTemp}
                  variant="docked-card-small"
                  className="pointer-events-auto absolute right-[-0.25rem] top-[36%] z-[2] -translate-y-1/2"
                />

                <div className="mt-auto inline-flex w-fit flex-col self-start">
                  <div className="min-w-0">
                    <div
                      className={`mb-1 text-3xl font-bold leading-none transition-colors duration-500 ${stateSurface.primaryTextClassName}`}
                      style={{ color: readableTokens.titleColor }}
                    >
                      {controller.currentTemp}°C
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
                    theme={controller.theme}
                    size="medium"
                    leftContent={
                      <div className="relative z-[3] flex items-center gap-2">
                        <HVACTempControls
                          targetTemp={controller.targetTemp}
                          onTempChange={controller.setTargetTemp}
                          isOn={controller.isOn}
                          size="medium"
                        />
                        <HVACModeControls
                          mode={controller.visualMode}
                          isOn={controller.isOn}
                          onModeChange={controller.setMode}
                          size="medium"
                        />
                      </div>
                    }
                    rightContent={
                      <div className="relative z-[3]">
                        <CardSettingsActionButton
                          {...controller.cardInteraction.settingsButtonProps}
                          theme={controller.theme}
                          size="medium"
                          tone={controller.isOn ? 'default' : 'muted'}
                          variant="soft"
                        />
                      </div>
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="relative flex h-full flex-col">
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.targetTemp}
                  currentTemp={controller.currentTemp}
                  isOn={controller.isOn}
                  onTargetTempChange={controller.setTargetTemp}
                  variant="docked-card"
                  className="pointer-events-auto absolute right-[-3.4rem] top-[38%] z-[2] -translate-y-1/2"
                />

                <div className="flex flex-1 flex-col">
                  <div className="mt-4 inline-flex w-fit max-w-[58%] flex-col">
                    <div
                      className={`mb-1 text-4xl font-bold leading-none transition-colors duration-500 ${stateSurface.primaryTextClassName}`}
                      style={{ color: readableTokens.titleColor }}
                    >
                      {controller.currentTemp}°C
                    </div>
                    <div
                      className={`text-sm ${stateSurface.secondaryTextClassName}`}
                      style={{ color: readableTokens.subtitleColor }}
                    >
                      {targetTemperatureLabel}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="mb-4 flex max-w-[72%] items-center gap-2">
                      {temperaturePresets.map((preset) => {
                        const isSelected = Math.abs(controller.targetTemp - preset) < 0.05;

                        return (
                          <button
                            type="button"
                            key={preset}
                            onClick={(event) => {
                              event.stopPropagation();
                              controller.setTargetTemp(preset);
                            }}
                            className={cn(
                              'relative z-[3] min-w-[4.5rem] rounded-2xl border px-3 py-2 text-sm font-semibold transition-all',
                              isSelected
                                ? 'border-white/20 bg-white/16'
                                : 'border-white/10 bg-white/6 hover:bg-white/10'
                            )}
                            style={{
                              color: isSelected
                                ? readableTokens.titleColor
                                : readableTokens.subtitleColor,
                            }}
                          >
                            {preset}°
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <CardActionRow
                    theme={controller.theme}
                    size="large"
                    leftContent={
                      <div className="relative z-[3] flex items-center gap-2">
                        <HVACTempControls
                          targetTemp={controller.targetTemp}
                          onTempChange={controller.setTargetTemp}
                          isOn={controller.isOn}
                          size="large"
                        />
                        <HVACModeControls
                          mode={controller.visualMode}
                          isOn={controller.isOn}
                          onModeChange={controller.setMode}
                          size="large"
                        />
                      </div>
                    }
                    rightContent={
                      <div className="relative z-[3]">
                        <CardSettingsActionButton
                          {...controller.cardInteraction.settingsButtonProps}
                          theme={controller.theme}
                          size="large"
                          tone={controller.isOn ? 'default' : 'muted'}
                          variant="soft"
                        />
                      </div>
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardWrapper>

      {controller.isSettingsOpen ? (
        <HVACSettingsDialog
          entityId={id}
          isOpen={controller.isSettingsOpen}
          onOpenChange={controller.setIsSettingsOpen}
          name={name}
          isOn={controller.isOn}
          mode={controller.mode}
          targetTemp={controller.targetTemp}
          currentTemp={controller.currentTemp}
          siblingEntities={controller.siblingEntities}
          onTargetTempChange={controller.setTargetTemp}
          onModeChange={controller.setMode}
        />
      ) : null}
    </>
  );
});
