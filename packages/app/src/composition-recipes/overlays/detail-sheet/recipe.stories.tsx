import { DetailSheet as DetailSheetTemplate } from '@navet/app/composition-recipes/overlays/detail-sheet/template';
import { recipeDescription } from '@navet/app/composition-recipes/story-support';
import { BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

const meta = {
  title: 'Concepts/Composition recipes/Building blocks/Overlays/Detail sheet',
  tags: ['draft'],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function SheetExample({ responsive = false }: { responsive?: boolean }) {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={launcherRef} onClick={() => setOpen(true)}>
        Open device details
      </Button>
      <DetailSheetTemplate
        isOpen={open}
        returnFocusRef={launcherRef}
        onOpenChange={setOpen}
        title="Device details"
        closeLabel="Close device details"
        responsive={responsive}
      >
        <BodyText>Living room lamp</BodyText>
        <BodyText tone="muted">Connected</BodyText>
      </DetailSheetTemplate>
    </>
  );
}

export const PhoneOnly: Story = {
  parameters: recipeDescription('detail-sheet'),
  render: () => <SheetExample />,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    const launcher = canvas.getByRole('button', { name: 'Open device details' });
    await userEvent.click(launcher);
    const dialog = within(await within(document.body).findByRole('dialog'));
    await expect(dialog.getByText('Living room lamp')).toBeVisible();
    // Mobile dismissal is owned by the shell; desktop uses the direct-child header.
    const close = dialog.getAllByRole('button', { name: 'Close device details' });
    await userEvent.click(close[0]);
    await waitFor(() => expect(launcher).toHaveFocus());
  },
};

export const PhoneAndDesktop: Story = {
  ...PhoneOnly,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  render: () => <SheetExample responsive />,
};
