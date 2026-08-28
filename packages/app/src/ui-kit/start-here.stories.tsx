import {
  WorkbenchCode,
  WorkbenchInset,
  WorkbenchIntro,
  WorkbenchPage,
  WorkbenchPanel,
} from '@navet/app/storybook/workbench-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';

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
  ['Marketing', 'Website sections and product storytelling slices used outside the dashboard'],
];

function StartHereStory() {
  return (
    <WorkbenchPage width="reading">
      <WorkbenchIntro eyebrow="Navet UI kit" title="Start with the shared language">
        <p>
          Storybook is the official developer surface for Navet&apos;s UI kit. Build new UI from
          `/app/ui-kit/primitives`, `/app/ui-kit/patterns`, and `/app/ui-kit/tokens` before reaching
          into feature code.
        </p>
      </WorkbenchIntro>

      <section className="grid gap-4 md:grid-cols-3">
        {layerCards.map((layer) => (
          <WorkbenchPanel key={layer.title} title={layer.title} summary={layer.description}>
            <WorkbenchCode>{`import { ... } from '${layer.importPath}';`}</WorkbenchCode>
          </WorkbenchPanel>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
        <WorkbenchPanel title="Contribution flow">
          <ol className="space-y-3 text-sm leading-6">
            {workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/15 text-xs font-semibold">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </WorkbenchPanel>

        <WorkbenchPanel title="Storybook map">
          <div className="overflow-hidden rounded-[16px] border border-current/10">
            <table className="min-w-full divide-y divide-current/10 text-left text-sm">
              <thead className="bg-current/5 opacity-75">
                <tr>
                  <th className="px-4 py-3 font-semibold">Root</th>
                  <th className="px-4 py-3 font-semibold">Use for</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-current/10">
                {storybookSurfaces.map(([root, useFor]) => (
                  <tr key={root}>
                    <td className="px-4 py-3 font-medium">{root}</td>
                    <td className="px-4 py-3">{useFor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WorkbenchPanel>
      </section>

      <WorkbenchPanel title="Authoring rules">
        <div className="grid gap-3 text-sm leading-6 md:grid-cols-2">
          <WorkbenchInset>
            Author new shared controls in `components/primitives` or `components/patterns`.
          </WorkbenchInset>
          <WorkbenchInset>
            Keep `components/system` as a curated public surface, not the default authoring folder.
          </WorkbenchInset>
          <WorkbenchInset>
            Use `components/shared` only for app-specific shared UI and compatibility shims.
          </WorkbenchInset>
          <WorkbenchInset>
            Prefer deterministic Storybook fixtures over live Home Assistant data or app-only side
            effects.
          </WorkbenchInset>
        </div>
      </WorkbenchPanel>
    </WorkbenchPage>
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
