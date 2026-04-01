import type { Meta, StoryObj } from '@storybook/react';
import { Pause, Play, Settings2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { RoundControlButton } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function ThemeAwareRoundControlButton(
  props: Omit<ComponentProps<typeof RoundControlButton>, 'theme'>
) {
  const { theme } = useTheme();
  return <RoundControlButton {...props} theme={theme} />;
}

const meta = {
  title: 'Foundation/Primitives/Round Control Button',
  component: ThemeAwareRoundControlButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Round icon button primitive used by media, transport, and quick-control cards. Demonstrates neutral, soft, and emphasis variants by size.',
      },
    },
  },
  args: {
    variant: 'neutral',
    size: 'medium',
    'aria-label': 'Play',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof ThemeAwareRoundControlButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ControlsRow = {
  render: (args: Story['args']) => (
    <div className="flex flex-wrap items-center gap-4">
      <ThemeAwareRoundControlButton {...args} variant="neutral" aria-label="Settings">
        <Settings2 className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton {...args} variant="soft" aria-label="Pause">
        <Pause className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton {...args} variant="emphasis" aria-label="Play">
        <Play className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
    </div>
  ),
} as unknown as Story;

export const LargeControls = {
  render: (args: Story['args']) => (
    <div className="flex flex-wrap items-center gap-4">
      <ThemeAwareRoundControlButton {...args} size="large" variant="neutral" aria-label="Settings">
        <Settings2 className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton {...args} size="large" variant="soft" aria-label="Pause">
        <Pause className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton {...args} size="large" variant="emphasis" aria-label="Play">
        <Play className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
    </div>
  ),
} as unknown as Story;
