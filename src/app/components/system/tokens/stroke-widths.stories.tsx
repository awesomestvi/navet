import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { navetFocusTokens, navetRadiusTokens, navetTypographyTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

const navetStrokeWidthTokens = {
  border: {
    subtle: 'border',
    strong: 'border-2',
  },
  focus: {
    ringClass: navetFocusTokens.base,
  },
};

function StrokeWidthsStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const focusRingPreviewClassName =
    theme === 'light'
      ? 'ring-2 ring-gray-400 ring-offset-2 ring-offset-white'
      : 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent';

  return (
    <ThemeTokenShowcase
      intro="Stroke width decisions for borders and focus rings. Keep controls on this scale so visual density remains consistent across cards and dialogs."
      tokens={navetStrokeWidthTokens}
      previewTitle="Reference usage"
      preview={
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>Subtle border</p>
            <div
              className={`mt-3 ${navetRadiusTokens.action} border p-4 ${surface.border} ${surface.panel}`}
            >
              <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                Default surface
              </p>
            </div>
          </div>

          <div className={`rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>Strong border</p>
            <div
              className={`mt-3 ${navetRadiusTokens.action} border-2 p-4 ${surface.borderStrong} ${surface.panel}`}
            >
              <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                Selected shell
              </p>
            </div>
          </div>

          <div
            className={`rounded-[24px] border p-4 text-left ${surface.border} ${surface.panelMuted} ${focusRingPreviewClassName}`}
          >
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>Focus ring</p>
            <p className={`mt-3 ${navetTypographyTokens.label} ${surface.textPrimary}`}>
              Focused control preview
            </p>
            <p className={`mt-2 ${navetTypographyTokens.helper} ${surface.textSecondary}`}>
              Ring width stays at 2px. Theme changes the color and offset.
            </p>
          </div>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Stroke Widths',
  component: StrokeWidthsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Stroke-width and focus-ring reference for shared controls and surfaces.',
          '',
          'What this page covers:',
          '- Border thickness conventions (`border` and `border-2`) for ordinary and emphasized shells.',
          '- Focus ring baseline (`ring-2` with theme-aware color/offset treatment).',
          '',
          'Usage notes:',
          '- Keep emphasis local; do not use stronger strokes as the default resting style.',
          '- Derive focus treatment from shared tokens rather than hand-assembling ring classes in features.',
          '',
          'Review expectations:',
          '- Focus rings should be visible without flooding nearby surfaces.',
          '- Strong borders should read as intentional state, not visual noise.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof StrokeWidthsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
