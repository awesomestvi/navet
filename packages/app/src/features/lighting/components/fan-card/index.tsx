import { dispatchEntityCommand } from '@navet/app/commands';
import { CardActionRow, CardActionRowGroup } from '@navet/app/components/patterns/card-action-row';
import {
  getPortalActionDockAnchorRect,
  PortalActionDock,
  type PortalActionDockAnchorRect,
} from '@navet/app/components/patterns/portal-action-dock';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getCardActionControlSizes } from '@navet/app/components/shared/card-action-control-sizes';
import { CardSettingsActionButton } from '@navet/app/components/shared/card-settings-action-button';
import { type CardSize, isCompactCardSize } from '@navet/app/components/shared/card-size-selector';
import { BrightnessSlider } from '@navet/app/components/shared/device-editor';
import { getBrightnessPresetSelectedStyle } from '@navet/app/components/shared/device-editor/brightness-preset-styles';
import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { useEntityCardInteractionController } from '@navet/app/components/shared/entity-card-interaction-controller';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { getRoundControlStyles } from '@navet/app/components/shared/theme/round-control-styles';
import {
  useI18n,
  useIntegrationStore,
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
  useProviderHvacTopology,
  useServiceActionHandler,
  useTheme,
} from '@navet/app/hooks';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import { callIntegrationService } from '@navet/app/services/integration-service-call.service';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { Fan, MoreHorizontal, RotateCcw, RotateCw, Wind } from 'lucide-react';
import { type MouseEvent, memo, useCallback, useEffect, useState } from 'react';
import { getLightCardSurfaceTokens } from '../light-card/light-card-surface-tokens';
import { SwitchSettingsDialog } from '../switch-settings-dialog';
import { useSwitchCardAppearance } from '../use-switch-card-appearance';
import type { SwitchSiblingEntity } from '../use-switch-card-controller';

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

