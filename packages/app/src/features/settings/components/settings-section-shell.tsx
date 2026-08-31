import { navetIconSizeTokens, navetTypographyTokens } from '@navet/app/components/system/tokens';
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
  grouped?: boolean;
}

interface SettingsItemProps {
  title: string;
  description: string;
  styles: SettingsSectionStyles;
  children: ReactNode;
}

interface SettingsSectionGroupProps {
  id: string;
  title: string;
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
  grouped = false,
}: SettingsSectionShellProps) {
  const embedded = useContext(SettingsEmbeddedSurfaceContext);

  return (
    <section
      id={id}
      data-settings-embedded={embedded ? '' : undefined}
      className={cn(
        '@container/settings-detail',
        embedded
          ? 'min-w-0'
          : `min-w-0 rounded-[28px] border ${styles.borderColor} ${styles.cardBg}`
      )}
    >
      <div className={embedded ? 'px-4 py-5 md:px-6 md:py-7 lg:px-8' : 'px-4 py-5 md:px-6 md:py-7'}>
        <div
          className={cn(
            'flex min-w-0 items-start gap-3 px-1 text-left md:items-center',
            styles.textColor
          )}
          data-settings-detail-header
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border',
              styles.borderColor,
              styles.iconBg,
              styles.mutedColor
            )}
          >
            <Icon className={navetIconSizeTokens.sm} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`${id}-settings-title`}
              className={cn(navetTypographyTokens.sectionHeading, styles.textColor)}
            >
              {title}
            </h2>
            <p
              className={cn('mt-0.5 max-w-2xl text-sm leading-5 md:leading-6', styles.subtleColor)}
            >
              {description}
            </p>
          </div>
        </div>

        {grouped ? (
          <div className="mt-6 grid gap-6" data-settings-detail-groups>
            {children}
          </div>
        ) : (
          <div
            className={cn(
              'mt-5 overflow-hidden rounded-[22px] border divide-y',
              styles.insetBorderColor,
              styles.insetBg,
              styles.dividerColor
            )}
            data-settings-detail-group
          >
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

export function SettingsSectionGroup({ id, title, styles, children }: SettingsSectionGroupProps) {
  return (
    <section aria-labelledby={`${id}-settings-group-title`}>
      <h3
        id={`${id}-settings-group-title`}
        className={cn(
          'mb-2 px-1',
          navetTypographyTokens.caption,
          'font-semibold',
          styles.subtleColor
        )}
      >
        {title}
      </h3>
      <div
        className={cn(
          'overflow-hidden rounded-[22px] border divide-y',
          styles.insetBorderColor,
          styles.insetBg,
          styles.dividerColor
        )}
        data-settings-detail-group={id}
      >
        {children}
      </div>
    </section>
  );
}

export function SettingsItem({ title, description, styles, children }: SettingsItemProps) {
  return (
    <div
      className={cn(
        'scroll-mt-4 px-4 py-4 outline-none md:px-5 md:py-5',
        'focus-visible:ring-2 focus-visible:ring-inset',
        styles.ringClass,
        'transition-colors motion-reduce:transition-none'
      )}
      data-settings-search-label={title}
      tabIndex={-1}
    >
      <div className="grid gap-4 @3xl/settings-detail:grid-cols-[minmax(0,240px)_minmax(0,1fr)] @3xl/settings-detail:items-start @3xl/settings-detail:gap-8">
        <div className="min-w-0">
          <h3 className={cn(navetTypographyTokens.control, styles.textColor)}>{title}</h3>
          <p className={cn('mt-1 text-sm leading-5', styles.subtleColor)}>{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
