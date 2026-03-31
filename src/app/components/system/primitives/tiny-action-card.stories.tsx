import type { Meta, StoryObj } from '@storybook/react';
import { Bolt, Sparkles } from 'lucide-react';
import type { ComponentProps } from 'react';
import { TinyActionCard } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function ThemeAwareTinyActionCard(props: Omit<ComponentProps<typeof TinyActionCard>, 'watermark'>) {
  const { theme, accentColor } = useTheme();
  const cardSurfaceClassName =
    theme === 'light'
      ? 'border-black/10 bg-white/95 text-slate-900'
      : theme === 'contrast'
        ? 'border-white/18 bg-black text-white'
        : 'border-white/12 bg-white/6 text-white';
  const watermarkClassName = theme === 'light' ? 'text-slate-900/10' : 'text-white/10';

  return (
    <TinyActionCard
      {...props}
      rootClassName={`group relative h-40 w-56 overflow-hidden rounded-[20px] border p-3 backdrop-blur-xl ${cardSurfaceClassName}`}
      contentClassName="gap-2"
      metadataClassName="text-[10px] uppercase tracking-[0.2em] text-white/60"
      titleClassName="text-[12px]"
      detailClassName="text-white/70"
      watermark={
        <Sparkles
          aria-hidden="true"
          className={`pointer-events-none absolute -right-3 -top-3 h-20 w-20 ${watermarkClassName}`}
          style={{ color: `${accentColor}55` }}
        />
      }
    />
  );
}

const meta = {
  title: 'Primitives/Tiny Action Card',
  component: ThemeAwareTinyActionCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Tiny card composition primitive for compact quick actions. Exposes slots for watermark, metadata/title stack, and optional click-overlay behavior.',
      },
    },
  },
  args: {
    metadata: 'Quick action',
    title: 'Movie mode',
    detail: 'Living room lights + blinds',
    children: (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/80">
        <Bolt className="h-3 w-3" />
        Tap to run
      </div>
    ),
  },
  argTypes: {
    actionButtonProps: { control: false },
  },
} satisfies Meta<typeof ThemeAwareTinyActionCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { rootClassName: '' },
};

export const ClickableOverlay: Story = {
  args: {
    rootClassName: '',
    actionButtonProps: {
      'aria-label': 'Run movie mode',
      className: 'cursor-pointer',
      onClick: () => undefined,
    },
  },
};
