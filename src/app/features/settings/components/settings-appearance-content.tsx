import { Image as ImageIcon, Minus, Plus, Upload, X } from 'lucide-react';
import { useMemo } from 'react';
import { ThemeAppearancePicker } from '@/app/components/shared/theme/theme-appearance-picker';
import { useI18n } from '@/app/hooks';
import {
  type EffectsQuality,
  normalizePageZoom,
  PAGE_ZOOM_OPTIONS,
  type PageZoom,
} from '@/app/stores/settings-store';
import { detectDeviceTier } from '@/app/utils/detect-device-tier';
import { getLegacyReducedEffectsFlags } from '@/app/utils/effects-quality';
import type { SettingsSectionController } from '../hooks/use-settings-section-controller';
import { AmbientLightPreviewCard } from './ambient-light-preview-card';
import { SettingsItem } from './settings-section-shell';

const BUILT_IN_WALLPAPERS = [
  { id: 'serene-dawn', src: './wallpapers/serene-dawn.svg' },
  { id: 'starfield-nocturne', src: './wallpapers/starfield-nocturne.svg' },
  { id: 'aurora-veil', src: './wallpapers/aurora-veil.svg' },
  { id: 'rainforest-canopy', src: './wallpapers/rainforest-canopy.svg' },
  { id: 'ember-loft', src: './wallpapers/ember-loft.svg' },
  { id: 'slate-passage', src: './wallpapers/slate-passage.svg' },
  { id: 'coastal-haze', src: './wallpapers/coastal-haze.svg' },
  { id: 'night-lounge', src: './wallpapers/night-lounge.svg' },
] as const;

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
        <div
          className={`inline-flex flex-wrap rounded-full border p-1 ${styles.borderColor} ${styles.softBg}`}
        >
          {qualityOptions.map((option) => {
            const isActive = effectsQuality === option.value;
            return (
              <button
                type="button"
                key={option.label}
                onClick={() =>
                  updateSettings({
                    effectsQuality: option.value,
                    ...getLegacyReducedEffectsFlags(option.value),
                  })
                }
                style={
                  isActive
                    ? {
                        backgroundColor: styles.accentColor,
                        color: '#ffffff',
                      }
                    : undefined
                }
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all md:px-5 ${
                  isActive ? 'shadow-sm' : styles.chipTextColor
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
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

export function AppearancePageZoomItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { pageZoom, styles, updateSettings } = controller;
  const pageZoomOptions: readonly PageZoom[] = PAGE_ZOOM_OPTIONS;
  const normalizedPageZoom = normalizePageZoom(pageZoom);
  const currentPageZoomIndex = pageZoomOptions.indexOf(normalizedPageZoom);
  const canDecreasePageZoom = currentPageZoomIndex > 0;
  const canIncreasePageZoom =
    currentPageZoomIndex >= 0 && currentPageZoomIndex < pageZoomOptions.length - 1;
  const hasCustomPageZoom = normalizedPageZoom !== 100;

  const decreasePageZoom = () => {
    if (!canDecreasePageZoom) {
      return;
    }

    updateSettings({ pageZoom: pageZoomOptions[currentPageZoomIndex - 1] });
  };

  const increasePageZoom = () => {
    if (!canIncreasePageZoom) {
      return;
    }

    updateSettings({ pageZoom: pageZoomOptions[currentPageZoomIndex + 1] });
  };

  return (
    <SettingsItem
      title={t('settings.appearance.pageZoom.title')}
      description={t('settings.appearance.pageZoom.description')}
      styles={styles}
    >
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${styles.borderColor} ${styles.softBg}`}
      >
        {hasCustomPageZoom ? (
          <>
            <button
              type="button"
              onClick={() => updateSettings({ pageZoom: 100 })}
              className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition-all ${styles.softBg} ${styles.chipTextColor}`}
              aria-label={t('common.reset')}
            >
              {t('common.reset')}
            </button>
            <div className={`h-6 w-px ${styles.borderColor}`} />
          </>
        ) : null}
        <button
          type="button"
          onClick={decreasePageZoom}
          disabled={!canDecreasePageZoom}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            canDecreasePageZoom
              ? `${styles.softBg} ${styles.chipTextColor}`
              : 'cursor-not-allowed opacity-40'
          }`}
          aria-label={t('settings.appearance.pageZoom.decreaseAria')}
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className={`min-w-18 text-center text-sm font-medium ${styles.textColor}`}>
          {normalizedPageZoom}%
        </div>
        <button
          type="button"
          onClick={increasePageZoom}
          disabled={!canIncreasePageZoom}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
            canIncreasePageZoom
              ? `${styles.softBg} ${styles.chipTextColor}`
              : 'cursor-not-allowed opacity-40'
          }`}
          aria-label={t('settings.appearance.pageZoom.increaseAria')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </SettingsItem>
  );
}

