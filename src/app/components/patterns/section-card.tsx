import type { ReactNode } from 'react';
import { SurfacePanel } from '@/app/components/primitives/surface-panel';
import { useTheme } from '@/app/hooks';

export interface SectionCardProps {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, eyebrow, action, children, className }: SectionCardProps) {
  const { theme } = useTheme();
  const eyebrowTextClassName = theme === 'light' ? 'text-slate-500' : 'text-white/60';
  const bodyTextClassName = theme === 'light' ? 'text-slate-900' : 'text-white';

  return (
    <SurfacePanel className={className} padding="lg" variant="elevated" withSheen>
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <div
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowTextClassName}`}
            >
              {eyebrow}
            </div>
          ) : null}
          <h2 className={`mt-2 text-lg font-semibold tracking-tight ${bodyTextClassName}`}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="relative mt-5">{children}</div>
    </SurfacePanel>
  );
}
