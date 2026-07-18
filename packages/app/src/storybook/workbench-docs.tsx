import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { ReactNode } from 'react';

export function WorkbenchPage({
  children,
  width = 'wide',
}: {
  children: ReactNode;
  width?: 'reading' | 'wide';
}) {
  return (
    <div
      className={`mx-auto space-y-6 py-2 md:py-4 ${width === 'reading' ? 'max-w-4xl' : 'max-w-5xl'}`}
    >
      {children}
    </div>
  );
}

export function WorkbenchIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <header className={`relative overflow-hidden border-b pb-8 md:pb-10 ${surface.border}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 -top-36 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `${accentColor}1a` }}
      />
      <p
        className={`relative flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] ${surface.textMuted}`}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: accentColor, boxShadow: `0 0 0 6px ${accentColor}14` }}
        />
        {eyebrow}
      </p>
      <h1
        className={`relative mt-5 max-w-3xl text-3xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-4xl ${surface.textPrimary}`}
      >
        {title}
      </h1>
      <div className={`relative mt-4 max-w-3xl text-sm leading-7 ${surface.textSecondary}`}>
        {children}
      </div>
    </header>
  );
}

export function WorkbenchPanel({
  title,
  summary,
  children,
  className = '',
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <section
      className={`rounded-[24px] border p-5 md:p-6 ${surface.panel} ${surface.border} ${className}`}
    >
      <h2 className={`text-xl font-semibold tracking-tight ${surface.textPrimary}`}>{title}</h2>
      {summary ? (
        <p className={`mt-2 text-sm leading-6 ${surface.textSecondary}`}>{summary}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function WorkbenchCode({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <pre
      className={`overflow-x-auto rounded-xl border p-3 text-xs leading-5 ${surface.panelMuted} ${surface.border} ${surface.textPrimary}`}
    >
      {children}
    </pre>
  );
}

export function WorkbenchInset({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={`rounded-[16px] border p-4 ${surface.panelMuted} ${surface.border} ${surface.textSecondary} ${className}`}
    >
      {children}
    </div>
  );
}
