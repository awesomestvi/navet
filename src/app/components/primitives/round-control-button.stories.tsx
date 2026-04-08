import type { Meta, StoryObj } from '@storybook/react';
import { MoreHorizontal, SunMedium } from 'lucide-react';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { RoundControlButton } from './round-control-button';

function ThemeAwareRoundControlButton(
  args: Omit<React.ComponentProps<typeof RoundControlButton>, 'theme'>
) {
  const { theme } = useTheme();
  return <RoundControlButton {...args} theme={theme} />;
}

const meta = {
  title: 'Components/Primitives/Round Control Button',
  component: ThemeAwareRoundControlButton,
  tags: ['autodocs'],
  args: {
    size: 'medium',
    variant: 'soft',
    children: <SunMedium className="h-4 w-4" />,
    'aria-label': 'Brightness control',
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof ThemeAwareRoundControlButton>;

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

export const Soft: Story = {};

export const Neutral: Story = {
  args: {
    variant: 'neutral',
    children: <MoreHorizontal className="h-4 w-4" />,
    'aria-label': 'More actions',
  },
};

export const Emphasis: Story = {
  args: {
    variant: 'emphasis',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
