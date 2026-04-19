import { Settings2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

interface CardSettingsActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme: ThemeType;
  size?: CardSize | 'large';
  className?: string;
  tone?: 'default' | 'muted';
  variant?: 'neutral' | 'soft';
}

export function CardSettingsActionButton({
  theme,
  size = 'medium',
  className = '',
  tone = 'default',
  variant = 'neutral',
  ...props
}: CardSettingsActionButtonProps) {
  const { t } = useI18n();

  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant={variant}
      aria-label={props['aria-label'] ?? t('common.moreActions')}
      className={`${
        tone === 'muted' ? 'opacity-50' : 'hover:scale-105 active:scale-95'
      } ${className}`}
      iconClassName={tone === 'muted' ? 'text-current/60' : ''}
      {...props}
    >
      <Settings2
        className={
          size === 'large'
            ? 'h-3.5 w-3.5'
            : size === 'tiny'
              ? 'h-2.5 w-2.5'
              : size === 'extra-small'
                ? 'h-3 w-3'
                : 'h-3.5 w-3.5'
        }
      />
    </RoundControlButton>
  );
}
