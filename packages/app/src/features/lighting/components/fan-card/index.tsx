import { dispatchEntityCommand } from '@navet/app/commands';
import { CardActionRow, CardActionRowGroup } from '@navet/app/components/patterns/card-action-row';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { BrightnessSlider } from '@navet/app/components/shared/device-editor';
import { getBrightnessPresetSelectedStyle } from '@navet/app/components/shared/device-editor/brightness-preset-styles';
import { useEntityCardInteractionController } from '@navet/app/components/shared/entity-card-interaction-controller';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { getRoundControlStyles } from '@navet/app/components/shared/theme/round-control-styles';
import { useI18n, useServiceActionHandler, useTheme } from '@navet/app/hooks';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { Fan } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { getLightCardSurfaceTokens } from '../light-card/light-card-surface-tokens';
import { SwitchSettingsDialog } from '../switch-settings-dialog';
import { useSwitchCardAppearance } from '../use-switch-card-appearance';

interface FanCardProps {
  id: string;
  name: string;
  room: string;
  providerId?: IntegrationProviderId;
  initialState?: boolean;
  initialPercentage?: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

type FanSpeed = 'low' | 'medium' | 'high';

const FAN_SPEED_PERCENTAGES: Record<FanSpeed, number> = {
  low: 33,
  medium: 66,
  high: 100,
};

const FAN_SPEED_ACTIONS: Array<{
  speed: FanSpeed;
  label: string;
}> = [
  { speed: 'low', label: 'Low' },
  { speed: 'medium', label: 'Medium' },
  { speed: 'high', label: 'High' },
];

function clampPercentage(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function resolveFanSpeed(isOn: boolean, percentage: number): FanSpeed | null {
  if (!isOn || percentage <= 0) {
    return null;
  }

  if (percentage <= 45) {
    return 'low';
  }

  if (percentage <= 80) {
    return 'medium';
  }

  return 'high';
}

function resolveFanCardSize(size: CardSize): CardSize {
  return size === 'large' || size === 'extra-large' || size === 'medium-vertical' ? 'medium' : size;
}

function getFanSpeedIconClass(speed: FanSpeed, isSmall: boolean): string {
  if (speed === 'low') {
    return isSmall ? 'h-2.5 w-2.5 opacity-75' : 'h-3 w-3 opacity-75';
  }

  if (speed === 'medium') {
    return isSmall ? 'h-3.5 w-3.5 opacity-90' : 'h-4 w-4 opacity-90';
  }

  return isSmall ? 'h-4 w-4' : 'h-5 w-5';
}

export const FanCard = memo(function FanCard({
  id,
  name,
  room: _room,
  providerId,
  initialState = false,
  initialPercentage = 0,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: FanCardProps) {
  const { t } = useI18n();
  const { theme, colors, accentColor } = useTheme();
  const providerEntity = useProviderEntityModel(id);
  const providerState = providerEntity?.attributes as Record<string, unknown> | undefined;
  const runAction = useServiceActionHandler();
  const resolvedSize = resolveFanCardSize(size);
  const [isOn, setIsOn] = useState(initialState);
  const [percentage, setPercentage] = useState(clampPercentage(initialPercentage));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { selectedIcon, setSelectedIcon, tintColor, setTintColor, HeaderIconComponent } =
    useSwitchCardAppearance({
      id,
      isScript: false,
      defaultIconName: 'Fan',
    });
  const isSmall = isCompactCardSize(resolvedSize);

  useEffect(() => {
    if (!providerState) {
      setIsOn(initialState);
      setPercentage(clampPercentage(initialPercentage));
      return;
    }

    setIsOn(providerState.value === 'on' || providerState.on === true);
    setPercentage(
      clampPercentage(
        typeof providerState.percentage === 'number' ? providerState.percentage : initialPercentage
      )
    );
  }, [initialPercentage, initialState, providerState]);

  const updatePower = useCallback(
    (nextIsOn: boolean) => {
      setIsOn(nextIsOn);
      if (!nextIsOn) {
        setPercentage(0);
      }

      void runAction(
        async () => {
          await dispatchEntityCommand(
            {
              type: nextIsOn ? 'turn_on' : 'turn_off',
              entityId: id,
            },
            providerId
          );
        },
        t('lighting.feedback.updateSwitchFailed'),
        {
          onError: () => setIsOn(!nextIsOn),
        }
      );
    },
    [id, providerId, runAction, t]
  );

  const updateSpeed = useCallback(
    (nextPercentage: number) => {
      const clampedPercentage = Math.max(1, clampPercentage(nextPercentage));
      const previousIsOn = isOn;
      setIsOn(true);
      setPercentage(clampedPercentage);
      void runAction(
        async () => {
          await dispatchEntityCommand(
            {
              type: 'set_fan_speed',
              entityId: id,
              percentage: clampedPercentage,
            },
            providerId
          );
        },
        t('lighting.feedback.updateSwitchFailed'),
        {
          onError: () => {
            setIsOn(previousIsOn);
            setPercentage(percentage);
          },
        }
      );
    },
    [id, isOn, percentage, providerId, runAction, t]
  );

  const updateSpeedPreset = useCallback(
    (speed: FanSpeed) => {
      updateSpeed(FAN_SPEED_PERCENTAGES[speed]);
    },
    [updateSpeed]
  );

  const previewSpeed = useCallback((nextPercentage: number) => {
    setIsOn(true);
    setPercentage(Math.max(1, clampPercentage(nextPercentage)));
  }, []);

  const cardInteraction = useEntityCardInteractionController({
    ariaLabel: name,
    ariaPressed: isOn,
    isEditMode,
    onToggle: () => updatePower(!isOn),
    onOpenControls: () => undefined,
    onOpenSettings: () => setIsSettingsOpen(true),
  });
  const cardShell = getCardShellSurfaceTokens(theme);
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const fanAccentColor = tintColor || '#38bdf8';
  const surfaceTokens = getLightCardSurfaceTokens({
    isOn,
    selectedColor: null,
    currentColor: isOn ? fanAccentColor : null,
    theme,
    lightColors: colors.light,
    accentColor,
  });
  const activeSpeed = resolveFanSpeed(isOn, percentage);
  const roundControl = getRoundControlStyles(theme);
  const actionSize = getCardActionControlSizes(isSmall ? 'small' : 'medium');
  const activeSpeedColor = fanAccentColor;
  const FanIcon = HeaderIconComponent ?? Fan;
  const sliderSize = resolvedSize === 'extra-small' ? 'extra-small' : isSmall ? 'small' : 'medium';

  return (
    <>
      <BaseCard
        size={resolvedSize}
        {...cardInteraction.cardProps}
        interactive={!isEditMode}
        isActive={isOn && theme !== 'black'}
        activeColor={surfaceTokens.glowColor}
        className={`relative z-10 transition-all duration-500 ${!isEditMode ? 'cursor-pointer' : ''}`}
        frameClassName={`${cardShell.rootFrameClassName} ${surfaceTokens.cardClassName}`}
        style={surfaceTokens.cardStyle}
        disableDefaultSheen
        overlay={
          <>
            {surfaceTokens.activeGlowClassName ? (
              <div
                className={surfaceTokens.activeGlowClassName}
                style={surfaceTokens.activeGlowStyle}
              />
            ) : null}
            {surfaceTokens.innerOverlayClassName ? (
              <div
                className={surfaceTokens.innerOverlayClassName}
                style={surfaceTokens.innerOverlayStyle}
              />
            ) : null}
            {surfaceTokens.shineOverlayClassName ? (
              <div className={surfaceTokens.shineOverlayClassName} />
            ) : null}
          </>
        }
        contentClassName="h-full"
      >
        <div className="relative h-full flex flex-col">
          <EntityCardHeader
            title={name}
            subtitle={t('climate.mode.fan')}
            layout="eyebrow-first"
            size={isSmall ? resolvedSize : 'medium'}
            tone={isOn ? 'primary' : 'neutral'}
            accentColor={surfaceTokens.contentAccentColor}
            titleClassName={stateSurface.primaryTextClassName}
            subtitleClassName={stateSurface.mutedTextClassName}
            leading={
              <EntityCardHeaderIcon
                IconComponent={FanIcon}
                isActive={isOn}
                size={isSmall ? resolvedSize : 'medium'}
                tone={isOn ? 'primary' : 'neutral'}
                baseColor={surfaceTokens.contentAccentColor}
                ariaLabel={cardInteraction.iconButtonProps['aria-label']}
                onClick={cardInteraction.iconButtonProps.onClick}
              />
            }
          />

          <div className="flex-1 flex flex-col justify-end gap-4">
            <BrightnessSlider
              value={Math.max(1, percentage || FAN_SPEED_PERCENTAGES.low)}
              onChange={previewSpeed}
              onCommit={updateSpeed}
              isOn={isOn}
              size={sliderSize}
              showLabel={resolvedSize !== 'extra-small'}
              activeColor={surfaceTokens.contentAccentColor}
              labelKey="lighting.fanSpeed"
            />
            <CardActionRow
              theme={theme}
              size={isSmall ? 'small' : 'medium'}
              leftContent={
                <CardActionRowGroup>
                  {FAN_SPEED_ACTIONS.map(({ speed, label }) => {
                    const active = activeSpeed === speed;

                    return (
                      <button
                        key={speed}
                        type="button"
                        aria-label={`Fan ${label}`}
                        aria-pressed={active}
                        onClick={(event) => {
                          event.stopPropagation();
                          updateSpeedPreset(speed);
                        }}
                        style={
                          active
                            ? getBrightnessPresetSelectedStyle(theme, activeSpeedColor, isOn)
                            : undefined
                        }
                        className={`${actionSize.button} relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                          active
                            ? roundControl.selectedText
                            : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
                        }`}
                      >
                        <Fan className={getFanSpeedIconClass(speed, isSmall)} />
                      </button>
                    );
                  })}
                </CardActionRowGroup>
              }
              rightContent={
                <div className="relative z-[3]">
                  <CardSettingsActionButton
                    {...cardInteraction.settingsButtonProps}
                    theme={theme}
                    size={isSmall ? 'small' : 'medium'}
                    tone={isOn ? 'default' : 'muted'}
                    variant="soft"
                  />
                </div>
              }
            />
          </div>
        </div>
      </BaseCard>

      <SwitchSettingsDialog
        entityId={id}
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        name={name}
        entityType={t('climate.mode.fan')}
        isOn={isOn}
        metricSectionTitle=""
        metricSectionDescription=""
        metricLimit={0}
        availableMetrics={[]}
        selectedMetricLabels={[]}
        getMetricLabel={(metric) => metric.label}
        onMetricToggle={() => undefined}
        selectedIcon={selectedIcon}
        onIconChange={setSelectedIcon}
        siblingEntities={[]}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
        dialogTintColor={fanAccentColor}
        dialogSurfaceClassName={surfaceTokens.cardClassName}
        dialogSurfaceStyle={surfaceTokens.cardStyle}
      />
    </>
  );
});
