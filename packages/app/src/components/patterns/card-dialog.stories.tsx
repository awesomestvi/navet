import { Button, settingsDialogContentClass } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import * as Dialog from '@radix-ui/react-dialog';
import type { Meta, StoryObj } from '@storybook/react';
import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
import {
  CardDialogBody,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from './card-dialog';

const meta = {
  title: 'Components/Patterns/CardDialog',
  component: CardDialogHeader,
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CardDialogHeader>;

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

type Story = StoryObj<typeof CardDialogHeader>;

function CardDialogPatternStory() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'customize'>('controls');
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Open card dialog pattern
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={`fixed inset-0 z-50 ${surface.dialogBackdrop}`} />
          <Dialog.Content
            className={settingsDialogContentClass(surface, {
              maxWidth: 'md',
              padding: false,
            })}
          >
            <CardDialogBody>
              <CardDialogHeader
                title="Light settings"
                description="Pattern primitives for entity settings layouts"
                entityId="light.living_room"
              />
              <CardDialogTabList>
                <CardDialogTabTrigger
                  active={activeTab === 'controls'}
                  icon={Sliders}
                  onClick={() => setActiveTab('controls')}
                >
                  Controls
                </CardDialogTabTrigger>
                <CardDialogTabTrigger
                  active={activeTab === 'customize'}
                  icon={Palette}
                  onClick={() => setActiveTab('customize')}
                >
                  Customize
                </CardDialogTabTrigger>
              </CardDialogTabList>
              <CardDialogSection label={activeTab === 'controls' ? 'Controls' : 'Customize'}>
                <div className={`rounded-2xl border p-4 ${surface.border} ${surface.subtleBg}`}>
                  <p className={`text-sm ${surface.textPrimary}`}>
                    {activeTab === 'controls'
                      ? 'Primary controls content'
                      : 'Presentation and tint controls'}
                  </p>
                </div>
              </CardDialogSection>
              <CardDialogDoneFooter label="Done" />
            </CardDialogBody>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export const Default: Story = {
  render: () => <CardDialogPatternStory />,
};
