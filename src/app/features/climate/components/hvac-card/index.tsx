import { Flame, Snowflake, Thermometer, Wind } from 'lucide-react';
import { memo } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import {
  getCardStateSurfaceStyleTokens,
  getCardStateSurfaceTokens,
} from '@/app/components/shared/theme/card-state-surface-tokens';
import { CardWrapper } from '@/app/components/ui/card-wrapper';
import { useI18n, useTheme } from '@/app/hooks';
import { getHvacTemperatureStatusLabel } from '../../utils/hvac-temperature-status-label';
import { HVACSettingsDialog } from '../hvac-settings-dialog';
import type { HVACCardProps } from './hvac-card.types';
import { HVACGauge } from './hvac-gauge';
import { HVACCardLargeLayout, HVACCardMediumLayout, HVACCardSmallLayout } from './layouts';
import { useHVACCardController } from './use-hvac-card-controller';

function resolveHVACCardSize(size: HVACCardProps['size']): 'small' | 'medium' {
  return size === 'small' ? 'small' : 'medium';
}

export const HVACCard = memo(function HVACCard({
  id,
  name,
  room: _room,
  initialTemp = 21,
  initialCurrentTemp = 22,
  initialMode = 'cool',
  initialAction,
  supportedHvacModes,
  initialState = true,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: HVACCardProps) {
  const { t } = useI18n();
  const { accentColor } = useTheme();
  const resolvedSize = resolveHVACCardSize(size);
  const controller = useHVACCardController({
    id,
    name,
    initialTemp,
    initialCurrentTemp,
    initialMode,
    initialAction,
    supportedHvacModes,
    initialState,
    isEditMode,
    size: resolvedSize,
  });
  const cardShell = getCardShellSurfaceTokens(controller.theme);
  const stateSurface = getCardStateSurfaceTokens(controller.theme, controller.isOn);
  const targetTemperatureLabel = getHvacTemperatureStatusLabel(
    t,
    controller.formatTemperature(controller.targetTemp),
    controller.formatTemperature(controller.currentTemp),
    controller.visualMode,
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
  return (
    <>
      <CardWrapper
        interactionProps={controller.cardInteraction.cardProps}
        isActive={controller.isOn}
        activeColor={
          controller.visualMode === 'heat'
            ? '#f97316'
            : controller.visualMode === 'cool'
              ? '#06b6d4'
              : controller.visualMode === 'fan' || controller.visualMode === 'fan_only'
                ? '#3b82f6'
                : accentColor
        }
        className={`bg-gradient-to-br ${controller.cardColors.gradient} ${controller.cardColors.border} ${stateSurface.containerClassName}`}
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

        <div className="relative z-[2] h-full flex flex-col p-3">
          <EntityCardHeader
            title={name}
            subtitle={t('climate.subtitle')}
            layout="eyebrow-first"
            size={resolvedSize}
            tone={tone}
            titleClassName={stateSurface.primaryTextClassName}
            subtitleClassName={stateSurface.mutedTextClassName}
            leading={
              <EntityCardHeaderIcon
                IconComponent={HeaderIcon}
                isActive={controller.isOn}
                size={resolvedSize}
                tone={tone}
                ariaLabel={controller.cardInteraction.iconButtonProps['aria-label']}
                onClick={controller.cardInteraction.iconButtonProps.onClick}
              />
            }
          />

          <div className="flex-1">
            {controller.isSmall ? (
              <>
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.displayTargetTemp}
                  currentTemp={controller.displayCurrentTemp}
                  isOn={controller.isOn}
                  minTemp={controller.displayMinTemp}
                  maxTemp={controller.displayMaxTemp}
                  step={controller.displayStep}
                  temperatureUnit={controller.temperatureUnit}
                  onTargetTempChange={controller.setDisplayTargetTemp}
                  onTargetTempCommit={controller.commitDisplayTargetTemp}
                  variant="docked-card-small"
                  className="pointer-events-auto absolute right-[-1.9rem] top-1/2 z-[2] -translate-y-1/2"
                />
                <HVACCardSmallLayout
                  controller={controller}
                  targetTemperatureLabel={targetTemperatureLabel}
                  readableTokens={readableTokens}
                  stateSurface={stateSurface}
                  theme={controller.theme}
                />
              </>
            ) : controller.isMedium ? (
              <>
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.displayTargetTemp}
                  currentTemp={controller.displayCurrentTemp}
                  isOn={controller.isOn}
                  minTemp={controller.displayMinTemp}
                  maxTemp={controller.displayMaxTemp}
                  step={controller.displayStep}
                  temperatureUnit={controller.temperatureUnit}
                  onTargetTempChange={controller.setDisplayTargetTemp}
                  onTargetTempCommit={controller.commitDisplayTargetTemp}
                  variant="docked-card-small"
                  className="pointer-events-auto absolute right-[-0.25rem] top-1/2 z-[2] -translate-y-1/2"
                />
                <HVACCardMediumLayout
                  controller={controller}
                  targetTemperatureLabel={targetTemperatureLabel}
                  readableTokens={readableTokens}
                  stateSurface={stateSurface}
                  theme={controller.theme}
                />
              </>
            ) : (
              <>
                <HVACGauge
                  id={id}
                  mode={controller.visualMode}
                  targetTemp={controller.displayTargetTemp}
                  currentTemp={controller.displayCurrentTemp}
                  isOn={controller.isOn}
                  minTemp={controller.displayMinTemp}
                  maxTemp={controller.displayMaxTemp}
                  step={controller.displayStep}
                  temperatureUnit={controller.temperatureUnit}
                  onTargetTempChange={controller.setDisplayTargetTemp}
                  onTargetTempCommit={controller.commitDisplayTargetTemp}
                  variant="docked-card"
                  className="pointer-events-auto absolute right-[-3.4rem] top-1/2 z-[2] -translate-y-1/2"
                />
                <HVACCardLargeLayout
                  controller={controller}
                  targetTemperatureLabel={targetTemperatureLabel}
                  readableTokens={readableTokens}
                  stateSurface={stateSurface}
                  theme={controller.theme}
                />
              </>
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
          minTemp={controller.minTemp}
          maxTemp={controller.maxTemp}
          step={controller.step}
          siblingEntities={controller.siblingEntities}
          supportedHvacModes={controller.supportedHvacModes}
          onTargetTempChange={controller.setTargetTemp}
          onTargetTempCommit={controller.commitTargetTemp}
          onModeChange={controller.setMode}
        />
      ) : null}
    </>
  );
});
