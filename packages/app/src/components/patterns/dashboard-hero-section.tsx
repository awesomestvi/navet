import { SurfacePanel } from '@navet/app/components/primitives/surface-panel';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { CSSProperties, ReactNode } from 'react';

export interface DashboardHeroSectionProps {
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  aside?: ReactNode;
}

export function DashboardHeroSection({
  accentColor,
  surface,
  eyebrow,
  title,
  description,
  actions,
  actionsClassName = '',
  aside,
}: DashboardHeroSectionProps) {
  return (
    <SurfacePanel
      className={`${surface.border} ${surface.panel} ${surface.cardShadow}`}
      contentClassName="px-4 py-3 md:p-6"
      padding="none"
      radius="panel"
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
        className={`relative grid gap-4 md:gap-6 ${
          aside ? 'md:gap-5 xl:grid-cols-[minmax(0,1.35fr)_22rem] xl:items-start' : ''
        }`}
      >
        <div>
          {eyebrow ? eyebrow : null}
          <h1
            className={`mt-1.5 max-w-3xl text-[1.375rem] leading-[1.1] font-semibold tracking-tight md:mt-4 md:text-4xl md:leading-tight ${surface.textPrimary}`}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={`mt-2 hidden max-w-2xl text-sm leading-6 md:mt-3 md:block md:text-base ${surface.textSecondary}`}
            >
              {description}
            </p>
          ) : null}
          {actions ? (
            <div className={`mt-3 flex flex-wrap items-center gap-2 md:mt-6 ${actionsClassName}`}>
              {actions}
            </div>
          ) : null}
        </div>

        {aside ? <div className="hidden md:block">{aside}</div> : null}
      </div>
    </SurfacePanel>
  );
}
