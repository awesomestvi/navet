import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];
const EFFECTS = ['high', 'medium', 'low'] as const;

function ThemeSurfaceTokensShowcase() {
  return (
    <div className="space-y-6">
      {THEMES.map((theme) => (
        <section key={theme} className="space-y-3">
          <h3
            className={`text-xs font-semibold uppercase tracking-[0.24em] ${getThemeSurfaceTokens(theme).textMuted}`}
          >
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

                  <div className="mt-3 space-y-3">
                    <div
                      className={`rounded-xl border p-3 ${surface.border} ${surface.panelMuted}`}
                    >
                      <p
                        className={`text-[11px] font-medium uppercase tracking-[0.16em] ${surface.textMuted}`}
                      >
                        Card surface
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${surface.textPrimary}`}>
                        Shared shell copy
                      </p>
                      <p className={`mt-1 text-xs ${surface.textSecondary}`}>
                        Surface tokens should keep copy legible and chrome consistent across themes.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
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

                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`rounded-xl border px-2.5 py-2 text-[11px] ${surface.border} ${surface.inputBg} ${surface.textSecondary} ${surface.placeholder}`}
                      >
                        inputBg
                      </div>
                      <div
                        className={`rounded-xl border px-2.5 py-2 text-[11px] ${surface.border} ${surface.iconBg} ${surface.textPrimary}`}
                      >
                        iconBg
                      </div>
                    </div>
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
  title: 'Theme/Surface Tokens',
  component: ThemeSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Visual matrix for `getThemeSurfaceTokens(theme, effectsQuality)` across all themes and effects-quality levels.',
          '',
          'What this page covers:',
          '- Shared panel/text/border token mapping under `high`, `medium`, and `low` effects quality.',
          '- Input and icon-well treatments in the same token set as shell chrome and hover states.',
          '',
          'Usage notes:',
          '- Reach for these tokens when authoring shared primitives and patterns.',
          '- Avoid local theme forks when an existing surface token already expresses the intended state.',
          '',
          'Review expectations:',
          '- Verify text contrast and panel readability across all theme/effects combinations.',
          '- Verify low-effects mode still feels coherent rather than visually degraded.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ThemeSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
