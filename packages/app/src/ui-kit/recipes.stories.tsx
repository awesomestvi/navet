import type { Meta, StoryObj } from '@storybook/react';

const recipes = [
  {
    title: 'Compose a card',
    when: 'Use for entity and custom-card surfaces that need shared shell behavior.',
    snippet: `import { BaseCard, EntityCardHeader } from '@navet/app/ui-kit/primitives';
import { CardActionRow } from '@navet/app/ui-kit/patterns';`,
    checks: [
      'Use shared card size behavior',
      'Keep actions compact',
      'Avoid feature-local shell forks',
    ],
  },
  {
    title: 'Compose a settings dialog',
    when: 'Use for entity-card and dashboard-widget settings with tabbed or sectioned content.',
    snippet: `import { ModalSurface } from '@navet/app/ui-kit/primitives';
import { CardDialogHeader, CardDialogSection } from '@navet/app/ui-kit/patterns';`,
    checks: [
      'Use shared done/footer affordances',
      'Keep room assignment consistent',
      'Cover mobile viewport',
    ],
  },
  {
    title: 'Compose a mobile sheet',
    when: 'Use for command, search, navigation, or compact edit controls on touch displays.',
    snippet: `import { SheetSurface, Button } from '@navet/app/ui-kit/primitives';
import { FieldBlock } from '@navet/app/ui-kit/patterns';`,
    checks: [
      'Avoid nested cards',
      'Use stable sheet dimensions',
      'Keep target sizes touch friendly',
    ],
  },
  {
    title: 'Compose a filter row',
    when: 'Use for section filters, modes, and small sets of mutually exclusive choices.',
    snippet: `import { InteractivePill, TabList, Tabs, TabTrigger } from '@navet/app/ui-kit/primitives';`,
    checks: ['Expose selected state', 'Handle long labels', 'Keep keyboard focus visible'],
  },
  {
    title: 'Compose an empty state',
    when: 'Use when a section has no entities, no configured widgets, or no matching search results.',
    snippet: `import { Button } from '@navet/app/ui-kit/primitives';
import { DashboardEmptyState } from '@navet/app/ui-kit/patterns';`,
    checks: [
      'Use actionable copy',
      'Avoid marketing-style layout',
      'Keep fallback useful without HA data',
    ],
  },
  {
    title: 'Compose a themed surface',
    when: 'Use when a reusable UI piece needs theme-aware glass, dark, light, and black behavior.',
    snippet: `import { SurfacePanel } from '@navet/app/ui-kit/primitives';
import { getThemeSurfaceTokens } from '@navet/app/ui-kit/tokens';`,
    checks: [
      'Prefer token helpers over inline theme branches',
      'Check contrast',
      'Avoid heavy effects by default',
    ],
  },
];

function RecipesStory() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">UI kit recipes</h1>
        <p className="mt-2 text-sm leading-6 text-white/78">
          Use these compositions as the default starting points when building in Navet. Each recipe
          points to the stable UI-kit imports first, then the review checks that usually catch
          regressions in shared UI.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe) => (
          <article
            key={recipe.title}
            className="rounded-[24px] border border-white/10 bg-white/5 p-5"
          >
            <h2 className="text-lg font-semibold text-white">{recipe.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/74">{recipe.when}</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs leading-5 text-white/82">
              {recipe.snippet}
            </pre>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-white/70">
              {recipe.checks.map((check) => (
                <li key={check} className="rounded-lg border border-white/10 bg-black/10 px-3 py-2">
                  {check}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h2 className="text-xl font-semibold text-white">Review sequence</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-white/78 md:grid-cols-3">
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            First check the colocated component story for states and direct API behavior.
          </p>
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Then check any aggregate card, page, or settings story that exercises the composition.
          </p>
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Finally use the toolbar to inspect themes, accents, card sizes, and touch viewports.
          </p>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Concepts/UI Kit Recipes',
  component: RecipesStory,
  tags: ['autodocs'],
} satisfies Meta<typeof RecipesStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Recipes: Story = {};
