import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { BaseCard } from './base-card';
import { CardShell } from './card-shell';

const meta = {
  title: 'Components/Primitives/CardShell',
  component: CardShell,
  parameters: { docs: { description: {} } },
  argTypes: {
    children: { control: 'text' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof CardShell>;

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

type Story = StoryObj<typeof CardShell>;

function CardShellStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="grid gap-4 p-4">
      <CardShell
        size="small"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Small Card Shell</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>Basic shell primitive</p>
      </CardShell>

      <CardShell
        size="medium"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Medium Card Shell</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>With more content space</p>
      </CardShell>

      <CardShell
        size="large"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Large Card Shell</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>Maximum content area</p>
      </CardShell>
    </div>
  );
}

export const Default: Story = {
  render: () => <CardShellStory />,
  parameters: {
    docs: {
      description: {
        story: 'Basic card shell primitive in different sizes',
      },
    },
  },
};

function CardShellWithBaseCardStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="grid gap-4 p-4">
      <BaseCard
        size="small"
        frameClassName={`${surface.panel} ${surface.border} border rounded-2xl`}
      >
        <div className="p-4">
          <p className={`text-sm font-medium ${surface.textPrimary}`}>Base Card</p>
          <p className={`mt-1 text-xs ${surface.textMuted}`}>With shell primitive</p>
        </div>
      </BaseCard>
    </div>
  );
}

export const WithBaseCard: Story = {
  render: () => <CardShellWithBaseCardStory />,
  parameters: {
    docs: {
      description: {
        story: 'Card shell used with BaseCard component',
      },
    },
  },
};