export function AppearanceAmbienceItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { ambientLightBleed, effectsQuality, styles, theme, updateSettings } = controller;
  const ambienceDisabled = effectsQuality !== 'high';
  const effectiveAmbientLightBleed = ambientLightBleed && !ambienceDisabled;

  return (
    <SettingsItem
      title={t('settings.appearance.ambience.title')}
      description={t('settings.appearance.ambience.description')}
      styles={styles}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem] md:gap-5 md:items-start xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-3">
          <div
            className={`inline-flex w-fit flex-wrap rounded-full border p-1 ${styles.borderColor} ${styles.softBg}`}
          >
            {[
              { value: true, label: t('settings.appearance.ambience.ambientBleed') },
              { value: false, label: t('settings.appearance.ambience.contained') },
            ].map((option) => {
              const isActive = effectiveAmbientLightBleed === option.value;
              return (
                <button
                  type="button"
                  key={option.label}
                  onClick={() => updateSettings({ ambientLightBleed: option.value })}
                  disabled={ambienceDisabled}
                  style={
                    isActive
                      ? {
                          backgroundColor: styles.accentColor,
                          color: '#ffffff',
                        }
                      : {
                          color: undefined,
                        }
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all md:px-5 ${
                    isActive ? 'shadow-sm' : styles.chipTextColor
                  } ${ambienceDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  aria-pressed={isActive}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {ambienceDisabled ? (
            <p className={`text-sm ${styles.subtleColor}`}>
              {t('settings.appearance.ambience.disabledInLowPower')}
            </p>
          ) : null}
        </div>

        <div className="hidden md:block">
          <AmbientLightPreviewCard
            accentColor={styles.accentColor}
            ambientLightBleed={effectiveAmbientLightBleed}
            theme={theme}
          />
        </div>
      </div>
    </SettingsItem>
  );
}

export function AppearanceWallpaperItem({ controller }: { controller: SettingsSectionController }) {
  const { t } = useI18n();
  const { handleRemoveWallpaper, handleSelectWallpaper, handleWallpaperUpload, styles, wallpaper } =
    controller;

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
              <img
                src={wallpaper}
                alt={t('settings.appearance.wallpaper.previewAlt')}
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
              className={`absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full ${styles.floatingButtonBg} ${styles.floatingButtonText} shadow-lg transition-all hover:scale-110`}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <label
              className={`mt-3 flex h-14 cursor-pointer items-center justify-center gap-3 rounded-[18px] border-2 border-dashed md:mt-4 md:h-16 md:rounded-[20px] ${styles.lineColor} transition-colors ${styles.hoverBg}`}
            >
              <Upload className={`h-4 w-4 ${styles.mutedColor}`} />
              <div className="text-center">
                <p className={`text-sm font-medium ${styles.textColor}`}>
                  {t('settings.appearance.wallpaper.replace')}
                </p>
                <p className={`text-[11px] ${styles.subtleColor}`}>
                  {t('settings.appearance.wallpaper.fileHint')}
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleWallpaperUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <label
            className={`flex h-28 max-w-2xl cursor-pointer flex-col items-center justify-center rounded-[20px] border-2 border-dashed text-center transition-colors md:h-36 md:rounded-3xl ${styles.lineColor} ${styles.hoverBg}`}
          >
            <ImageIcon className={`mb-2 h-8 w-8 md:mb-3 md:h-9 md:w-9 ${styles.mutedColor}`} />
            <span className={`text-sm font-medium ${styles.textColor}`}>
              {t('settings.appearance.wallpaper.upload')}
            </span>
            <span className={`mt-1 text-[11px] ${styles.subtleColor}`}>
              {t('settings.appearance.wallpaper.fileHint')}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleWallpaperUpload}
              className="hidden"
            />
          </label>
        )}

        <div className="max-w-5xl">
          <div className="flex flex-wrap gap-3">
            {BUILT_IN_WALLPAPERS.map((option) => {
              const isSelected = wallpaper === option.src;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(option.src)}
                  aria-pressed={isSelected}
                  aria-label={t('settings.appearance.wallpaper.optionAria', { id: option.id })}
                  className="group relative h-14 w-14 overflow-hidden rounded-full border transition-all md:h-16 md:w-16"
                  style={{
                    borderColor: isSelected ? `${styles.accentColor}88` : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${styles.accentColor}55` : undefined,
                  }}
                >
                  <img
                    src={option.src}
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
