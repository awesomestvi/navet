import type { ReactNode } from 'react';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';

interface EnergyWidgetShellProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function EnergyWidgetShell({
  title,
  eyebrow,
  action,
  className = '',
  children,
}: EnergyWidgetShellProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);

  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 md:p-6 ${surface.border} ${surface.panel} ${cardShell.backdropClassName} ${surface.cardShadow} ${className}`}
    >
      {cardShell.sheenOverlayClassName ? (
        <div
          className={`pointer-events-none absolute inset-0 ${cardShell.sheenOverlayClassName}`}
        />
      ) : null}
      {surface.lightOverlay ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.lightOverlay}`} />
      ) : null}
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2 className={`mt-2 text-lg font-semibold tracking-tight ${surface.textPrimary}`}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="relative mt-5">{children}</div>
    </section>
  );
}
