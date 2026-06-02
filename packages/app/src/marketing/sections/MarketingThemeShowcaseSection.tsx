import { Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';

const THEME_PREVIEWS: Array<{ theme: ThemeType; label: string }> = [
  { theme: 'light', label: 'Light' },
  { theme: 'dark', label: 'Dark' },
  { theme: 'black', label: 'Black' },
  { theme: 'glass', label: 'Liquid Glass' },
];

function ThemePreviewCard({ theme, label }: { theme: ThemeType; label: string }) {
  const surface = getThemeSurfaceTokens(theme, 'medium');

  return (
    <div
      className={`overflow-hidden rounded-[22px] border ${surface.border} ${surface.panel} ${surface.cardShadow} sm:rounded-[28px]`}
    >
      <div className={`space-y-3 p-3 ${surface.textPrimary} sm:space-y-4 sm:p-4`}>
        <div className="flex items-center justify-between">
          <Text className={`text-sm ${surface.textPrimary} sm:text-base`}>{label}</Text>
          <div className="flex gap-1.5 sm:gap-2">
            <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${surface.iconBg}`} />
            <span className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${surface.subtleBg}`} />
            <span className="h-2 w-2 rounded-full bg-[#f97316] sm:h-2.5 sm:w-2.5" />
          </div>
        </div>
        <div className="grid gap-2.5 sm:gap-3">
          <div
            className={`rounded-[18px] border ${surface.border} ${surface.panelMuted} p-2.5 sm:rounded-[22px] sm:p-3`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className={`h-2 w-12 rounded-full sm:h-2.5 sm:w-16 ${surface.iconBg}`} />
                <div className={`h-1.5 w-18 rounded-full sm:h-2 sm:w-24 ${surface.subtleBg}`} />
              </div>
              <div className="h-7 w-7 rounded-xl bg-[#f97316]/20 sm:h-8 sm:w-8 sm:rounded-2xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <div
              className={`rounded-[18px] border ${surface.border} ${surface.panelMuted} p-2.5 sm:rounded-[22px] sm:p-3`}
            >
              <div className={`h-2 w-10 rounded-full sm:h-2.5 sm:w-12 ${surface.iconBg}`} />
              <div className="mt-3 h-11 rounded-[14px] bg-[#f97316]/18 sm:mt-4 sm:h-14 sm:rounded-[18px]" />
            </div>
            <div
              className={`rounded-[18px] border ${surface.border} ${surface.panelMuted} p-2.5 sm:rounded-[22px] sm:p-3`}
            >
              <div className={`h-2 w-10 rounded-full sm:h-2.5 sm:w-12 ${surface.iconBg}`} />
              <div
                className={`mt-3 h-11 rounded-[14px] ${surface.subtleBg} sm:mt-4 sm:h-14 sm:rounded-[18px]`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingThemeShowcaseSection({ className }: { className?: string }) {
  return (
    <MarketingSectionShell
      title="From wall panel to phone, the same home stays familiar."
      description="Navet ships with light, dark, black, and liquid-glass surfaces so the same dashboard still feels intentional in bright rooms, dark rooms, OLED walls, and handheld screens."
      variant="editorial"
      compactMobile
      className={className}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {THEME_PREVIEWS.map((themePreview) => (
          <ThemePreviewCard
            key={themePreview.theme}
            theme={themePreview.theme}
            label={themePreview.label}
          />
        ))}
      </div>
    </MarketingSectionShell>
  );
}
