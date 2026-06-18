import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { Section } from '@navet/app/navigation/sections';
import { darkenColor } from '@navet/app/utils/color-utils';
import { openCustomExtensionUrl } from '@navet/app/utils/custom-extensions';
import { memo } from 'react';
import type { HomeStatusSummaryItem } from './home-status-summary-model';

interface SummaryBarProps {
  items: HomeStatusSummaryItem[];
  onNavigate: (section: Section) => void;
  className?: string;
  ariaLabel?: string;
}

export const SummaryBar = memo(function SummaryBar({
  items,
  onNavigate,
  className = '',
  ariaLabel = 'Status summary',
}: SummaryBarProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className={`min-w-0 ${className}`} aria-label={ariaLabel}>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 md:pb-0">
        {items.map((item) => {
          const IconComponent = item.icon;
          const iconColor = theme === 'light' ? darkenColor(item.iconColor, 68) : item.iconColor;
          const isInteractive = Boolean(item.targetSection || item.targetUrl);
          const chipClassName =
            theme === 'light'
              ? 'border-slate-200/70 bg-white/55 text-slate-900 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.28)] hover:bg-white/75'
              : theme === 'black'
                ? 'border-white/10 bg-white/[0.035] text-white/88 hover:bg-white/[0.065]'
                : 'border-white/10 bg-white/[0.055] text-white/88 backdrop-blur-xl hover:bg-white/[0.085]';
          const content = (
            <>
              <span
                data-testid={`info-badge-strip-icon-${item.id}`}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current/10 bg-current/[0.08] transition-transform group-hover:scale-[1.03] md:h-6 md:w-6"
                style={{ color: iconColor }}
                aria-hidden="true"
              >
                <IconComponent className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block max-w-[8rem] truncate text-[10px] font-semibold leading-3 tracking-normal md:max-w-[10rem] md:text-[11px] md:leading-3.5">
                  {item.title}
                </span>
                <span
                  className={`block truncate text-[10px] leading-3 md:text-[11px] md:leading-3.5 ${surface.textMuted}`}
                >
                  {item.value}
                </span>
              </span>
            </>
          );

          if (!isInteractive) {
            return (
              <div
                key={item.id}
                className={`group inline-grid min-h-8 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-full border px-1.5 py-1 pr-2 text-left md:min-h-9 md:gap-1.5 md:px-2 md:py-1.5 md:pr-3 ${chipClassName}`}
              >
                {content}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.targetUrl) {
                  openCustomExtensionUrl(item.targetUrl);
                  return;
                }

                if (item.targetSection) {
                  onNavigate(item.targetSection);
                }
              }}
              className={`group inline-grid min-h-8 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-full border px-1.5 py-1 pr-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/25 md:min-h-9 md:gap-1.5 md:px-2 md:py-1.5 md:pr-3 ${chipClassName}`}
              aria-label={t('dashboard.summary.openSection', { name: item.title })}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
});

export const InfoBadgeStrip = SummaryBar;
