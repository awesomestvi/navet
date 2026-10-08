import { useTheme } from '@navet/app/hooks';
import {
  WorkbenchCode,
  WorkbenchInset,
  WorkbenchIntro,
  WorkbenchPage,
  WorkbenchPanel,
} from '@navet/app/storybook/workbench-docs';
import { Button, Input } from '@navet/app/ui-kit/primitives';
import { getThemeSurfaceTokens } from '@navet/app/ui-kit/tokens';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useId, useState } from 'react';
import { expect } from 'storybook/test';
import recipes from '../composition-recipes/recipes.json';

interface RegistryItem {
  name: string;
  title: string;
  description: string;
  files: { content: string }[];
  meta: {
    catalogKind?: string;
    source?: string;
    states?: string[];
    level: string;
    reviewStatus: string;
    sourceRevision: { commit: string | null; dirty: boolean };
    sourceFingerprint: string;
    compositionFingerprint: string;
    contracts: unknown[];
    story: { href: string } | null;
    reference: { href: string } | null;
  };
}
function RecipesStory() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [level, setLevel] = useState('all');
  const [reviewStatus, setReviewStatus] = useState('all');
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
          payload.items.filter((item: RegistryItem) =>
            ['product', 'building-block'].includes(item.meta.level)
          ).length !== recipes.length ||
          recipes.some(
            (recipe) =>
              !payload.items.some(
                (item: RegistryItem) =>
                  item.name === recipe.name &&
                  item.meta.level === recipe.level &&
                  item.meta.reviewStatus === recipe.reviewStatus
              )
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
      (level === 'all' || recipe.level === level) &&
      (reviewStatus === 'all' || recipe.reviewStatus === reviewStatus) &&
      [
        recipe.title,
        recipe.name,
        recipe.when,
        recipe.family,
        recipe.level,
        recipe.reviewStatus,
        recipe.owner,
        ...recipe.searchTerms,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase())
  );
  return (
    <WorkbenchPage>
      <WorkbenchIntro
        eyebrow="Composition recipes"
        title="Choose a building block or a product composition"
      >
        <p>
          Building blocks demonstrate reusable controls and layouts. Product compositions reuse
          existing feature UI. Check review status, inspect current contracts, then review the
          executable example and reference before editing the template. Features own routing,
          capabilities, validation and persistence.
        </p>
      </WorkbenchIntro>
      <WorkbenchPanel title="Find a composition">
        <div className="mb-4 flex flex-wrap gap-4">
          <label>
            Catalog level
            <select
              className="ml-2 rounded border bg-transparent p-2"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="all">All levels</option>
              <option value="product">Product compositions</option>
              <option value="building-block">Building blocks</option>
            </select>
          </label>
          <label>
            Review status
            <select
              className="ml-2 rounded border bg-transparent p-2"
              value={reviewStatus}
              onChange={(event) => setReviewStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="approved">Maintainer approved</option>
              <option value="pending">Awaiting design review</option>
              <option value="draft">Draft building blocks</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </label>
        </div>
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
      {(['product', 'building-block'] as const).map((catalogLevel) => (
        <section key={catalogLevel} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {catalogLevel === 'product' ? 'Product compositions' : 'Building blocks'}
          </h2>
          <p>
            {catalogLevel === 'product'
              ? 'Existing Navet feature UI. Pending items require maintainer design review before recommendation.'
              : 'Draft usage patterns. Establish the consuming feature reference before adapting these templates.'}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {visible
              .filter((recipe) => recipe.level === catalogLevel)
              .map((recipe) => {
                const item = registry?.find((item) => item.name === recipe.name);
                return (
                  <WorkbenchPanel key={recipe.name} title={recipe.title} summary={recipe.when}>
                    <p className="mb-3 text-sm">{recipe.description}</p>
                    <p className="mb-2 text-sm">
                      Family: {recipe.family} · Review:{' '}
                      {recipe.reviewStatus === 'pending'
                        ? 'Awaiting design review'
                        : recipe.reviewStatus}{' '}
                      · Owner: {recipe.owner}
                    </p>
                    <p className="text-sm">Required context: {recipe.context.join('. ')}.</p>
                    <p className="mt-2 text-sm">Supported states: {recipe.states.join(', ')}.</p>
                    {item ? (
                      <>
                        <div className="my-3 flex flex-wrap gap-3 text-sm underline">
                          <a href={`./${item.meta.story?.href}`} target="_top">
                            Executable example
                          </a>
                          <a href={`./${item.meta.reference?.href}`} target="_top">
                            {recipe.level === 'product'
                              ? 'Existing feature reference'
                              : 'Usage reference'}
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
                          <WorkbenchCode>
                            {JSON.stringify(item.meta.contracts, null, 2)}
                          </WorkbenchCode>
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
          </div>
        </section>
      ))}
      {visible.length === 0 ? <p>No recipes match these filters.</p> : null}
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
    const example = await canvas.findByRole('link', { name: 'Executable example' });
    await expect(
      new URL(example.getAttribute('href') ?? '', window.location.href).pathname
    ).not.toContain('iframe.html');
    await userEvent.clear(input);
    await userEvent.click(canvas.getByRole('button', { name: 'feedback' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('1 compositions');
    await expect(canvas.getByRole('heading', { name: 'Inline operation feedback' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'all' }));
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Catalog level' }),
      'product'
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('2 compositions');
    await expect(canvas.getByRole('heading', { name: 'Switch card' })).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Weather card configuration' })).toBeVisible();
    await expect(canvas.getAllByRole('link', { name: 'Existing feature reference' })).toHaveLength(
      2
    );
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: 'Review status' }),
      'approved'
    );
    await expect(canvas.getByRole('status')).toHaveTextContent('0 compositions');
    await expect(canvas.getByText('No recipes match these filters.')).toBeVisible();
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Review status' }), 'all');
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Catalog level' }), 'all');
  },
};

function SourceCatalogStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [limit, setLimit] = useState(40);
  const [items, setItems] = useState<RegistryItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string>();
  const id = useId();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch('/r/registry.json', {
          cache: 'no-store',
          signal: requestController.signal,
        });
        if (!response.ok)
          throw new Error(`Registry unavailable (${response.status}). Start pnpm registry:dev.`);
        const payload = await response.json();
        if (
          !Array.isArray(payload.items) ||
          !payload.items.some((item: RegistryItem) => item.meta.catalogKind)
        )
          throw new Error('Rebuild the registry for this Storybook revision.');
        if (!disposed) {
          setItems(payload.items.filter((item: RegistryItem) => item.meta.catalogKind));
          setError(undefined);
        }
      } catch (cause) {
        if (!disposed && !requestController.signal.aborted) {
          setItems([]);
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
  const matches = items.filter((item) =>
    `${item.title} ${item.description} ${item.meta.level} ${item.meta.source}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );
  return (
    <WorkbenchPage>
      <WorkbenchIntro eyebrow="Navet source catalog" title="Reuse the real design system">
        <p>
          Find foundations, primitives, patterns, feature components and every Storybook example.
          Inspect canonical imports and source, then review the rendered reference. Review status
          remains unclassified until acceptance is recorded.
        </p>
      </WorkbenchIntro>
      <WorkbenchPanel title="Find a reference" className={surface.textSecondary}>
        <label htmlFor={id}>Search canonical Navet sources</label>
        <Input
          id={id}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(40);
          }}
          placeholder="For example: BaseCard, spacing, lighting, unavailable"
        />
        <p role="status">
          {matches.length} references. Showing {Math.min(matches.length, limit)}.
        </p>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <Button onClick={() => setRetry(retry + 1)}>Retry registry</Button>
          </div>
        ) : items.length === 0 ? (
          <p>Loading source catalog…</p>
        ) : null}
      </WorkbenchPanel>
      {matches.slice(0, limit).map((item) => (
        <WorkbenchPanel
          key={item.name}
          title={item.title}
          summary={`${item.meta.level} · ${item.meta.catalogKind} · ${item.meta.reviewStatus}`}
          className={`${surface.textSecondary} break-words`}
        >
          <p>{item.meta.source}</p>
          <div className="flex flex-wrap gap-3 underline">
            <a href={`/r/${item.name}.json`}>View source and contracts</a>
            {item.meta.reference ? (
              <a href={`./${item.meta.reference.href}`} target="_top">
                Rendered reference
              </a>
            ) : null}
          </div>
          <p>
            Examples:{' '}
            {item.meta.states?.slice(0, 8).join(', ') ||
              'Inspect the nearest same-family reference.'}
          </p>
        </WorkbenchPanel>
      ))}
      {matches.length > limit ? (
        <Button onClick={() => setLimit(limit + 40)}>Show more references</Button>
      ) : null}
    </WorkbenchPage>
  );
}
export const SourceCatalog: Story = {
  render: () => <SourceCatalogStory />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: 'Search canonical Navet sources' });
    await userEvent.type(input, 'BaseCard');
    await expect(await canvas.findByRole('heading', { name: 'BaseCard' })).toBeVisible();
    await expect(
      canvas.getAllByRole('link', { name: 'View source and contracts' }).length
    ).toBeGreaterThan(0);
    await expect(
      canvas.getAllByRole('link', { name: 'Rendered reference' }).length
    ).toBeGreaterThan(0);
  },
};
