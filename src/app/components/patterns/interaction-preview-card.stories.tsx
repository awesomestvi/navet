import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { useTheme } from '@/app/hooks';
import { InteractionPreviewCard } from './interaction-preview-card';

function ThemeAwareInteractionPreviewCard({
  mode,
}: Omit<ComponentProps<typeof InteractionPreviewCard>, 'accentColor' | 'theme'>) {
  const { theme, accentColor } = useTheme();

  return <InteractionPreviewCard mode={mode} theme={theme} accentColor={accentColor} />;
}

const meta = {
  title: 'Components/Patterns/Preview Cards',
  component: ThemeAwareInteractionPreviewCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Preview card patterns for settings surfaces, using the same visual language as real Navet cards.',
      },
    },
  },
  args: {
    mode: 'toggle-first',
  },
} satisfies Meta<typeof ThemeAwareInteractionPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToggleFirst: Story = {};

export const ControlFirst: Story = {
  args: {
    mode: 'control-first',
  },
};
