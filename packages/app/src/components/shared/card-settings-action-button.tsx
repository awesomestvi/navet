import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import {
  normalizeCustomCardTint,
  withTintAlpha,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Settings2 } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';

interface CardSettingsActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme: ThemeType;
  size?: CardSize | 'large';
  className?: string;
  tone?: 'default' | 'muted';
  variant?: 'neutral' | 'soft';
  accentColor?: string;
}

function getSettingsActionAccentStyle(theme: ThemeType, accentColor?: string) {
  const normalizedAccent = normalizeCustomCardTint(accentColor);
  if (!normalizedAccent) {
    return null;
  }

  if (theme === 'light') {
    return {
      className: 'hover:brightness-105',
      iconStyle: { color: normalizedAccent },
      style: {
        background: withTintAlpha(normalizedAccent, 0.08),
        borderColor: withTintAlpha(normalizedAccent, 0.18),
        color: normalizedAccent,
        boxShadow: `0 12px 26px -24px ${withTintAlpha(normalizedAccent, 0.28)}, inset 0 1px 0 rgba(255,255,255,0.58)`,
      } as CSSProperties,
    };
  }

  return {
    className: 'hover:brightness-105',
    iconStyle: { color: withTintAlpha(normalizedAccent, theme === 'black' ? 0.92 : 0.86) },
    style: {
      background:
        theme === 'black'
          ? withTintAlpha(normalizedAccent, 0.12)
          : withTintAlpha(normalizedAccent, 0.1),
      borderColor: withTintAlpha(normalizedAccent, theme === 'black' ? 0.24 : 0.2),
      color: withTintAlpha(normalizedAccent, theme === 'black' ? 0.92 : 0.86),
      boxShadow: `0 14px 30px -28px ${withTintAlpha(normalizedAccent, 0.38)}, inset 0 1px 0 rgba(255,255,255,0.08)`,
    } as CSSProperties,
  };
}

export function CardSettingsActionButton({
  theme,
  size = 'medium',
  className = '',
  tone = 'default',
  variant = 'neutral',
  accentColor,
  style,
  ...props
}: CardSettingsActionButtonProps) {
  const { t } = useI18n();
  const accentStyle = getSettingsActionAccentStyle(theme, accentColor);

  return (
    <RoundControlButton
      theme={theme}
      size={size}
      variant={variant}
      aria-label={props['aria-label'] ?? t('common.moreActions')}
      className={`${
        tone === 'muted' ? 'opacity-50' : 'hover:scale-105 active:scale-95'
      } ${accentStyle?.className ?? ''} ${className}`}
      iconClassName={tone === 'muted' ? 'text-current/60' : ''}
      iconStyle={accentStyle?.iconStyle}
      style={{
        ...(accentStyle?.style ?? {}),
        ...(style ?? {}),
      }}
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
