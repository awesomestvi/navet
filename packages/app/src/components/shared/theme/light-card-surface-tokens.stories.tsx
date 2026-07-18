import { BaseCard } from '@navet/app/components/primitives/base-card';
import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getLightCardSurfaceTokens } from '@navet/app/components/shared/theme/light-card-surface-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { LightCardHeader } from '@navet/app/features/lighting/components/light-card/light-card-header';
import { type PrimaryColor, type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { generateThemeColors } from '@navet/app/hooks/use-theme-colors';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb } from 'lucide-react';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

const VARIANTS: Array<{
  key: string;
  label: string;
  detail: string;
  isOn: boolean;
  accent: PrimaryColor;
  selectedColor?: string | null;
  currentColor?: string | null;
  customColor?: string | null;
}> = [
  {
    key: 'accent-blue',
    label: 'Accent fallback',
    detail: 'No device color · blue dashboard accent',
    isOn: true,
    accent: 'blue',
    selectedColor: null,
    currentColor: null,
    customColor: '#FFA500',
  },
  {
    key: 'explicit-teal',
    label: 'Explicit device color',
    detail: 'Teal device color · orange dashboard accent',
    isOn: true,
    accent: 'orange',
    selectedColor: '#14b8a6',
    currentColor: '#14b8a6',
    customColor: '#14b8a6',
  },
  {
    key: 'off',
    label: 'Neutral off state',
    detail: 'Inactive cards return to the shared surface family',
    isOn: false,
    accent: 'blue',
    selectedColor: null,
    currentColor: null,
    customColor: '#FFA500',
  },
];

function getFrameClassName(theme: ThemeType) {
  if (theme === 'light') {
    return 'bg-[linear-gradient(180deg,#f5f7fb,#e7edf6)]';
  }

  if (theme === 'black') {
    return 'bg-neutral-950';
  }

  if (theme === 'glass') {
    return 'bg-[radial-gradient(circle_at_top_left,#1e293b,transparent_45%),linear-gradient(180deg,#020617,#0f172a)]';
  }

  return 'bg-[radial-gradient(circle_at_top_center,rgba(59,130,246,0.08),transparent_42%),linear-gradient(180deg,#1e293b,#0f172a)]';
}

