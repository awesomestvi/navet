import type { Meta, StoryObj } from '@storybook/react';
import { getAccentCardShellTokens } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light'];
const ACCENTS = ['yellow', 'green', 'teal', 'blue', 'purple', 'amber', 'emerald'] as const;

function AccentCardShellTokensShowcase() {
  return (
    <div className="space-y-6">
      {THEMES.map((theme) => (
        <section key={theme} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
            {theme}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ACCENTS.map((accent) => {
              const shell = getAccentCardShellTokens(theme, accent);

              return (
                <article
                  key={`${theme}-${accent}`}
                  className={`relative overflow-hidden rounded-2xl border p-3 ${shell.containerClassName}`}
                >
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 ${shell.glowClassName}`}
                  />
                  {shell.overlayClassName ? (
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${shell.overlayClassName}`}
                    />
                  ) : null}
                  <div className="relative z-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                      {accent}
                    </p>
                    <p className="mt-1 text-xs text-white/70">
                      container, glow, overlay token tuple
                    </p>
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
  title: 'Foundation/Tokens/Accent Card Shell',
  component: AccentCardShellTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Preview matrix for `getAccentCardShellTokens(theme, accent)`, showing card shell container gradients plus glow and optional overlay layers by accent family.',
      },
    },
  },
} satisfies Meta<typeof AccentCardShellTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Matrix: Story = {};
