import { type ChangeEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { TranslateFn } from '@/app/hooks';
import { useLogout } from '@/app/hooks/use-logout';
import {
  downloadDashboardConfig,
  importDashboardConfigFromFile,
} from '@/app/utils/dashboard-config';
import { readFileAsDataUrl, validateImageFile } from '@/app/utils/image-upload';

interface SettingsSectionActionDeps {
  t: TranslateFn;
  clearConfig: () => void;
  setWallpaper: (wallpaper: string | null) => void;
  setActiveSection: (section: 'home') => void;
  setCurrentRoom: (room: string) => void;
  reopenOnboarding: () => void;
}

export function useSettingsSectionActions({
  t,
  clearConfig,
  setWallpaper,
  setActiveSection,
  setCurrentRoom,
  reopenOnboarding,
}: SettingsSectionActionDeps) {
  const performLogout = useLogout();
  const [showLicense, setShowLicense] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRevealAllConfirm, setShowRevealAllConfirm] = useState(false);
  const [showRestartOnboardingConfirm, setShowRestartOnboardingConfirm] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    performLogout();
  };

  const handleResetConnection = () => {
    if (confirm(t('settings.feedback.resetConnectionConfirm'))) {
      clearConfig();
      performLogout();
      toast.info(t('settings.feedback.resetConnectionSuccess'));
    }
  };

  const handleWallpaperUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setWallpaper(await readFileAsDataUrl(file));
    } catch (error) {
      alert(error instanceof Error ? error.message : t('settings.feedback.wallpaperReadFailed'));
    }
  };

  const handleRemoveWallpaper = () => {
    setWallpaper(null);
  };

  const handleSelectWallpaper = (nextWallpaper: string) => {
    setWallpaper(nextWallpaper);
  };

  const handleExportDashboardConfig = async () => {
    try {
      await downloadDashboardConfig();
      toast.success(t('settings.feedback.configExported'));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      toast.error(t('settings.feedback.configExportFailed'));
    }
  };

  const handleImportDashboardConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await importDashboardConfigFromFile(file);
      toast.success(t('settings.feedback.configImported'));
      window.setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (error) {
      console.error('[SettingsSectionActions] Config import failed:', error);
      toast.error(t('settings.feedback.configImportFailed'));
    } finally {
      event.target.value = '';
    }
  };

  const handleRestartOnboarding = () => {
    setActiveSection('home');
    setCurrentRoom('All');
    reopenOnboarding();
    setShowRestartOnboardingConfirm(false);
  };

  return {
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
    handleRestartOnboarding,
  };
}
