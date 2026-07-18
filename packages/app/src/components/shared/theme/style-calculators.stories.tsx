import { BaseCard } from '@navet/app/components/primitives/base-card';
import { RoundControlButton } from '@navet/app/components/primitives/round-control-button';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  resolvePrimaryColorToken,
  resolvePrimaryColorValue,
  sanitizeCustomPrimaryColor,
} from '@navet/app/components/system/tokens';
import { type ThemeType, useTheme } from '@navet/app/hooks/use-theme';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play } from 'lucide-react';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

function HelperValueCard({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ThemeType;
}) {
  return (
    <EntityCardStoryFrame size="small">
      <BaseCard
        size="small"
        title={label}
        subtitle="Color helper"
        themeOverride={theme}
        contentClassName="flex flex-col justify-end"
      >
        <code className="break-all text-sm font-semibold">{value}</code>
      </BaseCard>
    </EntityCardStoryFrame>
  );
}

function TokenStyleCalculatorsShowcase() {
  const { theme: activeTheme } = useTheme();
  const customAccent = '#7c3aed';
  const resolvedCustom = resolvePrimaryColorValue('custom', customAccent);
  const nearestPreset = resolvePrimaryColorToken('custom', customAccent);
  const sanitized = sanitizeCustomPrimaryColor('7C3AED');
  const activeSurface = getThemeSurfaceTokens(activeTheme);

  return (
    <div className="space-y-6">
      <section>
        <h3 className={`text-sm font-semibold ${activeSurface.textPrimary}`}>
          Color token helpers
        </h3>
        <p className={`mt-1 max-w-2xl text-xs leading-5 ${activeSurface.textSecondary}`}>
          Each result is shown inside the same card shell that consumes these color decisions in
          Navet.
        </p>
        <div
          className="mt-4 grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(168px, max-content))',
          }}
        >
          <HelperValueCard label="Resolved value" value={resolvedCustom} theme={activeTheme} />
          <HelperValueCard label="Nearest preset" value={nearestPreset} theme={activeTheme} />
          <HelperValueCard label="Sanitized input" value={String(sanitized)} theme={activeTheme} />
        </div>
      </section>

      <section>
        <h3 className={`text-sm font-semibold ${activeSurface.textPrimary}`}>
          Round control styles
        </h3>
        <p className={`mt-1 max-w-2xl text-xs leading-5 ${activeSurface.textSecondary}`}>
          The real round-control primitive consumes the calculator for its neutral, soft, and
          emphasis states.
        </p>

        <div
          className="mt-4 grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 344px), max-content))',
          }}
        >
          {THEMES.map((theme) => {
            return (
              <EntityCardStoryFrame key={theme} size="medium">
                <BaseCard
                  size="medium"
                  title={`${theme} controls`}
                  subtitle="Style calculator"
                  themeOverride={theme}
                  contentClassName="flex flex-col justify-end"
                >
                  <div className="flex items-center gap-2.5">
                    <RoundControlButton theme={theme} size="small" aria-label="Neutral state">
                      <Pause className="h-4 w-4" />
                    </RoundControlButton>
                    <RoundControlButton
                      theme={theme}
                      size="small"
                      variant="soft"
                      aria-label="Soft state"
                    >
                      <Play className="h-4 w-4" />
                    </RoundControlButton>
                    <RoundControlButton
                      theme={theme}
                      size="small"
                      variant="emphasis"
                      aria-label="Emphasis state"
                    >
                      <Play className="h-4 w-4" />
                    </RoundControlButton>
                  </div>
                </BaseCard>
              </EntityCardStoryFrame>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Theme/Style Calculators',
  component: TokenStyleCalculatorsShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Showcase for helper functions that compute styles/values rather than rendering standalone UI.',
          '',
          'What this story proves:',
          '- Primary-color normalization helpers (`resolvePrimaryColorValue`, `resolvePrimaryColorToken`, `sanitizeCustomPrimaryColor`).',
          '- Round-control style calculators for default/soft/emphasis button states.',
          '',
          'Use this story when:',
          '- Use calculator output as the canonical source for state-specific chrome, not handcrafted variants in features.',
          '- Keep conversion/normalization logic centralized so accent behavior stays predictable app-wide.',
          '',
          'Review before merging:',
          '- Verify equivalent calculator states remain visually aligned across themes.',
          '- Verify custom color input is normalized consistently and maps to expected fallback behavior.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof TokenStyleCalculatorsShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
