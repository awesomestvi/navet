import type { Meta, StoryObj } from '@storybook/react';
import { EntityCardTitleBlock } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function FramedEntityCardTitleBlock({
  title,
  subtitle,
  layout,
}: {
  title: string;
  subtitle?: string;
  layout?: 'title-first' | 'eyebrow-first';
}) {
  const { theme } = useTheme();
  const frameClassName =
    theme === 'light'
      ? 'border-black/10 bg-white/95'
      : theme === 'contrast'
        ? 'border-white/18 bg-black'
        : 'border-white/12 bg-white/6';
  const titleClassName = theme === 'light' ? 'text-slate-900' : 'text-white';
  const subtitleClassName = theme === 'light' ? 'text-slate-500' : 'text-white/60';

  return (
    <div className={`w-72 rounded-2xl border p-4 backdrop-blur-xl ${frameClassName}`}>
      <EntityCardTitleBlock
        title={title}
        subtitle={subtitle}
        layout={layout}
        titleClassName={`truncate text-sm font-semibold ${titleClassName}`}
        subtitleClassName={`truncate text-[11px] uppercase tracking-[0.16em] ${subtitleClassName}`}
      />
    </div>
  );
}

const meta = {
  title: 'Foundation/Primitives/Entity Card Title Block',
  component: FramedEntityCardTitleBlock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Shared title/subtitle stack for entity cards. Supports title-first and eyebrow-first layouts to standardize header typography across card types.',
      },
    },
  },
  args: {
    title: 'Living Room Lights',
    subtitle: '6 entities online',
    layout: 'title-first',
  },
} satisfies Meta<typeof FramedEntityCardTitleBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TitleFirst: Story = {};

export const EyebrowFirst: Story = {
  args: {
    layout: 'eyebrow-first',
  },
};
