import { useAuthLogout } from '@navet/app/auth/AuthProvider';
import { useI18n } from '@navet/app/i18n';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useLogout() {
  const logout = useAuthLogout();
  const { t } = useI18n();

  return useCallback(async () => {
    try {
      await logout();
      toast.success(t('settings.feedback.logoutSuccess'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errorDisplay.connectionInterrupted'));
    }
  }, [logout, t]);
}
