import type { Meta, StoryObj } from '@storybook/react';

function RecipesStory() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-[28px] border border-white/10 bg-white/6 p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">UI kit recipes</h1>
        <p className="mt-2 text-sm leading-6 text-white/78">
          Use these compositions as the default starting points when building in Navet.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Compose a card</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { BaseCard } from '@/app/ui-kit/primitives';
import { EntityCardHeader } from '@/app/ui-kit/primitives';`}
          </pre>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Compose a settings dialog</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { ModalSurface } from '@/app/ui-kit/primitives';
import { CardDialogHeader, CardDialogSection } from '@/app/ui-kit/patterns';`}
          </pre>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Compose a mobile sheet</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { SheetSurface } from '@/app/ui-kit/primitives';`}
          </pre>
        </article>
        <article className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">Compose a filter row</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-xs text-white/82">
            {`import { InteractivePill, Tabs, TabList, TabTrigger } from '@/app/ui-kit/primitives';`}
          </pre>
        </article>
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
