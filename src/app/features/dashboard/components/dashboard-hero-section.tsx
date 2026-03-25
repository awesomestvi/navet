import type { CSSProperties, ReactNode } from 'react';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';

interface DashboardHeroSectionProps {
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
}

export function DashboardHeroSection({
  accentColor,
  surface,
  eyebrow,
  title,
  description,
  actions,
  aside,
}: DashboardHeroSectionProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-[28px] border p-5 md:p-7 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={
          {
            background: `radial-gradient(circle at top left, ${accentColor}30, transparent 34%), radial-gradient(circle at bottom right, ${accentColor}14, transparent 28%)`,
          } as CSSProperties
        }
      />

      <div
        className={`relative grid gap-6 ${
          aside ? 'xl:grid-cols-[minmax(0,1.35fr)_22rem] xl:items-start' : ''
        }`}
      >
        <div>
          {eyebrow ? eyebrow : null}
          <h1
            className={`mt-4 max-w-3xl text-2xl font-semibold tracking-tight md:text-4xl ${surface.textPrimary}`}
          >
            {title}
          </h1>
          {description ? (
            <p className={`mt-3 max-w-2xl text-sm leading-6 md:text-base ${surface.textSecondary}`}>
              {description}
            </p>
          ) : null}
          {actions ? <div className="mt-6 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {aside ? <div>{aside}</div> : null}
      </div>
    </section>
  );
}
