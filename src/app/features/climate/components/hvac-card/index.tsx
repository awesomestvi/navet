import { Flame, Snowflake, Thermometer, Wind } from 'lucide-react';
import { memo } from 'react';
import { CardActionRow } from '@/app/components/patterns/card-action-row';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { CardSettingsActionButton } from '@/app/components/shared/card-settings-action-button';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { useI18n, useTheme } from '@/app/hooks';
import { HVACSettingsDialog } from '../hvac-settings-dialog';
import type { HVACCardProps } from './hvac-card.types';
import { HVACGauge } from './hvac-gauge';
import { HVACModeControls } from './hvac-mode-controls';
import { HVACTempControls } from './hvac-temp-controls';
import { useHVACCardController } from './use-hvac-card-controller';

export const HVACCard = memo(function HVACCard({
  id,
  name,
  room,
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
  const targetTemperatureLabel =
    controller.targetTemp < controller.currentTemp
      ? t('climate.coolingDownTo', { temp: controller.targetTemp })
      : t('climate.heatingTo', { temp: controller.targetTemp });
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
  const HeaderIcon =
    controller.visualMode === 'heat'
      ? Flame
      : controller.visualMode === 'cool'
        ? Snowflake
        : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
          ? Wind
          : Thermometer;

  return (
    <>
      <CardWrapper
        interactionProps={controller.cardInteraction.cardProps}
        className={`bg-gradient-to-br ${controller.cardColors.gradient} ${controller.cardColors.border} p-4 ${stateSurface.containerClassName}`}
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
              <div className="flex h-full flex-col gap-2">
                <div className="mt-auto">
                  <div
                    className={`text-3xl font-bold ${stateSurface.primaryTextClassName} leading-none transition-colors duration-500 mb-1`}
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

                <div className="pt-2">
                  <CardActionRow
                    theme={controller.theme}
                    size="small"
                    leftContent={
                      <HVACTempControls
                        targetTemp={controller.targetTemp}
                        onTempChange={controller.setTargetTemp}
                        isOn={controller.isOn}
                        size="small"
                      />
                    }
                    rightContent={
                      <CardSettingsActionButton
                        {...controller.cardInteraction.settingsButtonProps}
                        theme={controller.theme}
                        size="small"
                        tone={controller.isOn ? 'default' : 'muted'}
                        variant="soft"
                      />
                    }
                  />
                </div>
              </div>
            ) : controller.isMedium ? (
              <div className="flex h-full flex-col">
                <div className="mt-auto">
                  <div
                    className={`text-3xl font-bold ${stateSurface.primaryTextClassName} leading-none transition-colors duration-500 mb-1`}
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

                <div className="pt-4">
                  <CardActionRow
                    theme={controller.theme}
                    size="medium"
                    leftContent={
                      <>
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
                      </>
                    }
                    rightContent={
                      <CardSettingsActionButton
                        {...controller.cardInteraction.settingsButtonProps}
                        theme={controller.theme}
                        size="medium"
                        tone={controller.isOn ? 'default' : 'muted'}
                        variant="soft"
                      />
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex-1 flex items-center justify-center">
                  <div className="relative flex items-end gap-4">
                    <div className="mb-8">
                      <HVACTempControls
                        targetTemp={controller.targetTemp}
                        onTempChange={controller.setTargetTemp}
                        isOn={controller.isOn}
                        size="large"
                      />
                    </div>

                    <HVACGauge
                      id={id}
                      mode={controller.visualMode}
                      targetTemp={controller.targetTemp}
                      currentTemp={controller.currentTemp}
                      isOn={controller.isOn}
                    />

                    <div className="w-12 h-12 mb-8" />
                  </div>
                </div>

                <div className="pt-4">
                  <CardActionRow
                    theme={controller.theme}
                    size="large"
                    leftContent={
                      <div className="flex items-center gap-3">
                        <div
                          className={`text-xs ${stateSurface.secondaryTextClassName}`}
                          style={{ color: readableTokens.subtitleColor }}
                        >
                          {t('climate.mode')}
                        </div>
                        <HVACModeControls
                          mode={controller.visualMode}
                          isOn={controller.isOn}
                          onModeChange={controller.setMode}
                          size="large"
                        />
                      </div>
                    }
                    rightContent={
                      <CardSettingsActionButton
                        {...controller.cardInteraction.settingsButtonProps}
                        theme={controller.theme}
                        size="large"
                        tone={controller.isOn ? 'default' : 'muted'}
                        variant="soft"
                      />
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
          room={room}
          isOn={controller.isOn}
          mode={controller.mode}
          targetTemp={controller.targetTemp}
          currentTemp={controller.currentTemp}
          onModeChange={controller.setMode}
          onTogglePower={() => controller.setIsOn(!controller.isOn)}
        />
      ) : null}
    </>
  );
});
