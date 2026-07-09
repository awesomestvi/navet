import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Check, Pencil } from 'lucide-react';

interface SectionCustomizeButtonProps {
  isEditMode: boolean;
  onToggle: () => void;
}

export function SectionCustomizeButton({ isEditMode, onToggle }: SectionCustomizeButtonProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const label = isEditMode ? t('dashboard.roomNav.doneEditing') : t('dashboard.roomNav.customize');

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[22px] text-xs font-medium transition-colors xl:w-auto xl:gap-2 xl:border xl:px-3 xl:text-sm ${
        isEditMode
          ? 'border-transparent text-white shadow-sm'
          : `${surface.border} ${surface.textSecondary} ${surface.hoverBg}`
      }`}
      style={isEditMode ? { backgroundColor: accentColor } : undefined}
    >
      {isEditMode ? (
        <>
          <Check className="h-5 w-5 text-white" />
          <span className="hidden text-xs font-medium text-white xl:inline">{label}</span>
        </>
      ) : (
        <>
          <Pencil className={`h-5 w-5 ${surface.textSecondary}`} />
          <span className={`hidden text-xs font-medium xl:inline ${surface.textSecondary}`}>
            {label}
          </span>
        </>
      )}
    </button>
  );
}
