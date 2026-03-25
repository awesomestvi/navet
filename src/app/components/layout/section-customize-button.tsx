import { Check, Edit3 } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

interface SectionCustomizeButtonProps {
  isEditMode: boolean;
  onToggle: () => void;
}

export function SectionCustomizeButton({ isEditMode, onToggle }: SectionCustomizeButtonProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-[22px] border px-2.5 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-3 md:py-2 md:text-sm ${
        isEditMode
          ? 'border-transparent text-white shadow-sm'
          : `${surface.border} ${surface.textSecondary} ${surface.hoverBg}`
      }`}
      style={isEditMode ? { backgroundColor: accentColor } : undefined}
    >
      {isEditMode ? (
        <>
          <Check className="h-4 w-4 text-white" />
          <span className="hidden text-xs font-medium text-white md:inline">
            {t('dashboard.roomNav.doneEditing')}
          </span>
        </>
      ) : (
        <>
          <Edit3 className={`h-4 w-4 ${surface.textSecondary}`} />
          <span className={`hidden text-xs font-medium md:inline ${surface.textSecondary}`}>
            {t('dashboard.roomNav.customize')}
          </span>
        </>
      )}
    </button>
  );
}
