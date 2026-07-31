import { getNavetAccentWashStyle } from '@navet/app/components/shared/theme/accent-wash-style';
import { cn } from '@navet/app/components/ui/utils';
import type { LucideIcon } from 'lucide-react';
import { createContext, type ReactNode, useContext } from 'react';
import type { SettingsSectionStyles } from '../hooks/settings-section-styles';

interface SettingsSectionShellProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  styles: SettingsSectionStyles;
  children: ReactNode;
}

interface SettingsItemProps {
  title: string;
  description: string;
  styles: SettingsSectionStyles;
  children: ReactNode;
}

const SettingsEmbeddedSurfaceContext = createContext(false);

export function SettingsEmbeddedSurface({ children }: { children: ReactNode }) {
  return (
    <SettingsEmbeddedSurfaceContext.Provider value>
      {children}
    </SettingsEmbeddedSurfaceContext.Provider>
  );
}

export function SettingsSectionShell({
  id,
  icon: Icon,
  title,
  description,
  styles,
  children,
}: SettingsSectionShellProps) {
  const embedded = useContext(SettingsEmbeddedSurfaceContext);

  return (
    <section
      id={id}
      className={cn(
        '@container/settings-detail',
        embedded
          ? 'min-w-0'
          : `rounded-[28px] border ${styles.borderColor} ${styles.cardBg} md:rounded-4xl`
      )}
    >
      <div className={embedded ? 'px-4 py-5 md:px-6 md:py-7 lg:px-8' : 'px-4 py-5 md:px-8 md:py-8'}>
        <div
          className={cn(
            'relative flex items-start justify-center gap-3 overflow-hidden rounded-[22px] px-4 py-5 text-left',
            '@xl/settings-detail:flex-col @xl/settings-detail:items-center @xl/settings-detail:gap-0',
            '@xl/settings-detail:px-6 @xl/settings-detail:py-6 @xl/settings-detail:text-center',
            styles.insetBg
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-90"
            style={getNavetAccentWashStyle(styles.accentColor)}
          />
          <div
            className={cn(
              'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
              '@xl/settings-detail:h-12 @xl/settings-detail:w-12 @xl/settings-detail:rounded-[18px]',
              styles.borderColor,
              styles.iconBg
            )}
          >
            <Icon
              className={cn(
                'h-4.5 w-4.5 @xl/settings-detail:h-5 @xl/settings-detail:w-5',
                styles.mutedColor
              )}
            />
          </div>
          <div className="relative min-w-0 @xl/settings-detail:flex @xl/settings-detail:flex-col @xl/settings-detail:items-center">
            <h2
              id={`${id}-settings-title`}
              className={cn(
                'text-lg font-semibold tracking-tight',
                '@xl/settings-detail:mt-3 @xl/settings-detail:text-xl',
                styles.textColor
              )}
            >
              {title}
            </h2>
            <p className={cn('mt-1 max-w-2xl text-sm leading-6', styles.subtleColor)}>
              {description}
            </p>
          </div>
        </div>

        <div className={cn('mt-3 divide-y', styles.dividerColor)}>{children}</div>
      </div>
    </section>
  );
}

export function SettingsItem({ title, description, styles, children }: SettingsItemProps) {
  return (
    <div
      className={cn(
        'scroll-mt-4 py-4 outline-none md:py-6',
        'focus-visible:rounded-[20px] focus-visible:ring-2 focus-visible:ring-offset-4',
        styles.ringClass,
        styles.ringOffsetClass
      )}
      data-settings-search-label={title}
      tabIndex={-1}
    >
      <div className="grid gap-4 md:gap-5 @3xl/settings-detail:grid-cols-[minmax(0,280px)_minmax(0,1fr)] @3xl/settings-detail:gap-8">
        <div className="min-w-0">
          <h3 className={`text-base font-medium tracking-tight ${styles.textColor}`}>{title}</h3>
          <p
            className={`mt-1.5 text-sm leading-6 md:mt-2 md:leading-relaxed ${styles.subtleColor}`}
          >
            {description}
          </p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
