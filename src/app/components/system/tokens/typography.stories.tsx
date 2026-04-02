import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { navetRadiusTokens, navetTypographyTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

function TypographyStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <ThemeTokenShowcase
      intro="Typography utility tokens for labels, helper text, headings, and dashboard feature headers. Reuse these to keep text hierarchy predictable."
      tokens={navetTypographyTokens}
      previewTitle="Reference hierarchy"
      preview={
        <div className={`rounded-[24px] border p-5 ${surface.border} ${surface.panelMuted}`}>
          <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>Dashboard</p>
          <h1 className={`mt-2 ${navetTypographyTokens.pageHeading} ${surface.textPrimary}`}>
            Whole-home overview
          </h1>
          <h2 className={`mt-4 ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
            Lighting section
          </h2>
          <p className={`mt-4 ${navetTypographyTokens.label} ${surface.textPrimary}`}>
            Primary label
          </p>
          <p className={`mt-2 ${navetTypographyTokens.body} ${surface.textSecondary}`}>
            Body text for settings descriptions, dialog explanations, and general UI content.
          </p>
          <p className={`mt-2 ${navetTypographyTokens.helper} ${surface.textMuted}`}>
            Helper text for inline guidance and secondary instructional copy.
          </p>

          <div
            className={`mt-4 ${navetRadiusTokens.action} border p-4 ${surface.border} ${surface.panel}`}
          >
            <p className={`${navetTypographyTokens.caption} ${surface.textMuted}`}>
              Dense / caption usage
            </p>
            <p className={`mt-2 ${navetTypographyTokens.dense} ${surface.textSecondary}`}>
              Good for compact metadata rows and supporting labels inside tighter card layouts.
            </p>
          </div>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Typography',
  component: TypographyStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared typography roles for headings, labels, body copy, and helper text.',
          '',
          'What this page covers:',
          '- Hierarchy tokens from eyebrow and caption through section/page headings.',
          '- Practical examples of body and helper usage inside realistic container surfaces.',
          '',
          'Usage notes:',
          '- Reuse role tokens first; avoid ad hoc text-size/weight combinations unless strongly justified.',
          '- Keep helper/caption text readable and avoid shrinking long explanatory copy too far.',
          '',
          'Review expectations:',
          '- Heading/body/helper hierarchy should remain obvious at a glance.',
          '- Text density should stay comfortable on dashboard-grade displays and tablets.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof TypographyStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
