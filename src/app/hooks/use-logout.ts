import { useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/app/i18n';
import { useAuth } from '@/app/stores/auth-store';
import { authSelectors } from '@/app/stores/selectors';

export function useLogout() {
  const logout = useAuth(authSelectors.logout);
  const { t } = useI18n();

  return useCallback(() => {
    logout();
    toast.success(t('settings.feedback.logoutSuccess'));
  }, [logout, t]);
}
