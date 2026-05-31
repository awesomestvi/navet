import type { Meta, StoryObj } from '@storybook/react';

const layerCards = [
  {
    title: 'Primitives',
    importPath: '@navet/app/ui-kit/primitives',
    description:
      'Small reusable controls and surfaces: buttons, fields, card shells, tabs, pills, modal shells, and card header parts.',
  },
  {
    title: 'Patterns',
    importPath: '@navet/app/ui-kit/patterns',
    description:
      'Reusable compositions that encode Navet layout intent: section cards, field blocks, dialog sections, empty states, and preview frames.',
  },
  {
    title: 'Tokens',
    importPath: '@navet/app/ui-kit/tokens',
    description:
      'Theme-aware helpers for surfaces, spacing, focus rings, radius choices, card states, and interaction treatments.',
  },
];

const workflowSteps = [
  'Check the primitive and pattern stories before authoring new UI.',
  'Keep behavior inside the owning feature unless the UI is reusable across features.',
  'Expose stable shared pieces through the UI-kit entrypoints.',
  'Update colocated stories and the UI-kit inventory when an export becomes stable.',
  'Run pnpm check:stories after changing Storybook structure or adding stories.',
];

const storybookSurfaces = [
  ['Concepts', 'UI-kit discovery, recipes, and contribution guidance'],
  ['Theme', 'Foundations, surface helpers, typography, motion, colors, and card-state tokens'],
  ['Components', 'Primitives, patterns, shared app controls, and UI wrappers'],
  ['App Shell', 'Header, sidebar, room navigation, search, notifications, and section controls'],
  ['Cards', 'Entity cards, custom dashboard widgets, catalogs, sizes, and state matrices'],
  ['Pages', 'Dashboard flows, settings sections, energy pages, and feature-level compositions'],
];

function StartHereStory() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6 backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
          Navet UI kit
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Start here</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
          Storybook is the official developer surface for Navet&apos;s UI kit. Build new UI from
          `/app/ui-kit/primitives`, `/app/ui-kit/patterns`, and `/app/ui-kit/tokens` before reaching
          into feature code.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {layerCards.map((layer) => (
          <article
            key={layer.title}
            className="rounded-[24px] border border-white/10 bg-white/5 p-5"
          >
            <h2 className="text-lg font-semibold text-white">{layer.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/74">{layer.description}</p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
              {`import { ... } from '${layer.importPath}';`}
            </pre>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
        <article className="rounded-[28px] border border-white/10 bg-white/6 p-6">
          <h2 className="text-xl font-semibold text-white">Contribution flow</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-white/78">
            {workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/8 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-[28px] border border-white/10 bg-white/6 p-6">
          <h2 className="text-xl font-semibold text-white">Storybook map</h2>
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/82">
              <thead className="bg-black/20 text-white/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Root</th>
                  <th className="px-4 py-3 font-semibold">Use for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {storybookSurfaces.map(([root, useFor]) => (
                  <tr key={root}>
                    <td className="px-4 py-3 font-medium text-white">{root}</td>
                    <td className="px-4 py-3">{useFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h2 className="text-xl font-semibold text-white">Rules</h2>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-white/78 md:grid-cols-2">
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Author new shared controls in `components/primitives` or `components/patterns`.
          </p>
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Keep `components/system` as a curated public surface, not the default authoring folder.
          </p>
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Use `components/shared` only for app-specific shared UI and compatibility shims.
          </p>
          <p className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            Prefer deterministic Storybook fixtures over live Home Assistant data or app-only side
            effects.
          </p>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Concepts/UI Kit Start Here',
  component: StartHereStory,
  tags: ['autodocs'],
} satisfies Meta<typeof StartHereStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
