import {
  WorkbenchCode,
  WorkbenchInset,
  WorkbenchIntro,
  WorkbenchPage,
  WorkbenchPanel,
} from '@navet/app/storybook/workbench-docs';
import { Button, Input } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useId, useState } from 'react';
import { expect } from 'storybook/test';
import recipes from './registry/recipes.json';

interface RegistryItem {
  name: string;
  files: { content: string }[];
  meta: {
    sourceRevision: { commit: string | null; dirty: boolean };
    sourceFingerprint: string;
    compositionFingerprint: string;
    contracts: unknown[];
    story: { href: string };
    reference: { href: string };
  };
}
function RecipesStory() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [registry, setRegistry] = useState<RegistryItem[]>();
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const id = useId();
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch('/r/registry.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            `Registry unavailable (${response.status}). Start pnpm registry:dev or rebuild Storybook.`
          );
        const payload = await response.json();
        if (
          !Array.isArray(payload.items) ||
          payload.items.length !== recipes.length ||
          recipes.some(
            (recipe) => !payload.items.some((item: RegistryItem) => item.name === recipe.name)
          )
        )
          throw new Error(
            'Registry does not match this Storybook manifest. Rebuild this revision.'
          );
        if (!disposed) {
          setRegistry(payload.items);
          setError(undefined);
        }
      } catch (cause) {
        if (!disposed && !(cause instanceof DOMException && cause.name === 'AbortError')) {
          setRegistry(undefined);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    };
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 4000);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [retry]);
  const visible = recipes.filter(
    (recipe) =>
      (family === 'all' || recipe.family === family) &&
      [recipe.title, recipe.name, recipe.when, recipe.family, ...recipe.searchTerms]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
  );
  return (
    <WorkbenchPage>
      <WorkbenchIntro eyebrow="Composition recipes" title="Build from Navet's working parts">
        <p>
          Discover a composition, inspect its current contracts, then review the executable example
          and reference before editing the template. Features own routing, capabilities, validation
          and persistence.
        </p>
      </WorkbenchIntro>
      <WorkbenchPanel title="Find a composition">
        <label htmlFor={id}>Search by intended behavior</label>
        <Input
          id={id}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="For example: validation, keyboard selection, unavailable"
        />
        <fieldset className="mt-3 flex flex-wrap gap-2" aria-label="Composition families">
          {['all', ...new Set(recipes.map((recipe) => recipe.family))].map((value) => (
            <Button
              key={value}
              size="compact"
              variant="soft"
              aria-pressed={family === value}
              onClick={() => setFamily(value)}
            >
              {value}
            </Button>
          ))}
        </fieldset>
        <p role="status" className="mt-3">
          {visible.length} compositions
        </p>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={() => setRetry(retry + 1)}>Retry registry</Button>
          </div>
        ) : !registry ? (
          <p>Loading current contracts…</p>
        ) : (
          <p className="mt-2 break-all text-xs">
            Revision: {registry[0]?.meta.sourceRevision.commit ?? 'unversioned'}
            {registry[0]?.meta.sourceRevision.dirty ? ' (dirty local source)' : ''}
          </p>
        )}
      </WorkbenchPanel>
      <section className="grid gap-4 md:grid-cols-2">
        {visible.map((recipe) => {
          const item = registry?.find((item) => item.name === recipe.name);
          return (
            <WorkbenchPanel key={recipe.name} title={recipe.title} summary={recipe.when}>
              <p className="mb-3 text-sm">{recipe.description}</p>
              <p className="text-sm">Required context: {recipe.context.join('. ')}.</p>
              <p className="mt-2 text-sm">Supported states: {recipe.states.join(', ')}.</p>
              {item ? (
                <>
                  <div className="my-3 flex flex-wrap gap-3 text-sm underline">
                    <a href={item.meta.story.href} target="_top">
                      Executable example
                    </a>
                    <a href={item.meta.reference.href} target="_top">
                      Component reference
                    </a>
                    <a href={`/r/${recipe.name}.json`}>Registry payload</a>
                  </div>
                  <details>
                    <summary className="cursor-pointer">
                      Editable template: {recipe.templateExport}
                    </summary>
                    <WorkbenchCode>{item.files[0].content}</WorkbenchCode>
                  </details>
                  <details className="mt-3">
                    <summary className="cursor-pointer">Current component contracts</summary>
                    <WorkbenchCode>{JSON.stringify(item.meta.contracts, null, 2)}</WorkbenchCode>
                  </details>
                  <p className="mt-2 break-all text-xs">
                    Composition fingerprint: {item.meta.compositionFingerprint}
                  </p>
                </>
              ) : null}
              <details className="mt-3">
                <summary className="cursor-pointer">Review criteria</summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {recipe.review.map((check) => (
                    <li key={check}>
                      <WorkbenchInset className="px-3 py-2">{check}</WorkbenchInset>
                    </li>
                  ))}
                </ul>
              </details>
            </WorkbenchPanel>
          );
        })}
      </section>
      <WorkbenchPanel title="Rendered review">
        Structural checks establish concrete source contracts. Review hierarchy, all four themes,
        responsive usability, long labels and reduced motion in the executable examples. Hero
        sections and attention summaries remain reference-first coverage gaps.
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
export const Recipes: Story = {
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: 'Search by intended behavior' });
    await userEvent.type(input, 'keyboard selection');
    await expect(canvas.getByRole('status')).toHaveTextContent('1 compositions');
    await expect(canvas.getByRole('heading', { name: 'Searchable selection' })).toBeVisible();
    await userEvent.clear(input);
    await userEvent.click(canvas.getByRole('button', { name: 'feedback' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('1 compositions');
    await expect(canvas.getByRole('heading', { name: 'Status feedback' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'all' }));
  },
};
