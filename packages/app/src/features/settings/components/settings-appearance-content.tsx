import { Button } from '@navet/app/components/primitives/button';
import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { ThemeAppearancePicker } from '@navet/app/components/shared/theme/theme-appearance-picker';
import {
  BUILT_IN_WALLPAPERS,
  isBuiltInWallpaperToken,
  resolveWallpaperPreviewSources,
} from '@navet/app/constants/built-in-wallpapers';
import { useI18n } from '@navet/app/hooks';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import {
  getLegacyReducedEffectsFlags,
  resolveEffectsQuality,
} from '@navet/app/utils/effects-quality';
import { AlertTriangle, Check, Upload, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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

export function AppearanceSpaceModeItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { dashboardSpaceMode, styles, updateScopedSettings } = controller;
  const showMoreSpaceWarning = dashboardSpaceMode === 'more_space';

  return (
    <SettingsItem
      title={t('settings.dashboard.spaceMode.title')}
      description={t('settings.dashboard.spaceMode.description')}
      styles={styles}
    >
      <div className="space-y-3">
        <fieldset className="w-fit">
          <legend className="sr-only">{t('settings.dashboard.spaceMode.title')}</legend>
          <div className="flex flex-wrap gap-2">
            {[
              {
                value: 'default' as const,
                label: t('settings.dashboard.spaceMode.default'),
              },
              {
                value: 'more_space' as const,
                label: t('settings.dashboard.spaceMode.moreSpace'),
              },
            ].map((option) => {
              const isActive = dashboardSpaceMode === option.value;

              return (
                <InteractivePill
                  key={option.value}
                  active={isActive}
                  size="small"
                  onClick={() => {
                    if (isActive) {
                      return;
                    }

                    updateScopedSettings({ dashboardSpaceMode: option.value }, [
                      'dashboardSpaceMode',
                    ]);
                  }}
                  aria-pressed={isActive}
                >
                  {option.label}
                </InteractivePill>
              );
            })}
          </div>
        </fieldset>

        {showMoreSpaceWarning ? (
          <div className={`flex items-start gap-2 text-sm ${styles.subtleColor}`}>
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{t('settings.dashboard.spaceMode.warningBody')}</p>
          </div>
        ) : null}
      </div>
    </SettingsItem>
  );
}

export function AppearanceEffectsQualityItem({
  controller,
}: {
  controller: SettingsSectionController;
}) {
  const { t } = useI18n();
  const { effectsQuality, effectsQualityUserOverride, styles, updateScopedSettings } = controller;
  const detectedTier = useMemo(() => detectDeviceTier(), []);
  const qualityOptions: Array<{ value: EffectsQuality | 'auto'; label: string }> = [
    { value: 'auto', label: t('settings.system.effectsQuality.auto') },
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
            const isActive =
              option.value === 'auto'
                ? !effectsQualityUserOverride
                : effectsQualityUserOverride && effectsQuality === option.value;
            const resolvedQuality = option.value === 'auto' ? detectedTier : option.value;
            return (
              <InteractivePill
                key={option.label}
                active={isActive}
                size="small"
                onClick={() =>
                  updateScopedSettings(
                    {
                      effectsQuality: resolvedQuality,
                      effectsQualityUserOverride: option.value !== 'auto',
                      ...getLegacyReducedEffectsFlags(resolvedQuality),
                    },
                    ['effectsQuality']
                  )
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
  const {
    ambientLightBleed,
    disableAnimations,
    effectsQuality,
    lowPowerMode,
    styles,
    updateSettings,
  } = controller;
  const ambienceDisabled =
    resolveEffectsQuality(effectsQuality, disableAnimations || lowPowerMode) !== 'high';
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
  const [showAllWallpapers, setShowAllWallpapers] = useState(false);
  const initialWallpapers = BUILT_IN_WALLPAPERS.slice(0, 6);
  const selectedWallpaper = BUILT_IN_WALLPAPERS.find((option) => option.token === wallpaper);
  if (selectedWallpaper && !initialWallpapers.includes(selectedWallpaper)) {
    initialWallpapers[5] = selectedWallpaper;
  }
  const visibleWallpapers = showAllWallpapers ? BUILT_IN_WALLPAPERS : initialWallpapers;

  return (
    <SettingsItem
      title={t('settings.appearance.wallpaper.title')}
      description={t('settings.appearance.wallpaper.description')}
      styles={styles}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {wallpaper && !isBuiltInWallpaperToken(wallpaper) ? (
            <div className="h-10 w-16 shrink-0 overflow-hidden rounded-lg">
              <WallpaperPreviewImage
                value={wallpaper}
                alt={t('settings.appearance.wallpaper.previewAlt')}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={openWallpaperPicker}
            leading={<Upload className="h-4 w-4" />}
          >
            {t('settings.appearance.wallpaper.upload')}
          </Button>
          {wallpaper ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemoveWallpaper}
              leading={<X className="h-4 w-4" />}
            >
              {t('settings.appearance.wallpaper.remove')}
            </Button>
          ) : null}
        </div>

        <input
          ref={wallpaperInputRef}
          type="file"
          accept="image/*"
          onChange={handleWallpaperUpload}
          className="hidden"
        />

        <div>
          <div className="grid grid-cols-2 gap-3 @min-[560px]/settings-detail:grid-cols-3">
            {visibleWallpapers.map((option) => {
              const isSelected = wallpaper === option.token;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(option.token)}
                  aria-pressed={isSelected}
                  aria-label={t('settings.appearance.wallpaper.optionAria', { id: option.id })}
                  className="group relative aspect-video w-full overflow-hidden rounded-xl border focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{
                    borderColor: isSelected ? `${styles.accentColor}88` : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${styles.accentColor}55` : undefined,
                  }}
                >
                  <WallpaperPreviewImage
                    value={option.token}
                    alt=""
                    className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                  {isSelected ? (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-xl"
                      style={{ boxShadow: `inset 0 0 0 2px ${styles.accentColor}` }}
                    >
                      <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-sm">
                        <Check aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-2"
            aria-expanded={showAllWallpapers}
            onClick={() => setShowAllWallpapers((value) => !value)}
          >
            {t(
              showAllWallpapers
                ? 'settings.appearance.wallpaper.showLess'
                : 'settings.appearance.wallpaper.showAll'
            )}
          </Button>
        </div>
      </div>
    </SettingsItem>
  );
}
