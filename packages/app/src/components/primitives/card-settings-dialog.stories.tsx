import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
import { Button } from './button';
import { CardSettingsDialog, type CardSettingsDialogTab } from './card-settings-dialog';

const meta = {
  title: 'Components/Primitives/CardSettingsDialog',
  component: CardSettingsDialog,
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CardSettingsDialog>;

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

type Story = StoryObj<typeof CardSettingsDialog>;

function CardSettingsDialogStory() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const tabs: CardSettingsDialogTab[] = [
    {
      key: 'controls',
      label: 'Controls',
      icon: Sliders,
      content: (
        <div className="space-y-3">
          <div className={`rounded-xl border p-3 ${surface.border} ${surface.subtleBg}`}>
            <p className={`text-sm font-medium ${surface.textPrimary}`}>Brightness: 75%</p>
          </div>
          <div className={`rounded-xl border p-3 ${surface.border} ${surface.subtleBg}`}>
            <p className={`text-sm font-medium ${surface.textPrimary}`}>Color temperature: 4000K</p>
          </div>
        </div>
      ),
    },
    {
      key: 'customize',
      label: 'Customize',
      icon: Palette,
      content: (
        <div className={`rounded-xl border p-3 ${surface.border} ${surface.subtleBg}`}>
          <p className={`text-sm font-medium ${surface.textPrimary}`}>
            Tint and presentation controls
          </p>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className={`rounded-xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
      >
        Open settings
      </Button>

      <CardSettingsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Light Settings"
        entityId="light.living_room"
        entityType="Light"
        tabs={tabs}
        theme={theme}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <CardSettingsDialogStory />,
  parameters: {
    docs: {
      description: {
        story: 'Basic card settings dialog with tabbed controls and customize content.',
      },
    },
  },
};
