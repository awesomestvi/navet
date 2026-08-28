import { Button } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import * as Dialog from '@radix-ui/react-dialog';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { DialogDoneFooter, DialogFooter, settingsDialogContentClass } from './dialog-primitives';

const meta = {
  title: 'Components/Primitives/DialogActions',
  component: DialogFooter,
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof DialogFooter>;

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

type Story = StoryObj<typeof DialogFooter>;

function DialogActionsStory() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Open dialog actions
      </Button>
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={`fixed inset-0 z-50 ${surface.dialogBackdrop}`} />
          <Dialog.Content
            className={settingsDialogContentClass(surface, {
              maxWidth: 'sm',
              padding: false,
            })}
          >
            <div className="space-y-4 p-4">
              <div className={`rounded-2xl border p-4 ${surface.border} ${surface.subtleBg}`}>
                <p className={`text-sm font-medium ${surface.textPrimary}`}>Kitchen lights</p>
                <p className={`mt-1 text-sm ${surface.textSecondary}`}>
                  Choose how this card behaves, then return to the dashboard.
                </p>
              </div>
              <DialogDoneFooter label="Done" />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

export const Default: Story = {
  render: () => <DialogActionsStory />,
};

export const SplitActions: Story = {
  render: () => (
    <DialogFooter>
      <Button variant="secondary">Back</Button>
      <Button>Save</Button>
    </DialogFooter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const backButton = canvas.getByRole('button', { name: 'Back' });
    const saveButton = canvas.getByRole('button', { name: 'Save' });
    const footer = backButton.parentElement;
    await expect(footer).toHaveClass('flex-nowrap', 'items-center', 'justify-end');
    await expect(backButton).toHaveClass('h-10');
    await expect(saveButton).toHaveClass('h-10');
  },
};
