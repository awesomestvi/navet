import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { EntityCardHeader, EntityCardHeaderIcon } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function FramedEntityCardHeader(args: {
  title: string;
  subtitle: string;
  size: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
  layout?: 'title-first' | 'eyebrow-first';
  align?: 'start' | 'center';
}) {
  const { theme } = useTheme();
  const frameClassName =
    theme === 'light'
      ? 'border-black/10 bg-white/95'
      : theme === 'contrast'
        ? 'border-white/18 bg-black'
        : 'border-white/12 bg-white/6';

  return (
    <div className={`w-80 rounded-2xl border p-4 backdrop-blur-xl ${frameClassName}`}>
      <EntityCardHeader
        title={args.title}
        subtitle={args.subtitle}
        size={args.size}
        layout={args.layout}
        align={args.align}
        leading={<EntityCardHeaderIcon IconComponent={Lightbulb} isActive size={args.size} />}
        trailing={
          <button
            type="button"
            className="rounded-full border border-white/20 bg-white/5 p-1.5 text-white/70"
            aria-label="Open details"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  );
}

const meta = {
  title: 'Foundation/Primitives/Entity Card Header',
  component: FramedEntityCardHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Composable entity-card header pattern combining leading icon, title block, and trailing controls. This story highlights layout and size behavior.',
      },
    },
  },
  args: {
    title: 'Living room strip',
    subtitle: 'Brightness 54%',
    size: 'medium',
    layout: 'title-first',
    align: 'start',
  },
} satisfies Meta<typeof FramedEntityCardHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EyebrowLayout: Story = {
  args: {
    layout: 'eyebrow-first',
    subtitle: 'Kitchen zone',
  },
};

export const CompactSize: Story = {
  args: {
    size: 'extra-small',
  },
};
