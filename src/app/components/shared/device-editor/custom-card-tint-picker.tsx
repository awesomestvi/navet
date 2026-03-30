import { memo } from 'react';
import { ColorInputSwatch } from '@/app/components/shared/color-input-swatch';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { DialogSectionRow } from './dialog-section-row';

interface CustomCardTintPickerProps {
  value?: string;
  onChange: (color: string) => void;
  defaultColor?: string;
  className?: string;
}

export const CustomCardTintPicker = memo(function CustomCardTintPicker({
  value,
  onChange,
  defaultColor = '#f97316',
  className = '',
}: CustomCardTintPickerProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DialogSectionRow label={t('widgets.customCard.color')} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <ColorInputSwatch
          mode="picker"
          value={value ?? defaultColor}
          ariaLabel={t('widgets.customCard.colorPicker')}
          selected={Boolean(value)}
          size="small"
          onChange={onChange}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className={`ml-1 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-opacity hover:opacity-80 ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
          >
            {t('common.reset')}
          </button>
        ) : null}
      </div>
    </DialogSectionRow>
  );
});
