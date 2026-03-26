import { Activity, LogOut } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/app/contexts/auth-context';
import { useClickOutside, useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';

interface UserDropdownProps {
  avatarUrl?: string | null;
}

export const UserDropdown = memo(function UserDropdown({ avatarUrl }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false), isOpen);
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const user = useHomeAssistant(homeAssistantSelectors.user);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const { logout } = useAuth();

  const handleLogout = () => {
    if (confirm(t('settings.feedback.logoutConfirm'))) {
      setIsOpen(false);
      logout();
    }
  };

  // Theme colors
  const textPrimary = surface.textPrimary;
  const textMuted = surface.textMuted;
  const divider = surface.border;
  const itemBg = surface.subtleBg;
  const accentColor = getThemeColorValue(primaryColor);
  const dropdownPanelClassName = `rounded-2xl border shadow-2xl ${surface.panel} ${surface.border} ${
    theme === 'glass' ? 'backdrop-blur-xl' : ''
  }`;
  const statusCardClassName = `flex items-center gap-3 rounded-xl border px-3 py-3 ${surface.border} ${itemBg}`;
  const logoutButtonClassName =
    'inline-flex w-full items-center gap-2 rounded-full bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/15';

  const fullName = user?.name?.trim() || t('userDropdown.defaultUser');
  const initials = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [fullName]);
  const roleLabel = user?.is_owner
    ? t('userDropdown.role.owner')
    : user?.is_admin
      ? t('userDropdown.role.administrator')
      : t('userDropdown.role.user');

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex h-9 w-9 items-center justify-center rounded-[22px] transition-colors ${surface.hoverBg} md:h-10 md:w-10`}
        aria-label={t('userDropdown.openMenu')}
        aria-expanded={isOpen}
      >
        <Avatar
          className="h-8 w-8 transition-transform group-hover:scale-105 md:h-[34px] md:w-[34px]"
          style={{
            backgroundColor: accentColor,
            boxShadow: connected
              ? `0 0 0 1px ${accentColor}55, 0 0 0 2px ${accentColor}14`
              : undefined,
            opacity: connected ? 1 : 0.82,
          }}
        >
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
          <AvatarFallback className="bg-transparent text-white text-xs font-semibold md:text-sm">
            {initials || t('userDropdown.defaultInitial')}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden ${dropdownPanelClassName}`}
        >
          {/* User Info Section */}
          <div className={`p-4 border-b ${divider}`}>
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                className="h-12 w-12"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: connected
                    ? `0 0 0 2px ${accentColor}66, 0 0 0 6px ${accentColor}1f`
                    : `0 0 0 1px rgba(255,255,255,0.08)`,
                  opacity: connected ? 1 : 0.84,
                }}
              >
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                <AvatarFallback className="bg-transparent text-white font-semibold">
                  {initials || t('userDropdown.defaultInitial')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${textPrimary}`}>{fullName}</p>
                <p className={`mt-0.5 text-xs ${textMuted}`}>{roleLabel}</p>
              </div>
            </div>

            <div className={statusCardClassName}>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: connected ? `${accentColor}1f` : 'rgba(255,255,255,0.05)',
                }}
              >
                <Activity
                  className="h-4 w-4"
                  style={{ color: connected ? accentColor : undefined }}
                />
              </div>
              <div className="min-w-0">
                <p className={`text-xs ${textMuted}`}>
                  {t('settings.system.connection.connectedTo')}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: connected ? '#22c55e' : '#6b7280' }}
                  />
                  <p className={`truncate text-sm font-medium ${textPrimary}`}>
                    {connected ? 'Home Assistant' : t('settings.system.connection.notConnected')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className={`p-2 border-t ${divider}`}>
            <button type="button" onClick={handleLogout} className={logoutButtonClassName}>
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
