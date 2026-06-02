import { Button } from '@navet/app/components/primitives/button';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { ThemeAppearancePicker } from '@navet/app/components/shared/theme/theme-appearance-picker';
import {
  BUILT_IN_WALLPAPERS,
  resolveWallpaperPreviewSources,
} from '@navet/app/constants/built-in-wallpapers';
import { useI18n } from '@navet/app/hooks';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { getLegacyReducedEffectsFlags } from '@navet/app/utils/effects-quality';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useMemo, useRef } from 'react';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { SettingsItem } from './settings-section-shell';

function WallpaperPreviewImage({
  value,
  alt,
  className,
}: {
  value: string;
  alt: string;
  className: string;
}) {
  const preview = resolveWallpaperPreviewSources(value);
  if (!preview) {
    return null;
  }

  if (preview.kind === 'custom') {
    return <img src={preview.imgSrc} alt={alt} className={className} />;
  }

  return (
    <picture>
      <source srcSet={preview.avifSrc} type="image/avif" />
      <source srcSet={preview.webpSrc} type="image/webp" />
      <img src={preview.imgSrc} alt={alt} className={className} />
    </picture>
  );
}

export function AppearanceThemeAccentItem({
  controller,
}: {
  controller: SettingsSectionController;
}) {
  const { t } = useI18n();
  const {
    colorOptions,
    customPrimaryColor,
    followSystemTheme,
    manualTheme,
    primaryColor,
    setCustomPrimaryColor,
    setFollowSystemTheme,
    setPrimaryColor,
    setTheme,
    styles,
    theme,
    themeOptions,
  } = controller;

  return (
    <SettingsItem
      title={t('settings.appearance.themeAccent.title')}
      description={t('settings.appearance.themeAccent.description')}
      styles={styles}
    >
      <ThemeAppearancePicker
        colorOptions={colorOptions}
        customAccent={customPrimaryColor}
        selectedAccent={primaryColor}
        selectedTheme={manualTheme}
        effectiveTheme={theme}
        themeOptions={themeOptions}
        onAccentChange={setPrimaryColor}
        onCustomAccentChange={setCustomPrimaryColor}
        onThemeChange={setTheme}
        followSystemTheme={followSystemTheme}
        onFollowSystemThemeChange={setFollowSystemTheme}
      />
    </SettingsItem>
  );
}

export function AppearanceEffectsQualityItem({
  controller,
}: {
  controller: SettingsSectionController;
}) {
  const { t } = useI18n();
  const { effectsQuality, styles, updateSettings } = controller;
  const detectedTier = useMemo(() => detectDeviceTier(), []);
  const qualityOptions: Array<{ value: EffectsQuality; label: string }> = [
    { value: 'high', label: t('settings.system.effectsQuality.high') },
    { value: 'medium', label: t('settings.system.effectsQuality.medium') },
    { value: 'low', label: t('settings.system.effectsQuality.low') },
  ];

  return (
    <SettingsItem
      title={t('settings.system.effectsQuality.title')}
      description={t('settings.system.effectsQuality.description')}
      styles={styles}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {qualityOptions.map((option) => {
            const isActive = effectsQuality === option.value;
            return (
              <InteractivePill
                key={option.label}
                active={isActive}
                size="small"
                onClick={() =>
                  updateSettings({
                    effectsQuality: option.value,
                    ...getLegacyReducedEffectsFlags(option.value),
                  })
                }
                aria-pressed={isActive}
              >
                {option.label}
              </InteractivePill>
            );
          })}
        </div>
        <p className={`text-sm ${styles.subtleColor}`}>
          {t('settings.system.effectsQuality.recommended')}:{' '}
          {qualityOptions.find((option) => option.value === detectedTier)?.label}
        </p>
      </div>
    </SettingsItem>
  );
}

export function AppearanceAmbienceItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { ambientLightBleed, effectsQuality, styles, updateSettings } = controller;
  const ambienceDisabled = effectsQuality !== 'high';
  const effectiveAmbientLightBleed = ambientLightBleed && !ambienceDisabled;

  return (
    <SettingsItem
      title={t('settings.appearance.ambience.title')}
      description={t('settings.appearance.ambience.description')}
      styles={styles}
    >
      <div className="space-y-3">
        <div className="flex w-fit flex-wrap gap-2">
          {[
            { value: true, label: t('settings.appearance.ambience.ambientBleed') },
            { value: false, label: t('settings.appearance.ambience.contained') },
          ].map((option) => {
            const isActive = effectiveAmbientLightBleed === option.value;
            return (
              <InteractivePill
                key={option.label}
                active={isActive}
                size="small"
                onClick={() => updateSettings({ ambientLightBleed: option.value })}
                disabled={ambienceDisabled}
                aria-pressed={isActive}
              >
                {option.label}
              </InteractivePill>
            );
          })}
        </div>

        {ambienceDisabled ? (
          <p className={`text-sm ${styles.subtleColor}`}>
            {t('settings.appearance.ambience.disabledInLowPower')}
          </p>
        ) : null}
      </div>
    </SettingsItem>
  );
}

