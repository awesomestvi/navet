import { StatusFeedback as StatusFeedbackTemplate } from '@navet/app/composition-recipes/feedback/status-feedback/template';
import { SettingsDialog as SettingsDialogTemplate } from '@navet/app/composition-recipes/forms/settings-dialog/template';
import { SettingsField as SettingsFieldTemplate } from '@navet/app/composition-recipes/forms/settings-field/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Forms/Form modal with save and cancel',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function SettingsDialogExample({ initiallyPending = false }: { initiallyPending?: boolean }) {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('Reading lamp');
  const [saved, setSaved] = useState('Reading lamp');
  const [pending, setPending] = useState(initiallyPending);
  const [error, setError] = useState<string>();
  const [discard, setDiscard] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  return (
    <>
      <Button
        ref={launcherRef}
        onClick={() => {
          setValue(saved);
          setError(undefined);
          setDiscard(false);
          setOpen(true);
        }}
      >
        Edit settings
      </Button>
      <BodyText>Saved name: {saved}</BodyText>
      <SettingsDialogTemplate
        isOpen={open}
        title="Card settings"
        saveLabel="Save settings"
        cancelLabel="Cancel changes"
        pending={pending}
        canSave={Boolean(value.trim()) && value !== saved}
        returnFocusRef={launcherRef}
        onRequestClose={() => {
          if (pending) return;
          if (value !== saved) setDiscard(true);
          else setOpen(false);
        }}
        onSave={() => {
          setPending(true);
          setError(undefined);
          window.setTimeout(() => {
            setPending(false);
            if (!failedOnce) {
              setFailedOnce(true);
              setError('Save failed. Your edits are preserved.');
            } else {
              setSaved(value);
              setOpen(false);
            }
          }, 400);
        }}
      >
        <SettingsFieldTemplate
          label="Card name"
          value={value}
          onValueChange={setValue}
          required
          error={value.trim() ? undefined : 'Enter a card name'}
        />
        {error ? <StatusFeedbackTemplate state="error" message={error} /> : null}
        {discard ? (
          <div className="mt-4 space-y-2">
            <BodyText>Discard unsaved changes?</BodyText>
            <Button type="button" variant="soft" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              Discard changes
            </Button>
          </div>
        ) : null}
      </SettingsDialogTemplate>
    </>
  );
}
export const SettingsDialog: Story = {
  parameters: recipeDescription('settings-dialog'),
  render: () => <SettingsDialogExample />,
  play: async ({ canvas, userEvent }) => {
    const launcher = canvas.getByRole('button', { name: 'Edit settings' });
    await userEvent.click(launcher);
    const body = within(document.body);
    let dialog = within(await body.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    const input = dialog.getByRole('textbox', { name: /Card name/ });
    await userEvent.clear(input);
    await expect(input).toHaveAccessibleDescription('Enter a card name');
    await userEvent.type(input, 'Desk lamp');
    await userEvent.keyboard('{Escape}');
    await expect(dialog.getByText('Discard unsaved changes?')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Keep editing' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Save settings' }));
    await expect(input).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await expect(body.getByRole('dialog')).toBeVisible();
    await expect(await dialog.findByRole('alert')).toHaveTextContent('Save failed');
    await expect(input).toHaveValue('Desk lamp');
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel changes' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(launcher).toHaveFocus());
    await expect(canvas.getByText('Saved name: Reading lamp')).toBeVisible();
    await userEvent.click(launcher);
    dialog = within(await body.findByRole('dialog'));
    await userEvent.clear(dialog.getByRole('textbox', { name: /Card name/ }));
    await userEvent.type(dialog.getByRole('textbox', { name: /Card name/ }), 'Desk lamp');
    await userEvent.click(dialog.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(launcher).toHaveFocus());
    await expect(canvas.getByText('Saved name: Desk lamp')).toBeVisible();
    await userEvent.click(launcher);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(launcher).toHaveFocus());
  },
};
export const PendingSettingsDialog: Story = {
  parameters: recipeDescription('settings-dialog'),
  render: () => <SettingsDialogExample initiallyPending />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit settings' }));
    const body = within(document.body);
    const dialog = within(await body.findByRole('dialog'));
    await expect(dialog.getByRole('button', { name: 'Cancel changes' })).toBeDisabled();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.getByRole('dialog')).toBeVisible());
  },
};
