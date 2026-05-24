import { useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/app/i18n';
import { useAuthLogout } from '@/auth/AuthProvider';

export function useLogout() {
  const logout = useAuthLogout();
  const { t } = useI18n();

  return useCallback(() => {
    logout();
    toast.success(t('settings.feedback.logoutSuccess'));
  }, [logout, t]);
}
