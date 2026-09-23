import { getReadableAccentForeground } from '@navet/app/components/shared/theme/theme-colors';
import {
  getButtonSizeTokens,
  getThemeFocusRingClassName,
  navetControlTokens,
  navetSpacingTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks/use-theme';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type MarketingActionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
};

const sizeTokens = getButtonSizeTokens('default');

export function MarketingActionLink({
  href,
  children,
  variant = 'primary',
  className,
  style,
  ...props
}: MarketingActionLinkProps) {
  const { theme, accentColor } = useTheme();
  const secondaryClassName =
    theme === 'light'
      ? 'border-gray-200 bg-gray-100 text-gray-900 hover:bg-gray-200'
      : theme === 'black'
        ? 'border-white/16 bg-black text-white hover:bg-zinc-900'
        : theme === 'glass'
          ? 'border-white/16 bg-white/8 text-white hover:bg-white/12'
          : 'border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800';

  return (
    <a
      {...props}
      href={href}
      className={cn(
        'inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,opacity]',
        sizeTokens.heightClassName,
        sizeTokens.paddingXClassName,
        navetSpacingTokens.inline.sm,
        navetControlTokens.button.radiusClassName,
        sizeTokens.textClassName,
        variant === 'primary' ? 'border-transparent' : secondaryClassName,
        getThemeFocusRingClassName(theme),
        className
      )}
      style={{
        ...(variant === 'primary'
          ? { backgroundColor: accentColor, color: getReadableAccentForeground(accentColor) }
          : {}),
        ...style,
      }}
    >
      <span>{children}</span>
    </a>
  );
}
