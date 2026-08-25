import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { EntityCardHeader, type EntityCardHeaderVariant } from './entity-card-header';
import { EntityCardHeaderIcon } from './entity-card-header-icon';

function FramedEntityCardHeader(args: {
  title: string;
  subtitle: string;
  size: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
  layout?: 'title-first' | 'eyebrow-first';
  align?: 'start' | 'center';
  compact?: boolean;
  variant?: EntityCardHeaderVariant;
}) {
  const { theme } = useTheme();
  const frameClassName =
    theme === 'light'
      ? 'border-black/10 bg-white/95'
      : theme === 'black'
        ? 'border-white/18 bg-black'
        : 'border-white/12 bg-white/6';

  return (
    <div className={`w-80 rounded-3xl border p-4 backdrop-blur-xl ${frameClassName}`}>
      <EntityCardHeader
        title={args.title}
        subtitle={args.subtitle}
        size={args.size}
        layout={args.layout}
        align={args.align}
        compact={args.compact}
        variant={args.variant}
        leading={
          <EntityCardHeaderIcon
            IconComponent={Lightbulb}
            isActive
            size={args.size}
            variant={args.variant}
          />
        }
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
  title: 'Components/Primitives/Cards/Entity/Header',
  component: FramedEntityCardHeader,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Composable entity-card header pattern combining leading icon, title block, and trailing controls. Compact cards preserve the standard eyebrow/title rhythm while tightening outer spacing, touch layouts center the identity row against 36 px icons, and larger cards can explicitly opt into the large header variant.',
      },
    },
  },
  args: {
    title: 'Living room strip',
    subtitle: 'Brightness 54%',
    size: 'medium',
    layout: 'eyebrow-first',
    align: 'start',
    variant: 'default',
  },
} satisfies Meta<typeof FramedEntityCardHeader>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    subtitle: 'Light',
  },
};

export const EyebrowLayout: Story = {
  args: {
    layout: 'eyebrow-first',
    subtitle: 'Kitchen zone',
  },
};

export const CompactSize: Story = {
  args: {
    size: 'extra-small',
    compact: true,
    subtitle: 'Script',
    title: 'Feed Mowgli',
  },
};

export const DenseSensor: Story = {
  args: {
    size: 'extra-small',
    compact: true,
    variant: 'dense',
    subtitle: 'Problem',
    title: 'Bedroom ceiling lights overview',
  },
};

export const LargeVariant: Story = {
  args: {
    size: 'large',
    variant: 'large',
    subtitle: '3 of 5 lights on · 48% average brightness',
    title: 'Kitchen',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
