import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/system/tokens';
import { useTheme } from '@/app/hooks';

const TYPE_SCALE: { label: string; className: string; size: string }[] = [
  { label: 'Micro / Labels', className: 'text-[9px]', size: '9px' },
  { label: 'Dense body', className: 'text-[10px]', size: '10px' },
  { label: 'Caption / Subtitle', className: 'text-[11px]', size: '11px' },
  { label: 'XS — Card title (sm), label (lg)', className: 'text-xs', size: '12px' },
  { label: 'SM — Body, subtitle (lg), UI text', className: 'text-sm', size: '14px' },
  { label: 'Base — Card title (lg)', className: 'text-base', size: '16px' },
  { label: 'LG — Section heading', className: 'text-lg', size: '18px' },
  { label: 'XL — Feature heading', className: 'text-xl', size: '20px' },
  { label: '2XL — Page heading', className: 'text-2xl', size: '24px' },
];

const WEIGHTS: { label: string; className: string; numeric: string }[] = [
  { label: 'Regular', className: 'font-normal', numeric: '400' },
  { label: 'Medium', className: 'font-medium', numeric: '500' },
  { label: 'Semibold', className: 'font-semibold', numeric: '600' },
  { label: 'Bold', className: 'font-bold', numeric: '700' },
];

const COMPOSITE_STYLES: { label: string; className: string; sample: string }[] = [
  {
    label: 'Eyebrow / Overline',
    className: 'text-xs font-semibold uppercase tracking-[0.2em]',
    sample: 'Navet UI system',
  },
  {
    label: 'Muted overline',
    className: 'text-[11px] font-semibold uppercase tracking-[0.18em]',
    sample: 'effects: high',
  },
  {
    label: 'Card title (small)',
    className: 'text-xs font-semibold',
    sample: 'Living Room Lights',
  },
  {
    label: 'Card title (large)',
    className: 'text-base font-semibold',
    sample: 'Living Room Lights',
  },
  {
    label: 'Card subtitle / eyebrow',
    className: 'text-[11px] uppercase tracking-[0.16em]',
    sample: '6 entities online',
  },
  {
    label: 'Page heading',
    className: 'text-2xl font-semibold tracking-tight',
    sample: 'Dashboard',
  },
  {
    label: 'Section heading',
    className: 'text-lg font-semibold',
    sample: 'Appearance',
  },
  {
    label: 'Body / description',
    className: 'text-sm leading-6',
    sample: 'Adjust the look and feel of your smart home dashboard.',
  },
  {
    label: 'Annotation / helper text',
    className: 'text-xs',
    sample: 'Last updated 2 minutes ago',
  },
];

function TypographyShowcase() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="space-y-8">
      {/* Type scale */}
      <section
        className={`rounded-2xl border p-5 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
          Type scale
        </p>
        <p className={`mt-1 text-xs ${surface.textSubtle}`}>
          System font stack —{' '}
          <code className={`font-mono ${surface.textSecondary}`}>
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial,
            sans-serif
          </code>
        </p>

        <div className={`mt-4 divide-y ${surface.border}`}>
          {TYPE_SCALE.map(({ label, className, size }) => (
            <div key={size} className="flex items-baseline gap-4 py-3">
              <span
                className={`w-28 shrink-0 font-mono text-[10px] tabular-nums ${surface.textSubtle}`}
              >
                {size}
              </span>
              <span className={`min-w-0 flex-1 font-semibold ${className} ${surface.textPrimary}`}>
                The quick brown fox
              </span>
              <span className={`shrink-0 text-[11px] ${surface.textMuted}`}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Font weights */}
      <section
        className={`rounded-2xl border p-5 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
          Font weights
        </p>

        <div className={`mt-4 divide-y ${surface.border}`}>
          {WEIGHTS.map(({ label, className, numeric }) => (
            <div key={numeric} className="flex items-baseline gap-4 py-3">
              <span
                className={`w-28 shrink-0 font-mono text-[10px] tabular-nums ${surface.textSubtle}`}
              >
                {numeric}
              </span>
              <span className={`min-w-0 flex-1 text-base ${className} ${surface.textPrimary}`}>
                {label}
              </span>
              <span className={`shrink-0 font-mono text-[11px] ${surface.textMuted}`}>
                {className}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Composite styles */}
      <section
        className={`rounded-2xl border p-5 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
          Composite styles
        </p>
        <p className={`mt-1 text-xs ${surface.textSubtle}`}>
          Named type roles used across Navet cards and surfaces.
        </p>

        <div className={`mt-4 divide-y ${surface.border}`}>
          {COMPOSITE_STYLES.map(({ label, className, sample }) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 py-4 md:grid-cols-[200px_1fr_auto]"
            >
              <span className={`text-xs font-medium ${surface.textSecondary}`}>{label}</span>
              <span className={`col-span-2 md:col-span-1 ${className} ${surface.textPrimary}`}>
                {sample}
              </span>
              <span
                className={`col-span-2 break-all font-mono text-[10px] leading-5 md:col-span-1 ${surface.textSubtle}`}
              >
                {className}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Theme/Typography',
  component: TypographyShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Type scale, font weights, and composite typographic roles used across Navet cards and surfaces. Use these classes for consistent text styling rather than introducing one-off sizes or weights.',
      },
    },
  },
} satisfies Meta<typeof TypographyShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Showcase: Story = {};
