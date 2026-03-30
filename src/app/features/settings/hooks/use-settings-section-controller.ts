import { useShallow } from 'zustand/react/shallow';
import { PRIMARY_COLOR_OPTIONS, THEME_OPTIONS } from '@/app/constants/theme-options';
import { useAuth } from '@/app/contexts/auth-context';
import { useConfig } from '@/app/contexts/config-context';
import { useDashboardEntitiesStore } from '@/app/features/dashboard';
import { useI18n, useTheme } from '@/app/hooks';
import { type EntityInteractionMode, useSettingsStore } from '@/app/stores';
import { useNavigationStore } from '@/app/stores/navigation-store';
import { useThemeStore } from '@/app/stores/theme-store';
import { getSettingsSectionStyles } from './settings-section-styles';
import { useSettingsSectionActions } from './use-settings-section-actions';

export type SectionNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function useSettingsSectionController() {
  const {
    customPrimaryColor,
    followSystemTheme,
    theme,
    setTheme,
    setFollowSystemTheme,
    primaryColor,
    setPrimaryColor,
    setCustomPrimaryColor,
    wallpaper,
    setWallpaper,
  } = useTheme();
  const manualTheme = useThemeStore((state) => state.theme);
  const { languageOptions, t } = useI18n();
  const { logout, config } = useAuth();
  const { clearConfig } = useConfig();
  const {
    disableAnimations,
    effectsQuality,
    lowPowerMode,
    language,
    pageZoom,
    temperatureUnit,
    use24HourTime,
    entityInteractionMode,
    ambientLightBleed,
    updateSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      disableAnimations: state.disableAnimations,
      effectsQuality: state.effectsQuality,
      lowPowerMode: state.lowPowerMode,
      language: state.language,
      pageZoom: state.pageZoom,
      temperatureUnit: state.temperatureUnit,
      use24HourTime: state.use24HourTime,
      entityInteractionMode: state.entityInteractionMode,
      ambientLightBleed: state.ambientLightBleed,
      updateSettings: state.updateSettings,
    }))
  );
  const { hiddenEntityIds, showAllEntities, reopenOnboarding } = useDashboardEntitiesStore(
    useShallow((state) => ({
      hiddenEntityIds: state.hiddenEntityIds,
      showAllEntities: state.showAllEntities,
      reopenOnboarding: state.reopenOnboarding,
    }))
  );
  const { setActiveSection, setCurrentRoom } = useNavigationStore(
    useShallow((state) => ({
      setActiveSection: state.setActiveSection,
      setCurrentRoom: state.setCurrentRoom,
    }))
  );

  const {
    showLicense,
    setShowLicense,
    showTerms,
    setShowTerms,
    showRevealAllConfirm,
    setShowRevealAllConfirm,
    showRestartOnboardingConfirm,
    setShowRestartOnboardingConfirm,
    importInputRef,
    handleLogout,
    handleResetConnection,
    handleWallpaperUpload,
    handleRemoveWallpaper,
    handleSelectWallpaper,
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleRestartOnboarding,
  } = useSettingsSectionActions({
    t,
    logout,
    clearConfig,
    setWallpaper,
    setActiveSection,
    setCurrentRoom,
    reopenOnboarding,
  });

  const styles = getSettingsSectionStyles(theme, primaryColor);

  return {
    ambientLightBleed,
    config,
    customPrimaryColor,
    disableAnimations,
    effectsQuality,
    entityInteractionMode,
    followSystemTheme,
    setFollowSystemTheme,
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleLogout,
    handleRemoveWallpaper,
    handleResetConnection,
    handleRestartOnboarding,
    handleSelectWallpaper,
    handleWallpaperUpload,
    hiddenEntityIds,
    importInputRef,
    language,
    languageOptions,
    lowPowerMode,
    manualTheme,
    pageZoom,
    primaryColor,
    reopenOnboarding,
    setPrimaryColor,
    setCustomPrimaryColor,
    setShowLicense,
    setShowRestartOnboardingConfirm,
    setShowRevealAllConfirm,
    setShowTerms,
    setTheme,
    showAllEntities,
    showLicense,
    showRestartOnboardingConfirm,
    showRevealAllConfirm,
    showTerms,
    styles,
    theme,
    themeOptions: THEME_OPTIONS,
    temperatureUnit,
    colorOptions: PRIMARY_COLOR_OPTIONS,
    updateSettings,
    use24HourTime,
    wallpaper,
  };
}

export type SettingsSectionController = ReturnType<typeof useSettingsSectionController>;
export type SettingsInteractionOption = { value: EntityInteractionMode; label: string };
