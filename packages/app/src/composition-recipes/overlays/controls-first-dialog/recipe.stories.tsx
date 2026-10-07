import { ControlsFirstDialog as ControlsFirstDialogTemplate } from '@navet/app/composition-recipes/overlays/controls-first-dialog/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText, Button, Switch } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
  title:
    'Concepts/Composition recipes/Building blocks/Overlays/Device dialog with secondary settings',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function DialogExample() {
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={launcherRef} onClick={() => setOpen(true)}>
        Open device controls
      </Button>
      <ControlsFirstDialogTemplate
        isOpen={open}
        returnFocusRef={launcherRef}
        onOpenChange={setOpen}
        title="Living room lamp"
        controlsLabel="Controls"
        settingsLabel="Settings"
        controls={
          <div className="flex items-center justify-between gap-4">
            <BodyText>Power</BodyText>
            <Switch aria-label="Power" checked={on} onCheckedChange={setOn} />
          </div>
        }
        settings={<BodyText>Card appearance</BodyText>}
      />
    </>
  );
}

export const ControlsFirstDialog: Story = {
  parameters: recipeDescription('controls-first-dialog'),
  render: () => <DialogExample />,
  play: async ({ canvas, userEvent }) => {
    const launcher = canvas.getByRole('button', { name: 'Open device controls' });
    await userEvent.click(launcher);
    const body = within(document.body);
    let dialog = within(await body.findByRole('dialog'));
    await expect(dialog.getByRole('switch', { name: 'Power' })).toBeVisible();
    await userEvent.click(dialog.getByRole('switch', { name: 'Power' }));
    await expect(dialog.getByRole('switch', { name: 'Power' })).toBeChecked();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(body.getByRole('menuitem', { name: 'Settings' }));
    await expect(dialog.getByText('Card appearance')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Back to controls' }));
    await expect(dialog.getByRole('switch', { name: 'Power' })).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(body.getByRole('menuitem', { name: 'Settings' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(launcher).toHaveFocus());
    await userEvent.click(launcher);
    dialog = within(await body.findByRole('dialog'));
    await expect(dialog.getByRole('switch', { name: 'Power' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};
