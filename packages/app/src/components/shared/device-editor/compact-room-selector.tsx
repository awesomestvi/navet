import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { ChevronDown } from 'lucide-react';
import { memo } from 'react';

interface CompactRoomSelectorProps {
  value: string;
  label: string;
  options: Array<{ label: string; value: string }>;
  onChange?: (room: string) => void;
}

export const CompactRoomSelector = memo(function CompactRoomSelector({
  value,
  label,
  options,
  onChange,
}: CompactRoomSelectorProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="relative inline-flex items-center">
      {onChange ? (
        <select
          aria-label={t('common.room')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none bg-white text-slate-900 opacity-0 disabled:cursor-not-allowed"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <div className={`inline-flex min-w-0 items-center gap-2 text-sm ${surface.textPrimary}`}>
        <span className="max-w-[12rem] truncate font-medium">{label}</span>
        <ChevronDown className={`h-4 w-4 ${surface.textSecondary}`} />
      </div>
    </div>
  );
});
