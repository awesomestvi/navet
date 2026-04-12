import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Moon, Settings2, Sparkles, SunMedium } from 'lucide-react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { getBrightnessPresetSelectedStyle } from '@/app/components/shared/device-editor/brightness-preset-styles';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getEntityIconPillStyles } from '@/app/components/shared/theme/entity-icon-pill-styles';
import { getRoundControlStyles } from '@/app/components/shared/theme/round-control-styles';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/system/tokens';
import { getLightCardSurfaceTokens } from '@/app/features/lighting/components/light-card/light-card-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

const ACTIVE_LIGHT_COLORS: Record<
  ThemeType,
  {
    gradient: string;
    border: string;
    iconBg: string;
    glow: string;
  }
> = {
  light: {
    gradient: 'from-orange-200 to-orange-100',
    border: 'border-orange-300',
    iconBg: 'bg-orange-400',
    glow: 'transparent',
  },
  dark: {
    gradient: 'from-orange-900 to-orange-950',
    border: 'border-orange-700',
    iconBg: 'bg-orange-500',
    glow: 'transparent',
  },
  glass: {
    gradient: 'from-white/28 via-orange-200/20 to-white/08',
    border: 'border-white/24',
    iconBg: 'bg-orange-300/22',
    glow: 'from-orange-300/22',
  },
  black: {
    gradient: 'from-black via-black to-orange-950',
    border: 'border-orange-400/85',
    iconBg: 'bg-orange-500/30',
    glow: 'from-orange-400/18',
  },
};

