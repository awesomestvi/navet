import {
  WorkbenchCode,
  WorkbenchInset,
  WorkbenchIntro,
  WorkbenchPage,
  WorkbenchPanel,
} from '@navet/app/storybook/workbench-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';

import recipes from './registry/recipes.json';

const templates = import.meta.glob<string>('./registry/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function RecipesStory() {
  return (
    <WorkbenchPage>
      <WorkbenchIntro eyebrow="Composition recipes" title="Build from Navet's working parts">
        <p>
          Use these compositions as the default starting points when building in Navet. Each recipe
          uses existing UI-kit imports. The registry and this page share one recipe manifest and the
          same typed templates. These pilot recipes require Navet app context.
        </p>
      </WorkbenchIntro>

      <section className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe) => (
          <WorkbenchPanel key={recipe.name} title={recipe.title} summary={recipe.when}>
            <p className="mb-3 text-sm">{recipe.description}</p>
            <WorkbenchCode>{templates[`./registry/${recipe.name}.tsx`]}</WorkbenchCode>
            <p className="mt-3 text-sm">Required context: {recipe.context.join('. ')}.</p>
            <ul className="mt-3 space-y-2 text-sm leading-5">
              {recipe.review.map((check) => (
                <li key={check}>
                  <WorkbenchInset className="px-3 py-2">{check}</WorkbenchInset>
                </li>
              ))}
            </ul>
          </WorkbenchPanel>
        ))}
      </section>

      <WorkbenchPanel title="Review sequence">
        <div className="grid gap-3 text-sm leading-6 md:grid-cols-3">
          <WorkbenchInset>
            First check the colocated component story for states and direct API behavior.
          </WorkbenchInset>
          <WorkbenchInset>
            Then check any aggregate card, page, or settings story that exercises the composition.
          </WorkbenchInset>
          <WorkbenchInset>
            Finally use the toolbar to inspect themes, accents, card sizes, and touch viewports.
          </WorkbenchInset>
        </div>
      </WorkbenchPanel>
    </WorkbenchPage>
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
