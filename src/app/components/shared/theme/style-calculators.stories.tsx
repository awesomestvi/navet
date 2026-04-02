import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/12 bg-white/6 p-4 backdrop-blur-xl">
        <h3 className="text-sm font-semibold text-white">Color token helpers</h3>
        <p className="mt-1 text-xs text-white/70">
          custom {customAccent} value {resolvedCustom} - nearest preset {nearestPreset} - sanitized{' '}
          {String(sanitized)}
        </p>
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
                  theme === 'light' ? 'text-slate-900' : 'text-white'
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
        component:
          'Showcase for token helper functions that return computed styles or normalized values rather than standalone components. Includes `getRoundControlStyles` and primary-color normalization helpers so low-level theme behavior can be verified without feature-level UI wrappers.',
      },
    },
  },
} satisfies Meta<typeof TokenStyleCalculatorsShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Showcase: Story = {};
