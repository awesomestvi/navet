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
  title: 'Components/Patterns/Interaction Preview Card',
  component: ThemeAwareInteractionPreviewCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Pattern card used to preview interaction ordering (toggle-first versus control-first) before applying settings in production card UIs.',
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
