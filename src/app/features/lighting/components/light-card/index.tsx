import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BaseCard } from '@/app/components/primitives';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { useTheme } from '@/app/hooks';
import { useSettingsStore } from '@/app/stores';
import { resolveEffectsQuality } from '@/app/utils/effects-quality';
import { LightCardLarge } from './light-card-large';
import { LightCardMedium } from './light-card-medium';
import { LightCardSmall } from './light-card-small';
import { getLightCardSurfaceTokens } from './light-card-surface-tokens';
import { kelvinToColor } from './light-card-utils';
import { LightSettingsDialog } from './light-settings-dialog';
import { useLightCardController } from './use-light-card-controller';

interface LightCardProps {
  id: string;
  name: string;
  room: string;
  initialState?: boolean;
  initialBrightness?: number;
  initialTemp?: number;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

export const LightCard = memo(function LightCard({
  id,
  name,
  room,
  initialState = false,
  initialBrightness = 0,
  initialTemp = 4000,
  size,
  onSizeChange: _onSizeChange,
  isEditMode,
}: LightCardProps) {
  const { theme, colors, accentColor } = useTheme();
  const { ambientLightBleed, lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow((state) => ({
      ambientLightBleed: state.ambientLightBleed,
      lowPowerMode: state.lowPowerMode,
      effectsQuality: state.effectsQuality,
    }))
  );
  const [isKelvinMode, setIsKelvinMode] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const kelvinResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleKelvinReset = useCallback(() => {
    if (kelvinResetTimerRef.current) clearTimeout(kelvinResetTimerRef.current);
    kelvinResetTimerRef.current = setTimeout(() => {
      setIsKelvinMode(false);
      kelvinResetTimerRef.current = null;
    }, 3000);
  }, []);

  const controller = useLightCardController({
    id,
    name,
    room,
    initialState,
    initialBrightness,
    initialTemp,
    size,
    isEditMode,
  });
  const cardShell = getCardShellSurfaceTokens(theme);
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const showAmbientLightBleed = ambientLightBleed && resolvedEffectsQuality === 'high';
  const surfaceTokens = getLightCardSurfaceTokens({
    isOn: controller.isOn,
    selectedColor: controller.selectedColor,
    customColor: controller.customColor,
    currentColor: controller.currentColor,
    theme,
    lightColors: colors.light,
    accentColor,
  });

  const handleKelvinToggle = useCallback(() => {
    if (!controller.isOn) return;
    setIsKelvinMode((prev) => {
      const next = !prev;
      if (next) {
        scheduleKelvinReset();
      } else if (kelvinResetTimerRef.current) {
        clearTimeout(kelvinResetTimerRef.current);
        kelvinResetTimerRef.current = null;
      }
      return next;
    });
  }, [controller.isOn, scheduleKelvinReset]);

  const handleTempChange = useCallback(
    (temp: number) => {
      controller.onTempChange(temp);
      scheduleKelvinReset();
    },
    [controller.onTempChange, scheduleKelvinReset]
  );

  const handleTempCommit = useCallback(
    (temp: number) => {
      controller.onTempCommit(temp);
      scheduleKelvinReset();
    },
    [controller.onTempCommit, scheduleKelvinReset]
  );

  // Reset kelvin mode when clicking outside the card
  useEffect(() => {
    if (!isKelvinMode) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsKelvinMode(false);
        if (kelvinResetTimerRef.current) {
          clearTimeout(kelvinResetTimerRef.current);
          kelvinResetTimerRef.current = null;
        }
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isKelvinMode]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (kelvinResetTimerRef.current) clearTimeout(kelvinResetTimerRef.current);
    };
  }, []);

  const isSmall = isCompactCardSize(size);

  const currentTempColor = kelvinToColor(controller.colorTemp);

