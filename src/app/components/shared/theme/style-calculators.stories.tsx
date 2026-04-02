import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  getRoundControlStyles,
  resolvePrimaryColorToken,
  resolvePrimaryColorValue,
  sanitizeCustomPrimaryColor,
} from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

function TokenStyleCalculatorsShowcase() {
  const customAccent = '#7c3aed';
  const resolvedCustom = resolvePrimaryColorValue('custom', customAccent);
  const nearestPreset = resolvePrimaryColorToken('custom', customAccent);
  const sanitized = sanitizeCustomPrimaryColor('7C3AED');

  const defaultSurface = getThemeSurfaceTokens('dark');

  return (
    <div className="space-y-6">
      <section
        className={`rounded-2xl border p-4 backdrop-blur-xl ${defaultSurface.border} ${defaultSurface.panelMuted}`}
      >
        <h3 className={`text-sm font-semibold ${defaultSurface.textPrimary}`}>
          Color token helpers
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className={`rounded-xl border p-3 ${defaultSurface.border} ${defaultSurface.panel}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${defaultSurface.textMuted}`}>
              Resolved value
            </p>
            <code className={`mt-2 block text-sm ${defaultSurface.textPrimary}`}>
              {resolvedCustom}
            </code>
          </div>
          <div className={`rounded-xl border p-3 ${defaultSurface.border} ${defaultSurface.panel}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${defaultSurface.textMuted}`}>
              Nearest preset
            </p>
            <code className={`mt-2 block text-sm ${defaultSurface.textPrimary}`}>
              {nearestPreset}
            </code>
          </div>
          <div className={`rounded-xl border p-3 ${defaultSurface.border} ${defaultSurface.panel}`}>
            <p className={`text-[11px] uppercase tracking-[0.16em] ${defaultSurface.textMuted}`}>
              Sanitized input
            </p>
            <code className={`mt-2 block text-sm ${defaultSurface.textPrimary}`}>
              {String(sanitized)}
            </code>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {THEMES.map((theme) => {
          const round = getRoundControlStyles(theme);
          const frameClassName =
            theme === 'light'
              ? 'border-gray-200/80 bg-white/95'
              : theme === 'black'
                ? 'border-white/16 bg-black'
                : theme === 'glass'
                  ? 'border-white/16 bg-white/[0.06]'
                  : 'border-white/10 bg-white/[0.045]';

          return (
            <section
              key={theme}
              className={`rounded-2xl border p-4 backdrop-blur-xl ${frameClassName}`}
            >
              <h3
                className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                  getThemeSurfaceTokens(theme).textPrimary
                }`}
              >
                {theme}
              </h3>

              <div className="mt-3 flex items-center gap-2.5">
                <button
                  type="button"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${round.defaultButton}`}
                >
                  <Pause className={`h-4 w-4 ${round.defaultIcon}`} />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${round.softButton}`}
                >
                  <Play className={`h-4 w-4 ${round.softIcon}`} />
                </button>
                <button
                  type="button"
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${round.emphasisButton}`}
                >
                  <Play className={`h-4 w-4 ${round.emphasisIcon}`} />
                </button>
              </div>

              <p className={`mt-3 text-xs ${getThemeSurfaceTokens(theme).textSecondary}`}>
                `default`, `soft`, and `emphasis` should be derived through the calculator instead
                of reassembled ad hoc in stories or feature code.
              </p>
            </section>
          );
        })}
      </div>
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
          'What this page covers:',
          '- Primary-color normalization helpers (`resolvePrimaryColorValue`, `resolvePrimaryColorToken`, `sanitizeCustomPrimaryColor`).',
          '- Round-control style calculators for default/soft/emphasis button states.',
          '',
          'Usage notes:',
          '- Use calculator output as the canonical source for state-specific chrome, not handcrafted variants in features.',
          '- Keep conversion/normalization logic centralized so accent behavior stays predictable app-wide.',
          '',
          'Review expectations:',
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
