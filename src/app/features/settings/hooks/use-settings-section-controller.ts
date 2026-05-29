import { getProviderFeatureMatrix } from '@navet/app/provider-runtime-registry';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PRIMARY_COLOR_OPTIONS, THEME_OPTIONS } from '@/app/constants/theme-options';
import { useDashboardEntitiesStore } from '@/app/features/dashboard';
import { useI18n, useIntegrationStore, useProviderHealth, useTheme } from '@/app/hooks';
import { type EntityInteractionMode, useSettingsStore } from '@/app/stores';
import { useNavigationStore } from '@/app/stores/navigation-store';
import { integrationSelectors } from '@/app/stores/selectors';
import { useThemeStore } from '@/app/stores/theme-store';
import { INTEGRATION_PROVIDERS, type IntegrationProviderId } from '@/app/types/provider';
import { useAuthBaseUrl, useOptionalAuthSession } from '@/auth/AuthProvider';
import { getSettingsSectionStyles } from './settings-section-styles';
import { useSettingsSectionActions } from './use-settings-section-actions';

export type SectionNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ProviderCardStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'signed-in'
  | 'disconnected'
  | 'planned';

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
  const hassUrl = useAuthBaseUrl();
  const authSession = useOptionalAuthSession();
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const activeProviderId = authSession?.providerId ?? currentProviderId;
  const sessions = authSession?.sessions ?? {};
  const login = authSession?.login;
  const logout = authSession?.logout;
  const setActiveProvider = authSession?.setActiveProvider ?? (() => undefined);
  const providerHealth = useProviderHealth() as Array<{
    providerId: IntegrationProviderId;
    connected: boolean;
    connecting: boolean;
    reconnecting: boolean;
    implementationStatus: 'implemented' | 'planned';
    lastError: string | null;
  }>;
  const {
    cameraGo2RtcDefaults,
    disableAnimations,
    effectsQuality,
    lowPowerMode,
    language,
    keepDeviceAwake,
    temperatureUnit,
    use24HourTime,
    entityInteractionMode,
    ambientLightBleed,
    kioskMode,
    showHomeSummaryBar,
    updateSettings,
  } = useSettingsStore(
    useShallow((state) => ({
      disableAnimations: state.disableAnimations,
      effectsQuality: state.effectsQuality,
      lowPowerMode: state.lowPowerMode,
      cameraGo2RtcDefaults: state.cameraGo2RtcDefaults,
      language: state.language,
      keepDeviceAwake: state.keepDeviceAwake,
      temperatureUnit: state.temperatureUnit,
      use24HourTime: state.use24HourTime,
      entityInteractionMode: state.entityInteractionMode,
      ambientLightBleed: state.ambientLightBleed,
      kioskMode: state.kioskMode,
      showHomeSummaryBar: state.showHomeSummaryBar,
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
    showLogoutConfirm,
    setShowLogoutConfirm,
    showRevealAllConfirm,
    setShowRevealAllConfirm,
    showRestartOnboardingConfirm,
    setShowRestartOnboardingConfirm,
    importInputRef,
    handleLogout,
    confirmLogout,
    handleResetConnection,
    handleWallpaperUpload,
    handleRemoveWallpaper,
    handleSelectWallpaper,
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleConnectProvider,
    handleDisconnectProvider,
    handleRestartOnboarding,
  } = useSettingsSectionActions({
    t,
    activeProviderId,
    setWallpaper,
    setActiveSection,
    setCurrentRoom,
    reopenOnboarding,
    connectProvider: async ({ providerId, hassUrl }) => {
      await login?.({ providerId, hassUrl });
    },
    disconnectProvider: async (providerId) => {
      await logout?.(providerId);
    },
  });

  const styles = getSettingsSectionStyles(theme, primaryColor);
  const providerCards = useMemo(
    () =>
      Object.values(INTEGRATION_PROVIDERS).map((provider) => {
        const health = providerHealth.find((entry) => entry.providerId === provider.id);
        const session = sessions[provider.id];
        const status: ProviderCardStatus =
          health?.implementationStatus === 'planned'
            ? 'planned'
            : health?.reconnecting
              ? 'reconnecting'
              : health?.connecting
                ? 'connecting'
                : health?.connected
                  ? 'connected'
                  : session
                    ? 'signed-in'
                    : 'disconnected';

        return {
          id: provider.id,
          label: provider.label,
          loginMode: provider.loginMode,
          status,
          isActive: activeProviderId === provider.id,
          isConnected: Boolean(session),
          canConnect: provider.loginMode !== 'unavailable',
          canDisconnect: Boolean(session),
          baseUrl: session?.hassUrl ?? null,
          error: health?.lastError ?? null,
          implementationStatus: health?.implementationStatus ?? 'planned',
          featureMatrix: getProviderFeatureMatrix(provider.id),
        };
      }),
    [activeProviderId, providerHealth, sessions]
  );

  return {
    activeProviderId,
    ambientLightBleed,
    cameraGo2RtcDefaults,
    config: hassUrl ? { url: hassUrl } : null,
    customPrimaryColor,
    disableAnimations,
    effectsQuality,
    entityInteractionMode,
    followSystemTheme,
    setFollowSystemTheme,
    handleExportDashboardConfig,
    handleImportDashboardConfig,
    handleConnectProvider,
    handleDisconnectProvider,
    handleLogout,
    confirmLogout,
    handleRemoveWallpaper,
    handleResetConnection,
    handleRestartOnboarding,
    handleSelectWallpaper,
    handleWallpaperUpload,
    hiddenEntityIds,
    importInputRef,
    kioskMode,
    keepDeviceAwake,
    language,
    languageOptions,
    lowPowerMode,
    manualTheme,
    primaryColor,
    providerCards,
    reopenOnboarding,
    setActiveProvider,
    setPrimaryColor,
    setCustomPrimaryColor,
    setShowLicense,
    setShowLogoutConfirm,
    setShowRestartOnboardingConfirm,
    setShowRevealAllConfirm,
    setShowTerms,
    showHomeSummaryBar,
    setTheme,
    showAllEntities,
    showLicense,
    showLogoutConfirm,
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