function LightCardSurfaceReference({
  theme,
  variant,
}: {
  theme: ThemeType;
  variant: (typeof VARIANTS)[number];
}) {
  const accentColor = getThemeColorValue(variant.accent);
  const themeColors = generateThemeColors(theme, variant.accent, null);
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);
  const tokens = getLightCardSurfaceTokens({
    isOn: variant.isOn,
    selectedColor: variant.selectedColor ?? null,
    currentColor: variant.currentColor ?? null,
    customColor: variant.customColor ?? '#FFA500',
    theme,
    lightColors: themeColors.light,
    accentColor,
  });
  const baseColor =
    variant.selectedColor ??
    variant.currentColor ??
    (variant.customColor && variant.customColor !== '#FFA500' ? variant.customColor : null) ??
    accentColor;
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: variant.isOn ? 'primary' : 'neutral',
    accentColor,
    baseColor: variant.isOn ? baseColor : undefined,
  });
  const useInverseForeground = theme === 'light' && variant.isOn;
  const titleColor = useInverseForeground ? '#ffffff' : textTokens.titleColor;
  const subtitleColor = useInverseForeground ? 'rgba(255,255,255,0.76)' : textTokens.subtitleColor;

  return (
    <article className="min-w-0">
      <div className="min-h-[4.5rem]">
        <h4 className={`text-sm font-semibold ${surface.textPrimary}`}>{variant.label}</h4>
        <p className={`mt-1 text-xs leading-5 ${surface.textSecondary}`}>{variant.detail}</p>
      </div>

      <div
        className={`relative mt-3 flex min-h-[13.5rem] items-center justify-center overflow-hidden rounded-[28px] p-3 ${getFrameClassName(theme)}`}
      >
        {variant.isOn ? (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute -inset-1/2 blur-3xl ${
              theme === 'light' ? 'opacity-35' : 'opacity-20'
            }`}
            style={{
              background: `radial-gradient(circle, ${tokens.glowColor || baseColor} 0%, transparent 68%)`,
            }}
          />
        ) : null}

        <EntityCardStoryFrame className="relative z-10" size="medium">
          <BaseCard
            size="medium"
            frameClassName={`${cardShell.rootFrameClassName} ${tokens.cardClassName}`}
            style={tokens.cardStyle}
            tone={variant.isOn ? 'primary' : 'neutral'}
            accentColor={tokens.contentAccentColor ?? accentColor}
            readableBackgroundColor={variant.isOn ? baseColor : undefined}
            disableDefaultSheen
            disableDefaultLightOverlay
            overlay={
              <>
                {tokens.activeGlowClassName ? (
                  <div className={tokens.activeGlowClassName} style={tokens.activeGlowStyle} />
                ) : null}
                {tokens.innerOverlayClassName ? (
                  <div className={tokens.innerOverlayClassName} style={tokens.innerOverlayStyle} />
                ) : null}
                {tokens.shineOverlayClassName ? (
                  <div className={tokens.shineOverlayClassName} />
                ) : null}
              </>
            }
          >
            <div className="flex h-full min-h-0 flex-col">
              <LightCardHeader
                name="Living room lamp"
                isOn={variant.isOn}
                IconComponent={Lightbulb}
                size="medium"
                activeColor={tokens.contentAccentColor}
                themeOverride={theme}
              />

              <div className="mt-auto">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p
                      className={`text-2xl font-semibold tracking-tight ${tokens.stateSurface.primaryTextClassName}`}
                      style={{ color: titleColor }}
                    >
                      {variant.isOn ? '64%' : 'Off'}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${tokens.stateSurface.mutedTextClassName}`}
                      style={{ color: subtitleColor }}
                    >
                      {variant.isOn ? 'Brightness' : 'Inactive'}
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-full border border-current"
                    style={{
                      color: variant.isOn ? titleColor : subtitleColor,
                      backgroundColor: variant.isOn
                        ? (tokens.contentAccentColor ?? accentColor)
                        : 'transparent',
                    }}
                  />
                </div>

                <div
                  aria-hidden="true"
                  className="mt-3 h-1.5 overflow-hidden rounded-full"
                  style={{
                    backgroundColor: useInverseForeground ? '#ffffff30' : `${subtitleColor}30`,
                  }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: variant.isOn ? '64%' : '0%',
                      backgroundColor: titleColor,
                    }}
                  />
                </div>
              </div>
            </div>
          </BaseCard>
        </EntityCardStoryFrame>
      </div>
    </article>
  );
}

function LightCardSurfaceTokensShowcase() {
  const { theme: activeTheme } = useTheme();
  const activeSurface = getThemeSurfaceTokens(activeTheme);

  return (
    <div className="space-y-5">
      <header className="max-w-3xl">
        <h2 className={`text-xl font-semibold ${activeSurface.textPrimary}`}>
          Active card surface decisions
        </h2>
        <p className={`mt-2 text-sm leading-6 ${activeSurface.textSecondary}`}>
          Compare the three surface rules that shared active-state cards must preserve: use the
          dashboard accent when a device has no color, respect an explicit device color, and return
          inactive cards to the neutral surface family.
        </p>
      </header>

      {THEMES.map((theme) => {
        const surface = getThemeSurfaceTokens(theme);

        return (
          <section
            key={theme}
            className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}
              >
                {theme} theme
              </p>
              <p className={`text-xs ${surface.textMuted}`}>Three state rules</p>
            </div>

            <div
              className="mt-4 grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              }}
            >
              {VARIANTS.map((variant) => (
                <LightCardSurfaceReference
                  key={`${theme}-${variant.key}`}
                  theme={theme}
                  variant={variant}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const meta = {
  title: 'Theme/Active Card Surfaces',
  component: LightCardSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Focused visual matrix for the active-card surface rules shared by lighting, fan, security, and interaction-preview cards.',
          '',
          'What this page verifies:',
          '- Active cards without a device color fall back to the selected dashboard accent.',
          '- Active cards with an explicit device color keep that real color instead of being overridden by the accent.',
          '- Inactive cards return to the neutral shared surface system.',
          '- Overlay, glow, border, and readable text decisions stay coherent across `glass`, `dark`, `light`, and `black`.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof LightCardSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
