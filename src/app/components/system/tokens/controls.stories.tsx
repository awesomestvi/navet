import type { Meta, StoryObj } from '@storybook/react';
import { Search, Settings2 } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';
import {
  getBaseCardRadiusClassName,
  getButtonSizeTokens,
  getDialogMaxWidthClassName,
  getInputSizeTokens,
  navetControlTokens,
  navetDensityTokens,
  navetLayoutTokens,
} from './index';
import { ThemeTokenShowcase } from './theme-token-showcase';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'black'];

function SurfacePreviewCard({ theme }: { theme: ThemeType }) {
  const surface = getThemeSurfaceTokens(theme);
  const defaultButton = getButtonSizeTokens('default');
  const compactButton = getButtonSizeTokens('compact');
  const inputTokens = getInputSizeTokens('default');

  return (
    <section
      className={`space-y-4 ${getBaseCardRadiusClassName('medium')} border ${navetControlTokens.card.densityPaddingClassNames.comfortable} ${surface.panel} ${surface.border}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>{theme}</p>
          <h3 className={`mt-1 text-sm font-semibold ${surface.textPrimary}`}>Shared surfaces</h3>
        </div>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full border ${navetControlTokens.iconButton.sizes.compact.className} ${surface.border} ${surface.subtleBg} ${surface.textPrimary}`}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-[20px] ${defaultButton.heightClassName} ${defaultButton.paddingXClassName} ${defaultButton.textClassName} bg-orange-500 text-white`}
          >
            Primary
          </button>
          <button
            type="button"
            className={`inline-flex items-center justify-center rounded-[20px] border ${compactButton.heightClassName} ${compactButton.paddingXClassName} ${compactButton.textClassName} ${surface.border} ${surface.subtleBg} ${surface.textPrimary}`}
          >
            Secondary
          </button>
        </div>

        <div
          className={`relative w-full rounded-[22px] border ${inputTokens.insetClassName} ${surface.border} ${surface.inputBg} ${surface.textPrimary}`}
        >
          <div
            className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 ${surface.textMuted}`}
          >
            <Search className="h-4 w-4" />
          </div>
          <div className={`${inputTokens.leadingPaddingClassName} text-sm`}>Search devices</div>
        </div>

        <div
          className={`border ${surface.border} ${surface.panelMuted} ${navetControlTokens.dialog.radiusClassName} ${navetControlTokens.dialog.bodyPaddingClassName}`}
        >
          <div className="space-y-2">
            <p className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>Dialog</p>
            <div className={`text-sm font-semibold ${surface.textPrimary}`}>Settings shell</div>
            <div className={`text-sm ${surface.textSecondary}`}>
              Max width token: <code>{getDialogMaxWidthClassName('md')}</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ControlsStory() {
  return (
    <ThemeTokenShowcase
      intro="Semantic control tokens adapt the external draft’s sizing and density ideas to Navet’s existing four-theme system. Shared primitives should prefer these tokens over inline height, padding, radius, or dialog shell values."
      tokens={{
        density: navetDensityTokens,
        controls: navetControlTokens,
        layout: navetLayoutTokens,
      }}
      previewTitle="Theme surface coverage"
      preview={
        <div className="grid gap-4 xl:grid-cols-2">
          {THEMES.map((theme) => (
            <SurfacePreviewCard key={theme} theme={theme} />
          ))}
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Controls',
  component: ControlsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared semantic control and layout tokens adapted from the external draft.',
          '',
          'What this page covers:',
          '- Density tiers for compact, comfortable, and touch-first UI.',
          '- Shared button, input, card, and dialog sizing decisions.',
          '- Four-theme surface previews for the primitives that now consume these tokens.',
          '',
          'Usage notes:',
          '- Keep color resolution in the existing theme helpers; these tokens only define shared sizing and structure.',
          '- Prefer tokenized control dimensions before introducing inline component-specific values.',
          '',
          'Review expectations:',
          '- Verify touch targets stay appropriate across compact, comfortable, and touch-oriented tiers.',
          '- Verify button, input, card, and dialog surfaces still read clearly in glass, dark, light, and black themes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ControlsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
