import { Settings2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
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
  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant={variant}
      className={`${
        tone === 'muted' ? 'opacity-50' : 'hover:scale-105 active:scale-95'
      } ${className}`}
      iconClassName={tone === 'muted' ? 'text-current/60' : ''}
      {...props}
    >
      <Settings2
        className={
          size === 'large' ? 'h-4 w-4' : size === 'extra-small' ? 'h-3 w-3' : 'h-3.5 w-3.5'
        }
      />
    </RoundControlButton>
  );
}