export function AppearanceWallpaperItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { handleRemoveWallpaper, handleSelectWallpaper, handleWallpaperUpload, styles, wallpaper } =
    controller;
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);
  const openWallpaperPicker = () => wallpaperInputRef.current?.click();
  const wallpaperPreviewAlt = t('settings.appearance.wallpaper.previewAlt');

  return (
    <SettingsItem
      title={t('settings.appearance.wallpaper.title')}
      description={t('settings.appearance.wallpaper.description')}
      styles={styles}
    >
      <div className="space-y-4">
        {wallpaper ? (
          <div className="relative max-w-2xl">
            <div
              className="relative h-28 overflow-hidden rounded-[20px] border md:h-36 md:rounded-3xl"
              style={{ borderColor: `${styles.accentColor}40` }}
            >
              <WallpaperPreviewImage
                value={wallpaper}
                alt={wallpaperPreviewAlt}
                className="h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${styles.accentColor}55, ${styles.accentColor}10)`,
                  mixBlendMode: styles.mixBlendMode,
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleRemoveWallpaper}
              aria-label="Remove wallpaper"
              className={`absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full ${styles.floatingButtonBg} ${styles.floatingButtonText} shadow-lg transition-all hover:scale-110`}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <Button
              type="button"
              variant="secondary"
              onClick={openWallpaperPicker}
              leading={<Upload className={`h-4 w-4 ${styles.mutedColor}`} />}
              className={`mt-3 h-14 w-full rounded-[18px] border-2 border-dashed md:mt-4 md:h-16 md:rounded-[20px] ${styles.lineColor} ${styles.hoverBg} ${styles.textColor}`}
            >
              <span className="flex flex-col text-center">
                <span className={`block text-sm font-medium ${styles.textColor}`}>
                  {t('settings.appearance.wallpaper.replace')}
                </span>
                <span className={`mt-0.5 block text-xs ${styles.subtleColor}`}>
                  {t('settings.appearance.wallpaper.fileHint')}
                </span>
              </span>
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={openWallpaperPicker}
            leading={<ImageIcon className={`h-8 w-8 md:h-9 md:w-9 ${styles.mutedColor}`} />}
            className={`h-28 w-full max-w-2xl flex-col gap-0 rounded-[20px] border-2 border-dashed text-center transition-colors md:h-36 md:rounded-3xl ${styles.lineColor} ${styles.hoverBg} ${styles.textColor}`}
          >
            <span className="flex flex-col items-center text-center">
              <span className={`mt-2 text-sm font-medium md:mt-3 ${styles.textColor}`}>
                {t('settings.appearance.wallpaper.upload')}
              </span>
              <span className={`mt-1 text-xs ${styles.subtleColor}`}>
                {t('settings.appearance.wallpaper.fileHint')}
              </span>
            </span>
          </Button>
        )}

        <input
          ref={wallpaperInputRef}
          type="file"
          accept="image/*"
          onChange={handleWallpaperUpload}
          className="hidden"
        />

        <div className="max-w-5xl">
          <div className="flex flex-wrap gap-3">
            {BUILT_IN_WALLPAPERS.map((option) => {
              const isSelected = wallpaper === option.token;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(option.token)}
                  aria-pressed={isSelected}
                  aria-label={t('settings.appearance.wallpaper.optionAria', { id: option.id })}
                  className="group relative h-14 w-14 overflow-hidden rounded-full border transition-all md:h-16 md:w-16"
                  style={{
                    borderColor: isSelected ? `${styles.accentColor}88` : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${styles.accentColor}55` : undefined,
                  }}
                >
                  <WallpaperPreviewImage
                    value={option.token}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, transparent, ${styles.accentColor}18)`,
                      mixBlendMode: styles.mixBlendMode,
                    }}
                  />
                  {isSelected ? (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `inset 0 0 0 2px ${styles.accentColor}` }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SettingsItem>
  );
}
