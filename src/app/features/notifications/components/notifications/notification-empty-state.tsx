import { Bell } from 'lucide-react';
import { InlineEmptyState } from '@/app/components/patterns/inline-empty-state';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

export function NotificationEmptyState() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="p-6">
      <InlineEmptyState
        title={t('notifications.empty.title')}
        description={t('notifications.empty.description')}
        surface={{
          ...surface,
          cardShadow: '',
          panelMuted: surface.panel,
        }}
        icon={Bell}
        className="mx-auto max-w-sm"
      />
    </div>
  );
}
