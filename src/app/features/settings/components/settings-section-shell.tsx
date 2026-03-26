import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { DashboardHeroSection } from '@/app/features/dashboard';
import { useI18n } from '@/app/hooks';
import type { SettingsSectionStyles } from '../hooks/settings-section-styles';
import type { SectionNavItem } from '../hooks/use-settings-section-controller';

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

interface SettingsHeroProps {
  navItems: SectionNavItem[];
  styles: SettingsSectionStyles;
}

export function SettingsSectionShell({
  id,
  icon: Icon,
  title,
  description,
  styles,
  children,
}: SettingsSectionShellProps) {
  return (
    <section
      id={id}
      className={`rounded-[28px] border ${styles.borderColor} ${styles.cardBg} md:rounded-4xl`}
    >
      <div className="px-4 py-5 md:px-8 md:py-8">
        <div className="flex items-start gap-3 md:gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${styles.borderColor} ${styles.iconBg} md:h-11 md:w-11`}
          >
            <Icon className={`h-4.5 w-4.5 ${styles.mutedColor} md:h-5 md:w-5`} />
          </div>
          <div className="min-w-0">
            <h2 className={`text-lg font-semibold tracking-tight md:text-xl ${styles.textColor}`}>
              {title}
            </h2>
            <p
              className={`mt-1 max-w-2xl text-sm leading-6 md:leading-relaxed ${styles.subtleColor}`}
            >
              {description}
            </p>
          </div>
        </div>

        <div className={`mt-5 divide-y md:mt-8 ${styles.dividerColor}`}>{children}</div>
      </div>
    </section>
  );
}

export function SettingsItem({ title, description, styles, children }: SettingsItemProps) {
  return (
    <div className="py-4 md:py-6">
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-8">
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

export function SettingsHero({ navItems, styles }: SettingsHeroProps) {
  const { t } = useI18n();
  const surface = {
    ...getThemeSurfaceTokens(styles.isLightTheme ? 'light' : 'glass'),
    border: styles.borderColor,
    panel: styles.cardBg,
    cardShadow: styles.elevatedShadow,
    textPrimary: styles.textColor,
    textSecondary: styles.subtleColor,
    textMuted: styles.subtleColor,
  };

  return (
    <DashboardHeroSection
      accentColor={styles.accentColor}
      surface={surface}
      eyebrow={
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${styles.subtleColor}`}
        >
          {t('settings.hero.eyebrow')}
        </p>
      }
      title={t('settings.hero.title')}
      description={t('settings.hero.description')}
      actions={
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          {navItems.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors md:px-4 ${styles.borderColor} ${styles.chipBg} ${styles.chipHoverBg} ${styles.mutedColor}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </a>
          ))}
        </div>
      }
    />
  );
}
