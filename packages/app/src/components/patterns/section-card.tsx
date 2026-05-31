import { SurfacePanel } from '@navet/app/components/primitives/surface-panel';
import { useTheme } from '@navet/app/hooks';
import type { ReactNode } from 'react';

export interface SectionCardProps {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function SectionCard({
  title,
  eyebrow,
  description,
  action,
  children,
  className,
  contentClassName,
  padding = 'lg',
}: SectionCardProps) {
  const { theme } = useTheme();
  const eyebrowTextClassName = theme === 'light' ? 'text-slate-500' : 'text-white/60';
  const bodyTextClassName = theme === 'light' ? 'text-slate-900' : 'text-white';
  const descriptionTextClassName = theme === 'light' ? 'text-slate-600' : 'text-white/64';

  return (
    <SurfacePanel
      className={className}
      contentClassName={contentClassName}
      padding={padding}
      variant="elevated"
      withSheen
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <div
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowTextClassName}`}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2
            className={`${eyebrow ? 'mt-2' : ''} text-lg font-semibold tracking-tight ${bodyTextClassName}`}
          >
            {title}
          </h2>
          {description ? (
            <p className={`mt-1 max-w-2xl text-sm leading-6 ${descriptionTextClassName}`}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      <div className="relative mt-5">{children}</div>
    </SurfacePanel>
  );
}