  return (
    <>
      <div ref={cardRef} className="relative h-full w-full overflow-visible">
        {controller.isOn && showAmbientLightBleed && (
          <div
            data-ambient-light-bleed="true"
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-full z-0 blur-3xl transition-all duration-500 ${
              theme === 'light' ? 'opacity-40' : 'opacity-20'
            }`}
            style={{
              background: `radial-gradient(circle, ${surfaceTokens.glowColor || 'transparent'} 0%, transparent 70%)`,
            }}
          />
        )}

        <BaseCard
          size={size}
          {...controller.cardInteraction.cardProps}
          interactive={!isEditMode}
          isActive={controller.isOn && theme !== 'black'}
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
            {isSmall ? (
              <LightCardSmall
                name={name}
                room={room}
                size={size}
                brightness={controller.brightness}
                currentColor={controller.currentColor}
                currentTempColor={currentTempColor}
                brightnessPresets={controller.brightnessPresets}
                isOn={controller.isOn}
                IconComponent={controller.IconComponent}
                iconText={controller.iconText}
                iconButtonProps={controller.iconButtonProps}
                settingsButtonProps={controller.settingsButtonProps}
                showSettingsButton={controller.showSettingsButton}
                supportsColorControl={controller.supportsColorControl}
                supportsColorTemperature={controller.supportsColorTemperature}
                colorTemp={controller.colorTemp}
                minColorTemp={controller.minColorTemp}
                maxColorTemp={controller.maxColorTemp}
                isKelvinMode={isKelvinMode}
                onKelvinToggle={handleKelvinToggle}
                onBrightnessChange={controller.onBrightnessChange}
                onBrightnessCommit={controller.onBrightnessCommit}
                onColorChange={controller.onColorChange}
                onTempChange={handleTempChange}
                onTempCommit={handleTempCommit}
              />
            ) : size === 'medium' ? (
              <LightCardMedium
                name={name}
                brightness={controller.brightness}
                currentColor={controller.currentColor}
                currentTempColor={currentTempColor}
                brightnessPresets={controller.brightnessPresets}
                isOn={controller.isOn}
                IconComponent={controller.IconComponent}
                iconText={controller.iconText}
                iconButtonProps={controller.iconButtonProps}
                settingsButtonProps={controller.settingsButtonProps}
                showSettingsButton={controller.showSettingsButton}
                showPresetOverflow={controller.showPresetOverflow}
                supportsColorControl={controller.supportsColorControl}
                supportsColorTemperature={controller.supportsColorTemperature}
                colorTemp={controller.colorTemp}
                minColorTemp={controller.minColorTemp}
                maxColorTemp={controller.maxColorTemp}
                isKelvinMode={isKelvinMode}
                onKelvinToggle={handleKelvinToggle}
                onBrightnessChange={controller.onBrightnessChange}
                onBrightnessCommit={controller.onBrightnessCommit}
                onColorChange={controller.onColorChange}
                onTempChange={handleTempChange}
                onTempCommit={handleTempCommit}
              />
            ) : (
              <LightCardLarge
                name={name}
                brightness={controller.brightness}
                brightnessPresets={controller.brightnessPresets}
                selectedColor={controller.selectedColor}
                currentColor={controller.currentColor}
                currentTempColor={currentTempColor}
                isOn={controller.isOn}
                IconComponent={controller.IconComponent}
                iconText={controller.iconText}
                iconButtonProps={controller.iconButtonProps}
                settingsButtonProps={controller.settingsButtonProps}
                showSettingsButton={controller.showSettingsButton}
                supportsColorControl={controller.supportsColorControl}
                supportsColorTemperature={controller.supportsColorTemperature}
                colorTemp={controller.colorTemp}
                minColorTemp={controller.minColorTemp}
                maxColorTemp={controller.maxColorTemp}
                isKelvinMode={isKelvinMode}
                onKelvinToggle={handleKelvinToggle}
                onBrightnessChange={controller.onBrightnessChange}
                onBrightnessCommit={controller.onBrightnessCommit}
                onColorChange={controller.onColorChange}
                onTempChange={handleTempChange}
                onTempCommit={handleTempCommit}
              />
            )}
          </div>
        </BaseCard>
      </div>

      {controller.isOpen ? (
        <LightSettingsDialog
          entityId={id}
          isOpen={controller.isOpen}
          onOpenChange={controller.onOpenChange}
          name={name}
          isOn={controller.isOn}
          supportsColorTemperature={controller.supportsColorTemperature}
          supportsColorControl={controller.supportsColorControl}
          minColorTemp={controller.minColorTemp}
          maxColorTemp={controller.maxColorTemp}
          colorTemp={controller.colorTemp}
          brightnessPresets={controller.brightnessPresets}
          selectedColor={controller.selectedColor}
          customColor={controller.customColor}
          brightness={controller.brightness}
          selectedIcon={controller.selectedIcon}
          tempOptions={controller.tempOptions}
          onTempChange={controller.onTempChange}
          onTempCommit={controller.onTempCommit}
          onColorChange={controller.onColorChange}
          onCustomColorChange={controller.onCustomColorChange}
          onBrightnessChange={controller.onBrightnessChange}
          onBrightnessCommit={controller.onBrightnessCommit}
          applyBrightnessPresetsToAll={controller.applyBrightnessPresetsToAll}
          onApplyBrightnessPresetsToAllChange={controller.onApplyBrightnessPresetsToAllChange}
          onBrightnessPresetValueChange={controller.onBrightnessPresetValueChange}
          onBrightnessPresetOrderChange={controller.onBrightnessPresetOrderChange}
          onIconChange={controller.onIconChange}
          tintColor={controller.tintColor}
          onTintColorChange={controller.onTintColorChange}
        />
      ) : null}
    </>
  );
});
