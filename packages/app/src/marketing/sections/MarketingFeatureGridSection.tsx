import { Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { MARKETING_FEATURES } from '@navet/app/marketing/data/marketingContent';
import { MarketingSectionShell } from '@navet/app/marketing/shell/MarketingSectionShell';
import { MagicCard } from '@website/components/magicui/magic-card';

const FEATURE_CARD_STYLES = [
  {
    spotlight: 'rgba(73, 220, 177, 0.14)',
    border: 'rgba(73, 220, 177, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(73,220,177,0.16),rgba(10,18,24,0.92))] border-emerald-300/16 text-emerald-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(73,220,177,0.16),rgba(73,220,177,0.02)_38%,transparent)]',
  },
  {
    spotlight: 'rgba(255, 177, 79, 0.15)',
    border: 'rgba(255, 177, 79, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(255,177,79,0.16),rgba(24,16,10,0.92))] border-orange-300/16 text-orange-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(255,177,79,0.16),rgba(255,177,79,0.02)_38%,transparent)]',
  },
  {
    spotlight: 'rgba(74, 168, 255, 0.14)',
    border: 'rgba(74, 168, 255, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(74,168,255,0.16),rgba(10,18,30,0.92))] border-sky-300/16 text-sky-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(74,168,255,0.16),rgba(74,168,255,0.02)_38%,transparent)]',
  },
  {
    spotlight: 'rgba(167, 139, 250, 0.14)',
    border: 'rgba(167, 139, 250, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(167,139,250,0.16),rgba(17,14,31,0.92))] border-violet-300/16 text-violet-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(167,139,250,0.16),rgba(167,139,250,0.02)_38%,transparent)]',
  },
  {
    spotlight: 'rgba(244, 114, 182, 0.14)',
    border: 'rgba(244, 114, 182, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(244,114,182,0.16),rgba(26,14,22,0.92))] border-pink-300/16 text-pink-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(244,114,182,0.16),rgba(244,114,182,0.02)_38%,transparent)]',
  },
  {
    spotlight: 'rgba(253, 224, 71, 0.14)',
    border: 'rgba(253, 224, 71, 0.14)',
    iconSurface:
      'bg-[linear-gradient(180deg,rgba(253,224,71,0.16),rgba(28,20,8,0.92))] border-amber-200/16 text-amber-100',
    topTint:
      'bg-[linear-gradient(180deg,rgba(253,224,71,0.16),rgba(253,224,71,0.02)_38%,transparent)]',
  },
] as const;

export function MarketingFeatureGridSection() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const numberTone =
    theme === 'light' ? 'text-slate-400/80' : theme === 'glass' ? 'text-white/34' : 'text-white/28';

  return (
    <MarketingSectionShell
      eyebrow="Why Navet"
      title="Built for everyday household control"
      description="Smart-home backends are powerful, but the daily dashboard experience is often rough. Navet focuses on a cleaner product layer above provider integrations, with shared UI designed for everyday use."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MARKETING_FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          const style = FEATURE_CARD_STYLES[index % FEATURE_CARD_STYLES.length];

          return (
            <MagicCard
              key={feature.title}
              spotlightColor={style.spotlight}
              borderGlowColor={style.border}
              className={cn(
                'min-h-[172px] border-white/8 bg-[linear-gradient(180deg,rgba(18,18,22,0.94),rgba(9,11,16,0.98))] shadow-[0_18px_42px_-34px_rgba(0,0,0,0.72)]',
                theme === 'light'
                  ? `${surface.panel} ${surface.border} shadow-[0_18px_42px_-34px_rgba(15,23,42,0.16)]`
                  : theme === 'glass'
                    ? `${surface.panel} ${surface.border} ${surface.cardShadow}`
                    : null
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-24 opacity-90',
                  style.topTint
                )}
              />
              <div className="relative z-[1] flex h-full flex-col gap-5 p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
                      style.iconSurface
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-medium uppercase tracking-[0.18em]',
                      numberTone
                    )}
                  >
                    0{index + 1}
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Text className="text-lg font-semibold tracking-[-0.02em] text-white">
                    {feature.title}
                  </Text>
                  <Text
                    className={cn(
                      'max-w-[30ch] text-[15px] leading-7',
                      theme === 'light' ? 'text-slate-600' : 'text-white/68'
                    )}
                  >
                    {feature.description}
                  </Text>
                </div>
              </div>
            </MagicCard>
          );
        })}
      </div>
    </MarketingSectionShell>
  );
}
