import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'contrast'];
const EFFECTS = ['high', 'medium', 'low'] as const;

function ThemeSurfaceTokensShowcase() {
  return (
    <div className="space-y-6">
      {THEMES.map((theme) => (
        <section key={theme} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
            {theme}
          </h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {EFFECTS.map((effectsQuality) => {
              const surface = getThemeSurfaceTokens(theme, effectsQuality);

              return (
                <article
                  key={`${theme}-${effectsQuality}`}
                  className={`rounded-2xl border p-4 backdrop-blur-xl ${surface.panel} ${surface.border} ${surface.cardShadow}`}
                >
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
                  >
                    effects: {effectsQuality}
                  </p>
                  <h4 className={`mt-2 text-sm font-semibold ${surface.textPrimary}`}>
                    Surface token preview
                  </h4>
                  <p className={`mt-1 text-xs ${surface.textSecondary}`}>
                    Text, border, hover, and subtle background classes driven by shared token
                    decisions.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div
                      className={`rounded-xl border px-2.5 py-2 text-[11px] ${surface.border} ${surface.subtleBg} ${surface.textSubtle}`}
                    >
                      subtleBg
                    </div>
                    <button
                      type="button"
                      className={`rounded-xl border px-2.5 py-2 text-[11px] transition-colors ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
                    >
                      hoverBg
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: 'Tokens/Theme Surface Tokens',
  component: ThemeSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Visual matrix for `getThemeSurfaceTokens(theme, effectsQuality)`. Use this page to compare how shared surface tokens map to text, border, panel, and hover classes across all four themes and effects-quality modes.',
      },
    },
  },
} satisfies Meta<typeof ThemeSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {};
