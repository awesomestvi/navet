import { ChevronDown, Home } from 'lucide-react';
import { memo } from 'react';
import { Select } from '@/app/components/primitives/select';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';

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
        <Select
          aria-label={t('common.room')}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          containerClassName="absolute inset-0 z-10"
          selectClassName="h-full cursor-pointer opacity-0"
          indicatorClassName="hidden"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}
      <div className={`inline-flex min-w-0 items-center gap-2 text-sm ${surface.textPrimary}`}>
        <Home className={`h-4 w-4 ${surface.textSecondary}`} />
        <span className="max-w-[12rem] truncate font-medium">{label}</span>
        <ChevronDown className={`h-4 w-4 ${surface.textSecondary}`} />
      </div>
    </div>
  );
});
