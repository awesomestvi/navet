import type { Meta, StoryObj } from '@storybook/react';

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
          `@/app/ui-kit/primitives`, `@/app/ui-kit/patterns`, and `@/app/ui-kit/tokens` before
          reaching into feature code.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Primitives</h2>
          <p className="mt-2 text-sm leading-6 text-white/74">
            Buttons, inputs, tabs, modal shells, sheet shells, and shared surface containers.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { Button, ModalSurface, SheetSurface } from '@/app/ui-kit/primitives';`}
          </pre>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Patterns</h2>
          <p className="mt-2 text-sm leading-6 text-white/74">
            Composed reusable structures such as section cards, hero layouts, field blocks, and
            empty states.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { DashboardHeroSection, SectionCard } from '@/app/ui-kit/patterns';`}
          </pre>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Tokens</h2>
          <p className="mt-2 text-sm leading-6 text-white/74">
            Theme-aware surface, spacing, focus, radius, and shell helpers for new shared UI.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { getThemeSurfaceTokens, navetUiKitRadiusTokens } from '@/app/ui-kit/tokens';`}
          </pre>
        </article>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h2 className="text-xl font-semibold text-white">Rules</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-white/78">
          <li>Do not import shared UI from feature modules.</li>
          <li>
            Do not add new one-off shells when `ModalSurface`, `SheetSurface`, or `SurfacePanel`
            fit.
          </li>
          <li>
            Do not add new shared UI to `components/shared` unless it is intentionally app-specific.
          </li>
          <li>
            Every new primitive or pattern must have a Storybook story and should be discoverable
            from this UI-kit surface.
          </li>
        </ul>
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
