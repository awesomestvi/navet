import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb } from 'lucide-react';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getLightCardSurfaceTokens } from '@/app/components/shared/theme/light-card-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';
import { generateThemeColors } from '@/app/hooks/use-theme-colors';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

const VARIANTS: Array<{
  key: string;
  label: string;
  isOn: boolean;
  accent: PrimaryColor;
  selectedColor?: string | null;
  currentColor?: string | null;
  customColor?: string | null;
}> = [
  {
    key: 'accent-blue',
    label: 'No explicit color, blue accent',
    isOn: true,
    accent: 'blue',
    selectedColor: null,
    currentColor: null,
    customColor: '#FFA500',
  },
  {
    key: 'accent-purple',
    label: 'No explicit color, purple accent',
    isOn: true,
    accent: 'purple',
    selectedColor: null,
    currentColor: null,
    customColor: '#FFA500',
  },
  {
    key: 'explicit-red',
    label: 'Explicit red light, blue accent',
    isOn: true,
    accent: 'blue',
    selectedColor: '#ef4444',
    currentColor: '#ef4444',
    customColor: '#ef4444',
  },
  {
    key: 'explicit-teal',
    label: 'Explicit teal light, orange accent',
    isOn: true,
    accent: 'orange',
    selectedColor: '#14b8a6',
    currentColor: '#14b8a6',
    customColor: '#14b8a6',
  },
  {
    key: 'off',
    label: 'Off state',
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

  return (
    <article
      className={`relative h-56 w-92 overflow-visible rounded-[32px] p-3 ${getFrameClassName(theme)}`}
    >
      {variant.isOn ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-full z-0 blur-3xl ${
            theme === 'light' ? 'opacity-40' : 'opacity-20'
          }`}
          style={{
            background: `radial-gradient(circle, ${tokens.glowColor || baseColor} 0%, transparent 70%)`,
          }}
        />
      ) : null}

      <div
        className={`relative z-10 h-full overflow-hidden rounded-3xl ${cardShell.rootFrameClassName} ${tokens.cardClassName}`}
        style={tokens.cardStyle}
      >
        {tokens.activeGlowClassName ? (
          <div className={tokens.activeGlowClassName} style={tokens.activeGlowStyle} />
        ) : null}
        {tokens.innerOverlayClassName ? (
          <div className={tokens.innerOverlayClassName} style={tokens.innerOverlayStyle} />
        ) : null}
        {tokens.shineOverlayClassName ? <div className={tokens.shineOverlayClassName} /> : null}

        <div className="relative flex h-full flex-col p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${surface.border} ${surface.subtleBg}`}
              style={
                variant.isOn
                  ? { borderColor: `${baseColor}50`, backgroundColor: `${baseColor}18` }
                  : undefined
              }
            >
              <Lightbulb
                className="h-5 w-5"
                style={{ color: variant.isOn ? textTokens.titleColor : undefined }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className={`text-[11px] ${tokens.stateSurface.mutedTextClassName}`}>
                Light surface tokens
              </p>
              <h4
                className={`mt-1 text-sm font-semibold ${tokens.stateSurface.primaryTextClassName}`}
                style={{ color: textTokens.titleColor }}
              >
                {variant.label}
              </h4>
              <p
                className={`mt-1 text-xs ${tokens.stateSurface.secondaryTextClassName}`}
                style={{ color: textTokens.subtitleColor }}
              >
                {variant.isOn
                  ? `Base color: ${baseColor}`
                  : 'Off cards stay on neutral shared surfaces.'}
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div
              className={`rounded-2xl border px-3 py-2.5 ${surface.border} ${surface.panelMuted}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs ${tokens.stateSurface.mutedTextClassName}`}>
                  Surface source
                </span>
                <span
                  className={`text-xs font-semibold ${tokens.stateSurface.primaryTextClassName}`}
                  style={{ color: textTokens.titleColor }}
                >
                  {variant.selectedColor ||
                  variant.currentColor ||
                  (variant.customColor && variant.customColor !== '#FFA500')
                    ? 'Explicit light color'
                    : 'Dashboard accent'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div
                className={`h-9 flex-1 rounded-full border ${surface.border} ${surface.subtleBg}`}
              />
              <div
                className={`h-9 w-9 rounded-full border ${surface.border} ${surface.subtleBg}`}
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function LightCardSurfaceTokensShowcase() {
  return (
    <div className="space-y-4">
      {THEMES.map((theme) => {
        const surface = getThemeSurfaceTokens(theme);

        return (
          <section
            key={theme}
            className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
              {theme}
            </p>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
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
  title: 'Theme/Light Card Surface Tokens',
  component: LightCardSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Visual matrix for `getLightCardSurfaceTokens(...)` across all themes.',
          '',
          'What this page verifies:',
          '- Active light cards without a real light color fall back to the selected dashboard accent.',
          '- Active light cards with an explicit light color stay on that real color instead of being overridden by the accent.',
          '- Off light cards stay on the neutral shared surface system.',
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
