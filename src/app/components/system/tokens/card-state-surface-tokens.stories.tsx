import type { Meta, StoryObj } from '@storybook/react';
import { getCardStateSurfaceTokens } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'contrast'];

function CardStateSurfaceTokensShowcase() {
  return (
    <div className="space-y-5">
      {THEMES.map((theme) => (
        <section key={theme} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            {theme}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {[true, false].map((isActive) => {
              const state = getCardStateSurfaceTokens(theme, isActive);

              return (
                <article
                  key={`${theme}-${isActive ? 'active' : 'inactive'}`}
                  className={`relative overflow-hidden rounded-2xl border border-white/14 bg-white/6 p-4 ${state.containerClassName}`}
                >
                  {state.overlayClassName ? (
                    <div
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 ${state.overlayClassName}`}
                    />
                  ) : null}
                  <div className="relative z-10">
                    <p className={`text-sm font-semibold ${state.primaryTextClassName}`}>
                      {isActive ? 'Active state' : 'Inactive state'}
                    </p>
                    <p className={`mt-1 text-xs ${state.secondaryTextClassName}`}>
                      secondary text token
                    </p>
                    <p className={`mt-1 text-xs ${state.mutedTextClassName}`}>muted text token</p>
                    <div className={`mt-3 h-10 rounded-lg bg-white/10 ${state.artworkClassName}`} />
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
  title: 'Foundation/Tokens/Card State Surface',
  component: CardStateSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'State-layer token preview for `getCardStateSurfaceTokens(theme, isActive)`, covering active and inactive readability treatment for card surfaces.',
      },
    },
  },
} satisfies Meta<typeof CardStateSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActiveVsInactive: Story = {};
