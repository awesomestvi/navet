import { Button, Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks';
import { getMarketingWebsitePath } from '@/app/marketing/constants/marketingLinks';
import { MarketingSectionShell } from '@/app/marketing/shell/MarketingSectionShell';

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
      className={`overflow-hidden rounded-[28px] border ${surface.border} ${surface.panel} ${surface.cardShadow}`}
    >
      <div className={`space-y-4 p-4 ${surface.textPrimary}`}>
        <div className="flex items-center justify-between">
          <Text className={surface.textPrimary}>{label}</Text>
          <div className="flex gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${surface.iconBg}`} />
            <span className={`h-2.5 w-2.5 rounded-full ${surface.subtleBg}`} />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
          </div>
        </div>
        <div className="grid gap-3">
          <div className={`rounded-[22px] border ${surface.border} ${surface.panelMuted} p-3`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className={`h-2.5 w-16 rounded-full ${surface.iconBg}`} />
                <div className={`h-2 w-24 rounded-full ${surface.subtleBg}`} />
              </div>
              <div className="h-8 w-8 rounded-2xl bg-[#f97316]/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-[22px] border ${surface.border} ${surface.panelMuted} p-3`}>
              <div className={`h-2.5 w-12 rounded-full ${surface.iconBg}`} />
              <div className="mt-4 h-14 rounded-[18px] bg-[#f97316]/18" />
            </div>
            <div className={`rounded-[22px] border ${surface.border} ${surface.panelMuted} p-3`}>
              <div className={`h-2.5 w-12 rounded-full ${surface.iconBg}`} />
              <div className={`mt-4 h-14 rounded-[18px] ${surface.subtleBg}`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarketingThemeShowcaseSection() {
  return (
    <MarketingSectionShell
      eyebrow="Themes"
      title="A serious visual system, not a single dashboard skin"
      description="Navet ships with distinct theme modes for bright rooms, dark rooms, OLED walls, and premium glass-style panels. The previews below use the actual Navet theme surfaces."
    >
      <div className="grid gap-4 lg:grid-cols-4">
        {THEME_PREVIEWS.map((themePreview) => (
          <ThemePreviewCard
            key={themePreview.theme}
            theme={themePreview.theme}
            label={themePreview.label}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            window.location.assign(getMarketingWebsitePath('/install/'));
          }}
        >
          Choose a setup path
        </Button>
      </div>
    </MarketingSectionShell>
  );
}
