import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { memo } from 'react';

interface CompactRoomSelectorProps {
  value: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  onChange?: (room: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  variant?: 'plain' | 'soft';
  contentClassName?: string;
  labelClassName?: string;
  iconClassName?: string;
  iconOnly?: boolean;
  IconComponent?: LucideIcon;
}

export const CompactRoomSelector = memo(function CompactRoomSelector({
  value,
  label,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  variant = 'plain',
  contentClassName,
  labelClassName,
  iconClassName,
  iconOnly = false,
  IconComponent = ChevronDown,
}: CompactRoomSelectorProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={cn(
        'relative inline-flex items-center transition-colors',
        variant === 'soft' && [
          'h-10 rounded-full border px-3 focus-within:ring-2 focus-within:ring-orange-400/35 focus-within:ring-offset-2',
          surface.border,
          surface.subtleBg,
          surface.hoverBg,
          surface.ringOffset,
        ],
        iconOnly && 'w-10 justify-center px-0',
        disabled && 'opacity-50'
      )}
    >
      {onChange ? (
        <select
          aria-label={ariaLabel ?? t('common.room')}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-white text-sm font-normal text-slate-900 opacity-0 disabled:cursor-not-allowed"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <div
        className={`inline-flex min-w-0 items-center gap-2 text-sm ${surface.textPrimary} ${contentClassName ?? ''}`}
      >
        <span
          className={cn(
            'max-w-[12rem] truncate font-medium',
            iconOnly && 'sr-only',
            labelClassName
          )}
        >
          {label}
        </span>
        <IconComponent
          aria-hidden="true"
          className={`h-4 w-4 ${surface.textSecondary} ${iconClassName ?? ''}`}
        />
      </div>
    </div>
  );
});
