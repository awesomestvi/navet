import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { navetSpacingTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

function SpacingStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <ThemeTokenShowcase
      intro="Spacing tokens for inline gaps, stack rhythm, and insets. Prefer these scale values to keep dashboards and dialogs visually consistent."
      tokens={navetSpacingTokens}
      previewTitle="Examples"
      preview={
        <div className="space-y-4">
          <div>
            <p className={`mb-2 text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              Inline gaps
            </p>
            <div className={`flex ${navetSpacingTokens.inline.md}`}>
              <div className="h-8 w-8 rounded-full bg-white/20" />
              <div className="h-8 w-8 rounded-full bg-white/20" />
              <div className="h-8 w-8 rounded-full bg-white/20" />
            </div>
          </div>

          <div>
            <p className={`mb-2 text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              Stack rhythm
            </p>
            <div className={navetSpacingTokens.stack.sm}>
              <div className="h-3 rounded bg-white/20" />
              <div className="h-3 rounded bg-white/20" />
              <div className="h-3 rounded bg-white/20" />
            </div>
          </div>

          <div>
            <p className={`mb-2 text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              Inset padding
            </p>
            <div
              className={`${navetSpacingTokens.inset.md} rounded-[20px] border border-white/20 bg-white/6 text-sm ${surface.textPrimary}`}
            >
              Padded content block
            </div>
          </div>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Spacing',
  component: SpacingStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared spacing scale for inline gaps, vertical rhythm, and inset padding.',
          '',
          'What this page covers:',
          '- `inline.*` tokens for horizontal grouping and compact control rows.',
          '- `stack.*` tokens for predictable vertical rhythm.',
          '- `inset.*` tokens for panel and section interior padding.',
          '',
          'Usage notes:',
          '- Prefer tokenized spacing before introducing one-off Tailwind spacing values.',
          '- Keep nearby components on neighboring spacing steps to avoid rhythm drift.',
          '',
          'Review expectations:',
          '- Verify dense and comfortable layouts both preserve clear hierarchy.',
          '- Verify spacing remains coherent across desktop and constrained widths.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SpacingStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
