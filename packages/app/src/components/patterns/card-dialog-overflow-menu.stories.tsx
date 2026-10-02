import { BaseCardDialog, Button } from '@navet/app/components/primitives';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
import { expect, within } from 'storybook/test';
import { CardDialogOverflowMenu } from './card-dialog-overflow-menu';

const meta = {
  title: 'Components/Patterns/CardDialogOverflowMenu',
  component: CardDialogOverflowMenu,
  parameters: {
    docs: {
      description: {
        component: getStoryDocsDescription('Components/Patterns/CardDialogOverflowMenu'),
      },
    },
  },
} satisfies Meta<typeof CardDialogOverflowMenu>;
export default meta;
type Story = StoryObj<typeof CardDialogOverflowMenu>;

function ControlsFirstDialogStory() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Living room light');
  const [room, setRoom] = useState('Living room');
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open controls-first dialog</Button>
      <BaseCardDialog
        isOpen={open}
        onOpenChange={setOpen}
        title={title}
        onTitleChange={setTitle}
        theme={theme}
        navigation="overflow"
        height="capped"
        roomSelector={{
          value: room,
          label: room,
          options: [
            { value: 'Living room', label: 'Living room' },
            { value: 'Kitchen', label: 'Kitchen' },
          ],
          onChange: setRoom,
        }}
        tabs={[
          {
            key: 'controls',
            label: 'Controls',
            icon: Sliders,
            content: <p>Brightness 68% · Warm white</p>,
          },
          { key: 'customize', label: 'Customize', icon: Palette, content: <p>Card appearance</p> },
        ]}
      />
    </>
  );
}

export const ControlsFirst: Story = {
  render: () => <ControlsFirstDialogStory />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open controls-first dialog' }));
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByText('Brightness 68% · Warm white')).toBeVisible();
    await expect(dialog.queryByRole('button', { name: 'Customize' })).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(within(document.body).getByRole('menuitem', { name: 'Edit card name' }));
    const title = await dialog.findByRole('textbox');
    await expect(title).toHaveFocus();
    await userEvent.clear(title);
    await userEvent.type(title, 'Reading lamp{Enter}');
    await expect(dialog.getByRole('heading', { name: 'Reading lamp' })).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(within(document.body).getByRole('menuitem', { name: 'Customize' }));
    await expect(dialog.getByText('Card appearance')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Back to controls' }));
    await expect(dialog.getByText('Brightness 68% · Warm white')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(within(document.body).getByRole('menuitem', { name: 'Edit room' }));
    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Room' }), 'Kitchen');
    await userEvent.click(dialog.getByRole('button', { name: 'Done' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Open controls-first dialog' }));
    const reopened = within(await within(document.body).findByRole('dialog'));
    await expect(reopened.getByText('Brightness 68% · Warm white')).toBeVisible();
    await expect(
      within(
        reopened.getByRole('heading', { name: 'Reading lamp' }).closest('header') as HTMLElement
      ).getByText('Kitchen')
    ).toBeVisible();
  },
};

export const MobileControlsFirst: Story = {
  ...ControlsFirst,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
