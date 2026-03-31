import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb } from 'lucide-react';
import { CardHeader } from './card-header';
import { CardWrapper } from './card-wrapper';

function CardCompositeStory() {
  return (
    <div className="flex flex-wrap items-start gap-4 p-8">
      {/* Interactive card with header */}
      <div className="h-48 w-48">
        <CardWrapper onClick={() => {}}>
          <div className="h-full p-3">
            <CardHeader
              title="Living Room"
              icon={<Lightbulb className="h-5 w-5" />}
              iconBgColor="bg-amber-500/20"
              iconColor="text-amber-400"
              size="small"
            />
            <p className="mt-2 text-xs text-white/60">3 lights on</p>
          </div>
        </CardWrapper>
      </div>

      {/* Medium card */}
      <div className="h-48 w-96">
        <CardWrapper onClick={() => {}}>
          <div className="h-full p-4">
            <CardHeader
              title="Office Ceiling Lamp"
              icon={<Lightbulb className="h-5 w-5" />}
              iconBgColor="bg-blue-500/20"
              iconColor="text-blue-400"
              size="medium"
            />
            <p className="mt-2 text-sm text-white/60">On · 4000K · 80%</p>
          </div>
        </CardWrapper>
      </div>

      {/* Non-interactive card */}
      <div className="h-48 w-48">
        <CardWrapper>
          <div className="h-full p-3">
            <CardHeader title="Read-only Card" size="small" />
            <p className="mt-2 text-xs text-white/60">No click handler</p>
          </div>
        </CardWrapper>
      </div>
    </div>
  );
}

const meta = {
  title: 'UI/Card Wrapper',
  component: CardCompositeStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`CardWrapper` provides the glass-effect card chrome with hover/press states. `CardHeader` provides the consistent icon + title row that sits at the top of every entity card.',
      },
    },
  },
} satisfies Meta<typeof CardCompositeStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
