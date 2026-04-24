import { ArrowUpRight } from 'lucide-react';
import { type AnchorHTMLAttributes, forwardRef, type ReactNode } from 'react';
import { getThemeFocusRingClassName, navetTypographyTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  className?: string;
  appearance?: 'default' | 'subtle';
  size?: 'small' | 'medium';
  showExternalIcon?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    children,
    className,
    appearance = 'default',
    size = 'medium',
    showExternalIcon = false,
    target,
    rel,
    ...props
  },
  ref
) {
  const { theme } = useTheme();
  const isExternal = target === '_blank';

  const colorClassName =
    appearance === 'subtle'
      ? theme === 'light'
        ? 'text-slate-700 hover:text-slate-900'
        : theme === 'black'
          ? 'text-zinc-300 hover:text-white'
          : 'text-white/80 hover:text-white'
      : theme === 'light'
        ? 'text-slate-900 hover:text-slate-950'
        : 'text-white hover:text-white';

  return (
    <a
      {...props}
      ref={ref}
      target={target}
      rel={isExternal ? (rel ?? 'noreferrer') : rel}
      className={cn(
        navetTypographyTokens.control,
        'inline-flex items-center gap-1 underline decoration-current/25 underline-offset-4 transition-[color,opacity,text-decoration-color] hover:decoration-current/50',
        getThemeFocusRingClassName(theme),
        colorClassName,
        className
      )}
    >
      {children}
      {showExternalIcon && isExternal ? (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : null}
    </a>
  );
});
