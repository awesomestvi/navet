import type { Meta, StoryObj } from '@storybook/react';
import { ArrowRight, MoreHorizontal, Pause, Play, Plus, Search, Settings2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTheme } from '@/app/hooks';
import { Button } from './button';
import { IconButton } from './icon-button';
import { RoundControlButton } from './round-control-button';

function ThemeAwareRoundControlButton(
  props: Omit<ComponentProps<typeof RoundControlButton>, 'theme'>
) {
  const { theme } = useTheme();
  return <RoundControlButton {...props} theme={theme} />;
}

const meta = {
  title: 'Components/Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save changes',
    variant: 'primary',
    loading: false,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Standard action button for forms and dialogs. Keep usage to clear action intent; do not stretch this into segmented controls or card-specific icon treatments.',
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
  },
};

export const WithIcons: Story = {
  args: {
    leading: <Plus className="h-4 w-4" />,
    trailing: <ArrowRight className="h-4 w-4" />,
    children: 'Create room',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const IconDefault: Story = {
  render: () => <IconButton label="Open settings" icon={<Settings2 className="h-4 w-4" />} />,
} as unknown as Story;

export const IconSmall: Story = {
  render: () => <IconButton size="small" label="Search" icon={<Search className="h-4 w-4" />} />,
} as unknown as Story;

export const IconGhost: Story = {
  render: () => (
    <IconButton
      variant="ghost"
      label="More actions"
      icon={<MoreHorizontal className="h-4 w-4" />}
    />
  ),
} as unknown as Story;

export const IconLoading: Story = {
  render: () => <IconButton loading label="Loading" icon={<Settings2 className="h-4 w-4" />} />,
} as unknown as Story;

export const RoundButtons = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <ThemeAwareRoundControlButton variant="neutral" aria-label="Settings">
        <Settings2 className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton variant="soft" aria-label="Pause">
        <Pause className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton variant="emphasis" aria-label="Play">
        <Play className="h-4 w-4" />
      </ThemeAwareRoundControlButton>
    </div>
  ),
} as unknown as Story;

export const RoundButtonsLarge = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <ThemeAwareRoundControlButton size="large" variant="neutral" aria-label="Settings">
        <Settings2 className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton size="large" variant="soft" aria-label="Pause">
        <Pause className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
      <ThemeAwareRoundControlButton size="large" variant="emphasis" aria-label="Play">
        <Play className="h-5 w-5" />
      </ThemeAwareRoundControlButton>
    </div>
  ),
} as unknown as Story;
