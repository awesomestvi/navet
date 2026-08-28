import { BaseCard } from '@navet/app/components/primitives/base-card';
import { getThemeSurfaceTokens } from '@navet/app/components/system/tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 344px), max-content))',
            }}
          >
            {EFFECTS.map((effectsQuality) => {
              const surface = getThemeSurfaceTokens(theme, effectsQuality);

              return (
                <EntityCardStoryFrame key={`${theme}-${effectsQuality}`} size="medium">
                  <BaseCard
                    size="medium"
                    title="Surface token preview"
                    subtitle={`${effectsQuality} effects`}
                    themeOverride={theme}
                    contentClassName="flex flex-col justify-end"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className={`text-xs font-semibold ${surface.textPrimary}`}>
                          Primary text
                        </p>
                        <p className={`mt-1 text-[11px] leading-4 ${surface.textSecondary}`}>
                          Supporting text stays readable.
                        </p>
                      </div>

                      <dl className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Subtle', className: surface.subtleBg },
                          { label: 'Input', className: surface.inputBg },
                          { label: 'Icon', className: surface.iconBg },
                        ].map((sample) => (
                          <div key={sample.label} className="min-w-0">
                            <dt className="sr-only">{sample.label} surface token</dt>
                            <dd>
                              <div
                                className={`h-5 rounded-lg border ${surface.border} ${sample.className}`}
                              />
                              <span
                                className={`mt-1 block truncate text-[10px] leading-4 ${surface.textMuted}`}
                              >
                                {sample.label}
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </BaseCard>
                </EntityCardStoryFrame>
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
          'What this story proves:',
          '- Shared panel/text/border token mapping under `high`, `medium`, and `low` effects quality.',
          '- The real BaseCard shell remains readable across every theme and effects level.',
          '- Subtle, input, and icon-well treatments stay aligned with the card surface.',
          '',
          'Use this story when:',
          '- Reach for these tokens when authoring shared primitives and patterns.',
          '- Avoid local theme forks when an existing surface token already expresses the intended state.',
          '',
          'Review before merging:',
          '- Verify text contrast and panel readability across all theme/effects combinations.',
          '- Verify compact dark surfaces stay flat rather than reading as cylindrical.',
          '- Verify glass remains the luminous surface family while dark stays in the flatter inactive-card direction.',
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
