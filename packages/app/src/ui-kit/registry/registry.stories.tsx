import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import { BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { CompactDeviceCard as CompactDeviceCardTemplate } from './compact-device-card';
import { ControlsFirstDialog as ControlsFirstDialogTemplate } from './controls-first-dialog';
import { DetailSheet as DetailSheetTemplate } from './detail-sheet';
import { EmptyCard as EmptyCardTemplate } from './empty-card';
import recipes from './recipes.json';
import { SettingsField as SettingsFieldTemplate } from './settings-field';

const meta = {
  title: 'Concepts/Registry Recipes',
  parameters: {
    docs: {
      description: {
        component:
          'Pilot compositions using existing Navet imports. Reference: docs/design-system/AGENT-COMPOSITION-RECIPES.md. Local callbacks demonstrate composition; features own commands and persistence.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function recipeDescription(name: string) {
  const recipe = recipes.find((recipe) => recipe.name === name);
  return {
    docs: { description: { story: `${recipe?.description} Reference: ${recipe?.reference}` } },
  };
}

function DialogExample() {
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
        controls={<BodyText>Brightness 68%</BodyText>}
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
    await expect(dialog.getByText('Brightness 68%')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(body.getByRole('menuitem', { name: 'Settings' }));
    await expect(dialog.getByText('Card appearance')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'Back to controls' }));
    await expect(dialog.getByText('Brightness 68%')).toBeVisible();
    await userEvent.click(dialog.getByRole('button', { name: 'More actions' }));
    await userEvent.click(body.getByRole('menuitem', { name: 'Settings' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(launcher).toHaveFocus());
    await userEvent.click(launcher);
    dialog = within(await body.findByRole('dialog'));
    await expect(dialog.getByText('Brightness 68%')).toBeVisible();
    await userEvent.keyboard('{Escape}');
  },
};

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

export const DetailSheet: Story = {
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

export const ResponsiveDetailSheet: Story = {
  ...DetailSheet,
  globals: { viewport: { value: 'desktop', isRotated: false } },
  render: () => <SheetExample responsive />,
};

function FieldExample() {
  const [value, setValue] = useState('Reading lamp');
  return (
    <div className="max-w-sm space-y-4">
      <SettingsFieldTemplate
        label="Card name"
        value={value}
        onValueChange={setValue}
        required
        hint="Use a household name"
        error={value.trim() ? undefined : 'Enter a card name'}
      />
      <SettingsFieldTemplate
        label="Room name"
        value="Living room"
        onValueChange={() => {}}
        disabled
        hint="Choose a room in settings"
      />
    </div>
  );
}

export const SettingsField: Story = {
  parameters: recipeDescription('settings-field'),
  render: () => <FieldExample />,
  play: async ({ canvas, userEvent }) => {
    const name = canvas.getByRole('textbox', { name: /Card name/ });
    const room = canvas.getByRole('textbox', { name: /Room name/ });
    await expect(name).toBeRequired();
    await expect(name).toHaveAccessibleDescription('Use a household name');
    await expect(room).toBeDisabled();
    await expect(name.id).not.toBe(room.id);
    await userEvent.click(canvas.getByText('Card name'));
    await expect(name).toHaveFocus();
    await userEvent.clear(name);
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Enter a card name');
    await userEvent.type(name, 'Desk lamp');
    await expect(name).toHaveAccessibleDescription('Use a household name');
  },
};

function EmptyExample() {
  const [configured, setConfigured] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      {(['small', 'medium', 'large'] as const).map((size) => (
        <EntityCardStoryFrame key={size} size={size}>
          <EmptyCardTemplate
            size={size}
            title={configured ? 'Feeds selected' : 'No feeds selected'}
            description="Choose feeds for this card"
            action={
              size === 'small'
                ? { label: 'Choose feeds', onSelect: () => setConfigured(true) }
                : undefined
            }
          />
        </EntityCardStoryFrame>
      ))}
    </div>
  );
}

export const EmptyCard: Story = {
  parameters: recipeDescription('empty-card'),
  render: () => <EmptyExample />,
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Choose feeds' }));
    await expect(canvas.getAllByText('Feeds selected')).toHaveLength(3);
  },
};

function CompactExample() {
  const [on, setOn] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      <EntityCardStoryFrame size="small">
        <CompactDeviceCardTemplate
          title="Reading lamp"
          room="Living room"
          active={on}
          stateLabel={on ? 'On' : 'Off'}
          action={{ label: on ? 'Turn off' : 'Turn on', onSelect: () => setOn(!on) }}
        />
      </EntityCardStoryFrame>
      <EntityCardStoryFrame size="small">
        <CompactDeviceCardTemplate
          title="Hall lamp"
          stateLabel="Off"
          unavailableLabel="Unavailable"
          action={{ label: 'Turn on', onSelect: () => {} }}
        />
      </EntityCardStoryFrame>
      <EntityCardStoryFrame size="small">
        <CompactDeviceCardTemplate title="Outside temperature" stateLabel="12 °C" />
      </EntityCardStoryFrame>
    </div>
  );
}

export const CompactDeviceCard: Story = {
  parameters: recipeDescription('compact-device-card'),
  render: () => <CompactExample />,
  play: async ({ canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Turn on' });
    await expect(buttons[1]).toBeDisabled();
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(buttons[0]);
    await expect(canvas.getByRole('button', { name: 'Turn off' })).toBeEnabled();
    await expect(canvas.getByText('On', { exact: true })).toBeVisible();
  },
};
