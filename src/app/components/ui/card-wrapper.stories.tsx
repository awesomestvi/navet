import type { Meta, StoryObj } from '@storybook/react';
import { Bell, ChevronRight, MoonStar, Power } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { CardWrapper } from './card-wrapper';

function CardWrapperSurface({ interactive = true }: { interactive?: boolean }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <CardWrapper
      className={`${surface.panel} ${surface.border} p-4`}
      isDisabled={!interactive}
      interactionProps={{
        'aria-label': interactive ? 'Preview shared card shell' : 'Disabled shared card shell',
      }}
      onClick={interactive ? () => {} : undefined}
    >
      <div className="relative z-10 flex h-full min-h-48 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              Shared shell
            </p>
            <h3 className={`mt-1 text-base font-semibold ${surface.textPrimary}`}>
              Card wrapper preview
            </h3>
            <p className={`mt-1 text-sm ${surface.textSecondary}`}>
              Baseline shell for theme QA before feature-specific accents are layered on top.
            </p>
          </div>
          <div className={`rounded-full border p-2 ${surface.border} ${surface.iconBg}`}>
            <MoonStar className={`h-4 w-4 ${surface.textPrimary}`} />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <div className={`rounded-2xl border px-3 py-2.5 ${surface.border} ${surface.panelMuted}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className={`h-4 w-4 ${surface.textSecondary}`} />
                <span className={`text-sm ${surface.textPrimary}`}>Notification summary</span>
              </div>
              <span className={`text-xs ${surface.textMuted}`}>3 active</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full border text-sm transition-colors ${surface.border} ${surface.subtleBg} ${surface.textPrimary} ${interactive ? surface.hoverBg : ''}`}
              type="button"
            >
              <Power className="h-4 w-4" />
              Action
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${surface.border} ${surface.subtleBg} ${surface.textSecondary} ${interactive ? surface.hoverBg : ''}`}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}

function CardWrapperShowcase() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="space-y-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
            Interactive
          </p>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            Default shared shell with live button semantics.
          </p>
        </div>
        <CardWrapperSurface />
      </section>

      <section className="space-y-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
            Disabled
          </p>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            Same shell without interactive affordance.
          </p>
        </div>
        <CardWrapperSurface interactive={false} />
      </section>

      <section className="space-y-2">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
            Minimal
          </p>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            Shadowless version for flatter surfaces and embedded previews.
          </p>
        </div>
        <CardWrapper className={`${surface.panelMuted} ${surface.border} p-4`} showShadow={false}>
          <div className="relative z-10 min-h-48 rounded-[24px] border border-current/15 border-dashed p-4">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              Shared shell
            </p>
            <h3 className={`mt-1 text-base font-semibold ${surface.textPrimary}`}>
              Minimal card stage
            </h3>
            <p className={`mt-1 text-sm ${surface.textSecondary}`}>
              Useful when checking border weight, radius, and overlay intensity in the black theme.
            </p>
          </div>
        </CardWrapper>
      </section>
    </div>
  );
}

const meta = {
  title: 'Cards/Theme/Shared Card Wrapper',
  component: CardWrapperShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Direct Storybook target for the shared `CardWrapper` shell used as the baseline chrome for card surfaces.',
          '',
          'What this page covers:',
          '- Shared radius, border, shadow, overlay, and sheen behavior without feature-specific card logic.',
          '- Interactive, disabled, and reduced-depth shell treatments in the active Storybook theme.',
          '',
          'Why it exists:',
          '- Use this before checking feature cards when harmonizing theme-specific shell styling, especially the black theme.',
          '- Keep shell regressions visible even when feature stories have their own accent or state layers.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof CardWrapperShowcase>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
