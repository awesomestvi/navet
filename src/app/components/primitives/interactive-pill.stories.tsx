import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { useTheme } from '@/app/hooks';
import { InteractivePill } from './interactive-pill';

function PillRow({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const wrapperClassName =
    theme === 'light'
      ? 'border-gray-200/80 bg-gray-50/90'
      : theme === 'black'
        ? 'border-white/16 bg-black'
        : theme === 'glass'
          ? 'border-white/16 bg-white/[0.08]'
          : 'border-white/10 bg-white/[0.05]';

  return (
    <div className={`inline-flex flex-wrap rounded-full border p-1 ${wrapperClassName}`}>
      {children}
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Interactive Pill',
  component: InteractivePill,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Canonical selectable pill primitive for Navet.',
          '',
          'This is the standard pill language used by the current Settings `Theme mode` selector and the rest of the updated selection rows across the app.',
          '',
          'What makes this the standard:',
          '- Theme-aware idle and active states come from the same token system used by the shared appearance picker.',
          '- The active treatment is intentionally subtle: accented border plus tinted fill instead of a flat solid button treatment.',
          '- The primitive is designed to live inside grouped rows or compact pill clusters, not as a heavy segmented control.',
          '',
          'Usage guidance:',
          '- Use for compact choices such as theme mode, language, time format, temperature unit, and similar binary or short-option selections.',
          '- Use `active` to mark the selected value.',
          '- Keep labels short so the row stays readable and balanced.',
          '',
          'Review expectations:',
          '- Check idle borders in light mode.',
          '- Check active pills in glass, dark, light, and black themes.',
          '- Prefer this primitive over inventing one-off pill styles in feature code.',
        ].join('\n'),
      },
    },
  },
  args: {
    children: 'English',
    active: false,
    intent: 'navigation',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof InteractivePill>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ThemeModeRow: Story = {
  render: (args) => (
    <PillRow>
      <InteractivePill {...args}>Liquid Glass</InteractivePill>
      <InteractivePill {...args} active>
        Dark
      </InteractivePill>
      <InteractivePill {...args}>Light</InteractivePill>
      <InteractivePill {...args}>Black</InteractivePill>
    </PillRow>
  ),
};

export const LanguageRow: Story = {
  render: (args) => (
    <PillRow>
      <InteractivePill {...args}>English</InteractivePill>
      <InteractivePill {...args}>Svenska</InteractivePill>
      <InteractivePill {...args} active>
        Deutsch
      </InteractivePill>
      <InteractivePill {...args}>Français</InteractivePill>
      <InteractivePill {...args}>Espanol</InteractivePill>
    </PillRow>
  ),
};

export const ActionPills: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <InteractivePill {...args} intent="action">
        Back
      </InteractivePill>
      <InteractivePill {...args} active intent="action">
        Continue
      </InteractivePill>
    </div>
  ),
};
