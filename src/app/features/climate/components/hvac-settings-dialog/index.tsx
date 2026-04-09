import * as Dialog from '@radix-ui/react-dialog';
import { Flame, Power, Snowflake, Wind, X } from 'lucide-react';
import { memo } from 'react';
import { DialogDoneFooter, DialogShell } from '@/app/components/primitives';
import { CustomScrollbar, DialogSectionRow } from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import { useI18n, useTheme } from '@/app/hooks';
import { HVACGauge } from '../hvac-card/hvac-gauge';
import { useHvacVisualMode } from '../hvac-card/use-hvac-visual-mode';
import { getHVACSettingsDialogStyles } from './styles';
import type { HVACSettingsDialogProps } from './types';

const MODE_OPTIONS = [
  { value: 'cool', icon: Snowflake },
  { value: 'heat', icon: Flame },
  { value: 'fan', icon: Wind },
] as const;

export const HVACSettingsDialog = memo(function HVACSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  isOn,
  mode,
  targetTemp,
  currentTemp,
  minTemp = 16,
  maxTemp = 30,
  step = 0.5,
  temperaturePresets = [{ value: 18 }, { value: 21 }, { value: 24 }],
  onModeChange,
  onTargetTempChange,
  onTogglePower,
}: HVACSettingsDialogProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const visualMode = useHvacVisualMode({
    currentTemp,
    isOn,
    mode,
    targetTemp,
  });
  const textTone = !isOn
    ? 'neutral'
    : visualMode === 'heat'
      ? 'orange'
      : visualMode === 'cool'
        ? 'cyan'
        : 'blue';
  const dialogTextTokens = getCardReadableTextTokens({
    theme,
    tone: textTone,
    accentColor,
  });
  const styles = getHVACSettingsDialogStyles(visualMode, isOn);
  const helperText =
    targetTemp < currentTemp
      ? t('climate.coolingDownTo', { temp: targetTemp })
      : t('climate.heatingTo', { temp: targetTemp });
  const contentInsetClassName = 'px-8';

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${styles.contentClassName}`}
    >
      <CustomScrollbar isOn={isOn}>
        <div className="pt-8 pb-8">
          <div className={contentInsetClassName}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <EntityRoomSelector entityId={entityId} compact forceDark />
                <h2 className="mt-2 text-xl font-semibold text-white">{name}</h2>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-white/10 bg-white/6 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <section className="mt-2">
            <div className={contentInsetClassName}>
              <div className="flex items-start justify-between gap-3">
                <DialogSectionRow
                  label={t('climate.temperature')}
                  labelClassName="mb-0.5 leading-none"
                >
                  <p
                    className="text-sm leading-tight"
                    style={{ color: dialogTextTokens.subtitleColor }}
                  >
                    {helperText}
                  </p>
                </DialogSectionRow>

                <button
                  type="button"
                  onClick={onTogglePower}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    isOn
                      ? 'border-white/18 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/70'
                  )}
                  style={{ color: dialogTextTokens.titleColor }}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{isOn ? t('common.on') : t('common.off')}</span>
                </button>
              </div>
            </div>

            <div className="mt-4">
              <HVACGauge
                id={entityId}
                mode={visualMode}
                targetTemp={targetTemp}
                currentTemp={currentTemp}
                isOn={isOn}
                minTemp={minTemp}
                maxTemp={maxTemp}
                step={step}
                onTargetTempChange={onTargetTempChange}
                variant="immersive"
              />
            </div>
            <div className={`mt-5 space-y-5 ${contentInsetClassName}`}>
              <DialogSectionRow label={t('climate.mode')}>
                <div className="grid grid-cols-3 gap-2">
                  {MODE_OPTIONS.map(({ value, icon: Icon }) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => onModeChange(value)}
                      disabled={!isOn}
                      className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all disabled:opacity-50 ${styles.modeButtonClassName(value)}`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.modeIconWrapClassName(value)}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{ color: dialogTextTokens.titleColor }}
                      >
                        {t(`climate.mode.${value}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </DialogSectionRow>

              <DialogSectionRow label={t('climate.presets')}>
                <div className="grid grid-cols-3 gap-2">
                  {temperaturePresets.map((preset) => {
                    const isSelected = Math.abs(targetTemp - preset.value) < 0.05;

                    return (
                      <button
                        type="button"
                        key={`${preset.label ?? preset.value}`}
                        onClick={() => onTargetTempChange(preset.value)}
                        disabled={!isOn}
                        className={`rounded-2xl border px-3 py-3 text-left transition-all disabled:opacity-50 ${
                          isSelected
                            ? styles.presetButtonActiveClassName
                            : styles.presetButtonClassName
                        }`}
                      >
                        <div
                          className="text-lg font-semibold leading-none"
                          style={{ color: dialogTextTokens.titleColor }}
                        >
                          {preset.value}°
                        </div>
                        <div
                          className="mt-1 text-xs opacity-80"
                          style={{ color: dialogTextTokens.subtitleColor }}
                        >
                          {preset.label ?? `${preset.value}°`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </DialogSectionRow>
            </div>
          </section>

          <div className={contentInsetClassName}>
            <DialogDoneFooter label={t('common.done')} />
          </div>
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});