function readFanDirection(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function supportsOscillation(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

interface FanPresetOverflowButtonProps {
  presets: typeof FAN_SPEED_ACTIONS;
  activeSpeed: FanSpeed | null;
  activeColor: string;
  buttonClassName: string;
  buttonIconClassName: string;
  isOn: boolean;
  isSmall: boolean;
  onSelect: (speed: FanSpeed) => void;
}

const FanPresetOverflowButton = memo(function FanPresetOverflowButton({
  presets,
  activeSpeed,
  activeColor,
  buttonClassName,
  buttonIconClassName,
  isOn,
  isSmall,
  onSelect,
}: FanPresetOverflowButtonProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const roundControl = getRoundControlStyles(theme);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<PortalActionDockAnchorRect | null>(null);

  const handleOpen = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorRect(getPortalActionDockAnchorRect(event.currentTarget));
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setAnchorRect(null);
  }, []);

  return (
    <>
      {isOpen ? (
        <PortalActionDock
          accentColor={activeColor}
          anchorRect={anchorRect}
          onClose={handleClose}
          title={t('lighting.fanSpeed')}
        >
          <fieldset
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Fan presets"
          >
            {presets.map(({ speed, label }) => {
              const active = activeSpeed === speed;

              return (
                <button
                  key={speed}
                  type="button"
                  aria-label={`Fan ${label}`}
                  aria-pressed={active}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(speed);
                    handleClose();
                  }}
                  style={
                    active ? getBrightnessPresetSelectedStyle(theme, activeColor, true) : undefined
                  }
                  className={`${buttonClassName} relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    active
                      ? roundControl.selectedText
                      : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
                  }`}
                >
                  <Fan className={getFanSpeedIconClass(speed, isSmall)} />
                </button>
              );
            })}
          </fieldset>
        </PortalActionDock>
      ) : null}
      <button
        type="button"
        disabled={!isOn}
        aria-label="More fan presets"
        onClick={handleOpen}
        className={`${buttonClassName} rounded-full transition-all duration-300 flex items-center justify-center ${
          !isOn
            ? roundControl.softDisabledButton
            : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
        }`}
      >
        <MoreHorizontal className={buttonIconClassName} />
      </button>
    </>
  );
});

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
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId =
    providerEntity?.providerId ??
    providerId ??
    parseProviderScopedId(id)?.providerId ??
    currentProviderId;
  const rawEntity = useProviderEntitySnapshot(id);
  const rawAttributes = rawEntity?.attributes as Record<string, unknown> | undefined;
  const { siblingIds: siblingEntityIds } = useProviderHvacTopology(id);
  const siblingEntityRecord = useProviderEntitySnapshotRecord(siblingEntityIds, {
    providerId: resolvedProviderId,
    enabled: resolvedProviderId === 'home_assistant' && siblingEntityIds.length > 0,
  });
  const runAction = useServiceActionHandler();
  const resolvedSize = resolveFanCardSize(size);
  const [isOn, setIsOn] = useState(initialState);
  const [percentage, setPercentage] = useState(clampPercentage(initialPercentage));
  const [rememberedPercentage, setRememberedPercentage] = useState(() =>
    Math.max(1, clampPercentage(initialPercentage) || FAN_SPEED_PERCENTAGES.medium)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { selectedIcon, setSelectedIcon, tintColor, setTintColor, HeaderIconComponent } =
    useSwitchCardAppearance({
      id,
      isScript: false,
      defaultIconName: 'Fan',
    });
  const isSmall = isCompactCardSize(resolvedSize);
  const supportsFanSpeed =
    providerEntity?.capabilities.includes('fan_speed') === true ||
    typeof rawAttributes?.percentage === 'number' ||
    typeof rawAttributes?.percentage_step === 'number';
  const fanDirection = readFanDirection(rawAttributes?.direction);
  const fanOscillating = supportsOscillation(rawAttributes?.oscillating)
    ? rawAttributes.oscillating
    : undefined;
  const livePercentage =
    typeof rawAttributes?.percentage === 'number'
      ? rawAttributes.percentage
      : rawEntity
        ? undefined
        : typeof providerState?.percentage === 'number'
          ? providerState.percentage
          : undefined;
  const liveIsOn =
    rawEntity?.state === 'on'
      ? true
      : rawEntity?.state === 'off'
        ? false
        : providerState?.value === 'on' || providerState?.on === true;
  const hasAdvancedFanControls = fanDirection !== undefined || fanOscillating !== undefined;
  const siblingEntities = siblingEntityIds
    .map((entityId) => {
      const entity = siblingEntityRecord[entityId];
      return entity ? { id: entityId, entity } : null;
    })
    .filter((entry): entry is SwitchSiblingEntity => entry !== null);
  const showsSettingsButton = siblingEntities.length > 0 || isEditMode;

  useEffect(() => {
    if (!providerState) {
      setIsOn(initialState);
      setPercentage(clampPercentage(initialPercentage));
      if (clampPercentage(initialPercentage) > 0) {
        setRememberedPercentage(clampPercentage(initialPercentage));
      }
      return;
    }

    setIsOn(liveIsOn);
    if (typeof livePercentage === 'number') {
      const nextPercentage = clampPercentage(livePercentage);
      setPercentage(nextPercentage);
      if (nextPercentage > 0) {
        setRememberedPercentage(nextPercentage);
      }
    }
  }, [initialPercentage, initialState, liveIsOn, livePercentage, providerState]);

  const updatePower = useCallback(
    (nextIsOn: boolean) => {
      setIsOn(nextIsOn);
      if (nextIsOn) {
        setPercentage((currentPercentage) =>
          currentPercentage > 0 ? currentPercentage : rememberedPercentage
        );
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
    [id, providerId, rememberedPercentage, runAction, t]
  );

  const updateSpeed = useCallback(
    (nextPercentage: number) => {
      const clampedPercentage = Math.max(1, clampPercentage(nextPercentage));
      const previousIsOn = isOn;
      setIsOn(true);
      setPercentage(clampedPercentage);
      setRememberedPercentage(clampedPercentage);
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
    onOpenSettings: showsSettingsButton ? () => setIsSettingsOpen(true) : undefined,
  });
  useEditModeSettingsRequest(
    id,
    showsSettingsButton ? () => setIsSettingsOpen(true) : () => undefined,
    isEditMode
  );
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
  const displayedPercentage = isOn
    ? Math.max(1, percentage || rememberedPercentage || FAN_SPEED_PERCENTAGES.low)
    : 0;
  const activeSpeed = resolveFanSpeed(isOn, displayedPercentage);
  const roundControl = getRoundControlStyles(theme);
  const actionSize = getCardActionControlSizes(isSmall ? 'small' : 'medium');
  const activeSpeedColor = fanAccentColor;
  const FanIcon = HeaderIconComponent ?? Fan;
  const sliderSize = resolvedSize === 'extra-small' ? 'extra-small' : isSmall ? 'small' : 'medium';
  const disabledSelectedClasses = 'cursor-not-allowed text-white opacity-70';
  const showFanPresets = supportsFanSpeed && !hasAdvancedFanControls;
  const showPresetOverflow = supportsFanSpeed && hasAdvancedFanControls;
  const directionLabel = fanDirection === 'reverse' ? 'Reverse' : 'Forward';
  const directionIsReverse = fanDirection === 'reverse';
  const hasActionRowButtons =
    fanDirection !== undefined ||
    fanOscillating !== undefined ||
    showFanPresets ||
    showPresetOverflow;

  const setFanDirection = useCallback(
    async (direction: 'forward' | 'reverse') => {
      await callIntegrationService({
        entityId: id,
        domain: 'fan',
        service: 'set_direction',
        serviceData: { direction },
      });
    },
    [id]
  );

  const setFanOscillation = useCallback(
    async (oscillating: boolean) => {
      await callIntegrationService({
        entityId: id,
        domain: 'fan',
        service: 'oscillate',
        serviceData: { oscillating },
      });
    },
    [id]
  );

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
            {supportsFanSpeed ? (
              <>
                <BrightnessSlider
                  value={displayedPercentage}
                  onChange={previewSpeed}
                  onCommit={updateSpeed}
                  isOn={isOn}
                  min={0}
                  size={sliderSize}
                  showLabel={resolvedSize !== 'extra-small'}
                  activeColor={surfaceTokens.contentAccentColor}
                  labelKey="lighting.fanSpeed"
                />
                <CardActionRow
                  theme={theme}
                  size={isSmall ? 'small' : 'medium'}
                  leftContent={
                    hasActionRowButtons ? (
                      <CardActionRowGroup>
                        {fanDirection !== undefined ? (
                          <button
                            type="button"
                            aria-label={`Fan direction ${directionLabel}`}
                            aria-pressed={isOn && directionIsReverse}
                            disabled={!isOn}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setFanDirection(directionIsReverse ? 'forward' : 'reverse');
                            }}
                            style={
                              isOn && directionIsReverse
                                ? getBrightnessPresetSelectedStyle(theme, activeSpeedColor, isOn)
                                : undefined
                            }
                            className={`${actionSize.button} relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                              !isOn
                                ? directionIsReverse
                                  ? disabledSelectedClasses
                                  : roundControl.softDisabledButton
                                : directionIsReverse
                                  ? roundControl.selectedText
                                  : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
                            }`}
                          >
                            {directionIsReverse ? (
                              <RotateCcw className={actionSize.icon} aria-hidden="true" />
                            ) : (
                              <RotateCw className={actionSize.icon} aria-hidden="true" />
                            )}
                          </button>
                        ) : null}
                        {fanOscillating !== undefined ? (
                          <button
                            type="button"
                            aria-label={`Fan oscillation ${fanOscillating ? 'On' : 'Off'}`}
                            aria-pressed={isOn && fanOscillating}
                            disabled={!isOn}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setFanOscillation(!fanOscillating);
                            }}
                            style={
                              isOn && fanOscillating
                                ? getBrightnessPresetSelectedStyle(theme, activeSpeedColor, isOn)
                                : undefined
                            }
                            className={`${actionSize.button} relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                              !isOn
                                ? fanOscillating
                                  ? disabledSelectedClasses
                                  : roundControl.softDisabledButton
                                : fanOscillating
                                  ? roundControl.selectedText
                                  : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
                            }`}
                          >
                            <Wind className={actionSize.icon} aria-hidden="true" />
                          </button>
                        ) : null}
                        {showFanPresets
                          ? FAN_SPEED_ACTIONS.map(({ speed, label }) => {
                              const active = activeSpeed === speed;

                              return (
                                <button
                                  key={speed}
                                  type="button"
                                  aria-label={`Fan ${label}`}
                                  aria-pressed={active}
                                  disabled={!isOn}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    updateSpeedPreset(speed);
                                  }}
                                  style={
                                    active
                                      ? getBrightnessPresetSelectedStyle(
                                          theme,
                                          activeSpeedColor,
                                          isOn
                                        )
                                      : undefined
                                  }
                                  className={`${actionSize.button} relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                                    !isOn
                                      ? active
                                        ? disabledSelectedClasses
                                        : roundControl.softDisabledButton
                                      : active
                                        ? roundControl.selectedText
                                        : `${roundControl.softButton} cursor-pointer hover:scale-105 active:scale-95`
                                  }`}
                                >
                                  <Fan className={getFanSpeedIconClass(speed, isSmall)} />
                                </button>
                              );
                            })
                          : null}
                        {showPresetOverflow ? (
                          <FanPresetOverflowButton
                            presets={FAN_SPEED_ACTIONS}
                            activeSpeed={activeSpeed}
                            activeColor={activeSpeedColor}
                            buttonClassName={actionSize.button}
                            buttonIconClassName={actionSize.icon}
                            isOn={isOn}
                            isSmall={isSmall}
                            onSelect={updateSpeedPreset}
                          />
                        ) : null}
                      </CardActionRowGroup>
                    ) : undefined
                  }
                  rightContent={
                    hasActionRowButtons ? (
                      <div className="relative z-[3]">
                        <CardSettingsActionButton
                          {...cardInteraction.settingsButtonProps}
                          theme={theme}
                          size={isSmall ? 'small' : 'medium'}
                          tone={isOn ? 'default' : 'muted'}
                          variant="soft"
                        />
                      </div>
                    ) : undefined
                  }
                />
              </>
            ) : showsSettingsButton ? (
              <CardActionRow
                theme={theme}
                size={isSmall ? 'small' : 'medium'}
                rightContent={
                  hasActionRowButtons ? (
                    <div className="relative z-[3]">
                      <CardSettingsActionButton
                        {...cardInteraction.settingsButtonProps}
                        theme={theme}
                        size={isSmall ? 'small' : 'medium'}
                        tone={isOn ? 'default' : 'muted'}
                        variant="soft"
                      />
                    </div>
                  ) : undefined
                }
              />
            ) : null}
          </div>
        </div>
      </BaseCard>

      {showsSettingsButton ? (
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
          siblingEntities={siblingEntities}
          tintColor={tintColor}
          onTintColorChange={setTintColor}
          dialogTintColor={fanAccentColor}
          dialogSurfaceClassName={surfaceTokens.cardClassName}
          dialogSurfaceStyle={surfaceTokens.cardStyle}
        />
      ) : null}
    </>
  );
});
