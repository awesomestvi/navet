import type { Meta, StoryObj } from '@storybook/react';
import { getCardShellSurfaceTokens } from '@/app/components/system/tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

const THEMES: ThemeType[] = ['glass', 'dark', 'light', 'contrast'];

function CardShellSurfaceTokensShowcase() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {THEMES.map((theme) => {
        const shell = getCardShellSurfaceTokens(theme);

        return (
          <article
            key={theme}
            className="relative overflow-hidden rounded-2xl border border-white/14 bg-white/6 p-4"
          >
            {shell.sheenOverlayClassName ? (
              <div aria-hidden="true" className={shell.sheenOverlayClassName} />
            ) : null}
            <div
              className={`relative z-10 rounded-xl border border-white/16 bg-black/25 p-3 ${shell.backdropClassName}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                {theme}
              </p>
              <p className="mt-1 text-xs text-white/65">backdrop and sheen overlay token output</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

const meta = {
  title: 'Tokens/Card Shell Surface Tokens',
  component: CardShellSurfaceTokensShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Token preview for `getCardShellSurfaceTokens(theme)`, used to apply shared backdrop blur and sheen overlays to card shells.',
      },
    },
  },
} satisfies Meta<typeof CardShellSurfaceTokensShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
