import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb } from 'lucide-react';
import { CaptionValue } from './caption-value';
import { CardHeader } from './card-header';
import { CardWrapper } from './card-wrapper';

function CardCompositeStory() {
  return (
    <div className="flex flex-wrap items-start gap-5 p-8">
      <div className="h-52 w-52">
        <CardWrapper onClick={() => {}}>
          <div className="flex h-full flex-col p-3">
            <CardHeader
              title="Living Room"
              icon={<Lightbulb className="h-5 w-5" />}
              iconBgColor="bg-amber-500/20"
              iconColor="text-amber-400"
              size="small"
            />
            <p className="mt-2 text-xs text-white/60">3 lights on</p>
            <div className="mt-auto space-y-2">
              <CaptionValue caption="Brightness" value="68%" />
              <CaptionValue caption="Scene" value="Evening" />
            </div>
          </div>
        </CardWrapper>
      </div>

      <div className="h-52 w-[25rem]">
        <CardWrapper onClick={() => {}}>
          <div className="flex h-full flex-col p-4">
            <CardHeader
              title="Office Ceiling Lamp"
              icon={<Lightbulb className="h-5 w-5" />}
              iconBgColor="bg-blue-500/20"
              iconColor="text-blue-400"
              size="medium"
            />
            <p className="mt-2 text-sm text-white/60">On · 4000K · 80%</p>
            <div className="mt-auto flex items-center justify-between gap-4">
              <CaptionValue caption="Power" value="12.4 W" />
              <CaptionValue caption="Updated" value="2m ago" align="right" />
            </div>
          </div>
        </CardWrapper>
      </div>

      <div className="h-52 w-52">
        <CardWrapper>
          <div className="flex h-full flex-col p-3">
            <CardHeader title="Read-only Card" size="small" />
            <p className="mt-2 text-xs text-white/60">Static card composition</p>
            <div className="mt-auto space-y-2">
              <CaptionValue caption="Status" value="Idle" />
              <CaptionValue caption="Mode" value="Manual" />
            </div>
          </div>
        </CardWrapper>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Card Composition',
  component: CardCompositeStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Composite documentation page for the legacy card building blocks: `CardWrapper`, `CardHeader`, and `CaptionValue`.',
          '',
          'Why these are documented together:',
          '- These pieces rarely make sense in isolation when reviewing the UI system.',
          '- `CardHeader` and `CaptionValue` are usually internal card parts, not standalone destinations.',
          '- Reviewing them together makes spacing, hierarchy, and card chrome easier to judge.',
          '',
          'What to look for:',
          '- `CardWrapper` provides the shell, hover, and press treatment.',
          '- `CardHeader` establishes the top title and optional icon row.',
          '- `CaptionValue` provides compact metadata rows used near the lower edge of a card.',
          '',
          'This story intentionally shows realistic compositions instead of disconnected atoms.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof CardCompositeStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