function LightCardReference({ theme, isActive }: { theme: ThemeType; isActive: boolean }) {
  const surface = getThemeSurfaceTokens(theme);
  const shell = getCardShellSurfaceTokens(theme);
  const lightSurface = getLightCardSurfaceTokens({
    isOn: isActive,
    selectedColor: null,
    theme,
    lightColors: ACTIVE_LIGHT_COLORS[theme],
    accentColor: '#f97316',
  });
  const state = getCardStateSurfaceTokens(theme, isActive);
  const iconStyles = getEntityIconPillStyles({
    isActive,
    isInteractive: false,
    primaryColor: 'orange',
    accentColor: '#f97316',
    size: 'medium',
    theme,
    tone: isActive ? 'primary' : 'neutral',
  });
  const frameClassName =
    theme === 'light'
      ? 'bg-[linear-gradient(180deg,#f5f7fb,#e7edf6)]'
      : theme === 'black'
        ? 'bg-neutral-950'
        : theme === 'glass'
          ? 'bg-[radial-gradient(circle_at_top_left,#1e293b,transparent_45%),linear-gradient(180deg,#020617,#0f172a)]'
          : 'bg-[radial-gradient(circle_at_top_center,rgba(249,115,22,0.08),transparent_42%),linear-gradient(180deg,#22131a,#1a1117)]';
  const sliderTrackClassName = theme === 'light' ? 'bg-gray-200' : 'bg-white/10';
  const sliderRangeStyle = {
    backgroundImage: isActive
      ? theme === 'glass'
        ? 'linear-gradient(to right, rgba(255,255,255,0.42), #f97316cc)'
        : theme === 'light'
          ? 'linear-gradient(to right, #fb923c99, #f97316)'
          : 'linear-gradient(to right, #f97316cc, #f97316)'
      : theme === 'light'
        ? 'linear-gradient(to right, #d1d5db, #9ca3af)'
        : 'linear-gradient(to right, rgba(255,255,255,0.24), rgba(255,255,255,0.14))',
  };
  const sliderThumbPercent = isActive ? 64 : 6;
  const sliderThumbStyle = {
    backgroundColor: isActive ? '#f97316' : theme === 'light' ? '#f3f4f6' : '#d1d5db',
    boxShadow: isActive ? '0 0 0 2px rgba(249,115,22,0.4)' : '0 0 0 2px rgba(156,163,175,0.45)',
  } as const;
  const controlSizes = getCardActionControlSizes('medium');
  const roundControl = getRoundControlStyles(theme);
  const selectedControlStyle = getBrightnessPresetSelectedStyle(theme, '#f97316', isActive);
  const readableText = getCardReadableTextTokens({
    theme,
    tone: isActive ? 'primary' : 'neutral',
    accentColor: '#f97316',
  });

  return (
    <article className={`relative h-55 w-90 overflow-visible rounded-[32px] p-3 ${frameClassName}`}>
      {isActive && lightSurface.glowColor && lightSurface.glowColor !== 'transparent' ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-full z-0 blur-3xl ${
            theme === 'light' ? 'opacity-40' : 'opacity-20'
          }`}
          style={{
            background: `radial-gradient(circle, ${lightSurface.glowColor} 0%, transparent 70%)`,
          }}
        />
      ) : null}

      <div
        className={`relative z-10 h-full w-full overflow-hidden rounded-3xl ${
          theme !== 'dark' ? 'border' : ''
        } p-4 transition-all duration-500 ${lightSurface.cardClassName} ${shell.backdropClassName}`}
        style={lightSurface.cardStyle}
      >
        {lightSurface.innerOverlayClassName ? (
          <div
            aria-hidden="true"
            className={lightSurface.innerOverlayClassName}
            style={lightSurface.innerOverlayStyle}
          />
        ) : null}
        {lightSurface.shineOverlayClassName ? (
          <div aria-hidden="true" className={lightSurface.shineOverlayClassName} />
        ) : null}

        <div className="relative flex h-full flex-col">
          <div className="mb-2 flex items-start gap-3">
            <div className="shrink-0">
              <div className={iconStyles.badgeClassName} style={iconStyles.badgeStyle}>
                <Lightbulb className={iconStyles.iconClassName} style={iconStyles.iconStyle} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-[10px] tracking-normal ${surface.textMuted} ${state.mutedTextClassName}`}
                style={{ color: readableText.subtitleColor }}
              >
                Lighting
              </p>
              <h4
                className={`truncate text-xs font-semibold ${state.primaryTextClassName}`}
                style={{ color: readableText.titleColor }}
              >
                Living Room
              </h4>
            </div>
          </div>

          <div className="mt-auto flex flex-1 flex-col justify-end gap-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`text-xs ${state.secondaryTextClassName}`}
                  style={{ color: readableText.subtitleColor }}
                >
                  Brightness
                </span>
                <span
                  className={`text-sm font-bold ${state.primaryTextClassName}`}
                  style={{ color: readableText.titleColor }}
                >
                  {isActive ? '64%' : '0%'}
                </span>
              </div>

              <div className="relative flex h-6 items-center">
                <div
                  className={`absolute left-0 right-0 h-1 rounded-full ${sliderTrackClassName}`}
                />
                <div
                  className="absolute left-0 h-1 rounded-full"
                  style={{ ...sliderRangeStyle, width: isActive ? '64%' : '6%' }}
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center">
                  <div
                    className="relative h-4 w-full shrink-0"
                    style={{ transform: `translate3d(${sliderThumbPercent}%, 0, 0)` }}
                  >
                    <div
                      className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg"
                      style={sliderThumbStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[
                { icon: SunMedium, selected: false },
                { icon: Moon, selected: true },
                { icon: Sparkles, selected: false },
              ].map((item, index) => {
                const PillIcon = item.icon;
                const isSelected = isActive && item.selected;

                return (
                  <div
                    key={`${theme}-${index}`}
                    className={`${controlSizes.button} flex items-center justify-center rounded-full border transition-all duration-300 ${
                      isSelected
                        ? `${roundControl.selectedText}`
                        : isActive
                          ? roundControl.softButton
                          : roundControl.softDisabledButton
                    }`}
                    style={isSelected ? selectedControlStyle : undefined}
                  >
                    <PillIcon className={controlSizes.icon} />
                  </div>
                );
              })}

              <div
                className={`ml-auto ${controlSizes.button} flex items-center justify-center rounded-full ${
                  isActive ? roundControl.softButton : roundControl.softDisabledButton
                }`}
              >
                <Settings2 className={controlSizes.icon} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function CardStateSurfaceTokensShowcase() {
  return (
    <div className="space-y-4">
      {THEMES.map((theme) => {
        const surface = getThemeSurfaceTokens(theme);

        return (
          <section
            key={theme}
            className={`rounded-2xl border p-4 ${surface.border} ${surface.panelMuted}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
              {theme}
            </p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                >
                  Active reference
                </p>
                <LightCardReference theme={theme} isActive />
              </div>
              <div className="space-y-2">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                >
                  Inactive reference
                </p>
                <LightCardReference theme={theme} isActive={false} />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

const meta = {
  title: 'Cards/Theme/Card State Surface',
  component: CardStateSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Reference preview for `getCardStateSurfaceTokens(theme, isActive)` using the actual light-card composition across all themes.',
          '',
          'What this page covers:',
          '- Active and inactive readability behavior in realistic card shells and content density.',
          '- Interaction between state tokens, shell tokens, icon pills, and readable text helpers.',
          '',
          'Usage notes:',
          '- Treat this page as the canonical visual check before adjusting card-state readability logic.',
          '- Prefer updating shared token calculators instead of patching per-feature card state classes.',
          '',
          'Review expectations:',
          '- Active cards should read energetic but still readable.',
          '- Inactive cards should feel clearly subdued while preserving essential legibility.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof CardStateSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
