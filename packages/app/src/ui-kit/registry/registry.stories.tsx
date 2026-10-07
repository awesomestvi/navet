import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import { BaseCard, BodyText, Button } from '@navet/app/ui-kit/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { CheckboxList as CheckboxListTemplate } from './checkbox-list';
import { CompactDeviceCard as CompactDeviceCardTemplate } from './compact-device-card';
import { ControlsFirstDialog as ControlsFirstDialogTemplate } from './controls-first-dialog';
import { DashboardGrouping as DashboardGroupingTemplate } from './dashboard-grouping';
import { DashboardSection as DashboardSectionTemplate } from './dashboard-section';
import { DetailSheet as DetailSheetTemplate } from './detail-sheet';
import { EmptyCard as EmptyCardTemplate } from './empty-card';
import { MetricActionRow as MetricActionRowTemplate } from './metric-action-row';
import { NavigationWorkspaceRecipe } from './navigation-workspace';
import recipes from './recipes.json';
import { SearchableSelection as SearchableSelectionTemplate } from './searchable-selection';
import { SettingsDialog as SettingsDialogTemplate } from './settings-dialog';
import { SettingsField as SettingsFieldTemplate } from './settings-field';
import { SettingsSection as SettingsSectionTemplate } from './settings-section';
import { SortableTable as SortableTableTemplate } from './sortable-table';
import { StatusFeedback as StatusFeedbackTemplate } from './status-feedback';
import { TabsRecipe } from './tabs';

const meta = {
  title: 'Concepts/Registry Recipes',
  parameters: {
    docs: {
      description: {
        component:
          'Editable Navet app compositions using existing Navet imports. Reference: docs/design-system/AGENT-COMPOSITION-RECIPES.md. Local callbacks demonstrate composition; features own commands and persistence.',
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

function SettingsSectionExample() {
  const [value, setValue] = useState('Lamp');
  return (
    <SettingsSectionTemplate
      title="Appearance"
      description="Names used in this household"
      fields={[
        {
          key: 'name',
          label: 'Display name',
          value,
          onValueChange: setValue,
          required: true,
          hint: 'Choose a household name',
          error: value.trim() ? undefined : 'Enter a display name',
        },
        {
          key: 'room',
          label: 'Assigned room',
          value: 'Living room',
          onValueChange: () => {},
          disabled: true,
        },
      ]}
    />
  );
}
export const SettingsSection: Story = {
  parameters: recipeDescription('settings-section'),
  render: () => <SettingsSectionExample />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: /Display name/ });
    await userEvent.click(canvas.getByText('Display name'));
    await expect(input).toHaveFocus();
    await expect(input).toBeRequired();
    await expect(canvas.getByRole('textbox', { name: 'Assigned room' })).toBeDisabled();
    await userEvent.clear(input);
    await expect(input).toHaveAccessibleDescription('Enter a display name');
    await userEvent.type(input, 'Desk');
    await expect(input).toHaveAccessibleDescription('Choose a household name');
  },
};
const selectionOptions = [
  { id: 'desk', label: 'Desk lamp' },
  { id: 'hall', label: 'Hall lamp — unavailable', disabled: true },
  { id: 'kitchen', label: 'Kitchen ceiling lamp with a long household name' },
];
function SelectionExample() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string>();
  return (
    <div className="max-w-md space-y-4">
      <SearchableSelectionTemplate
        label="Search devices"
        query={query}
        onQueryChange={setQuery}
        options={selectionOptions.filter((option) =>
          option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase())
        )}
        selectedId={selected}
        onSelect={(id) => {
          setSelected(id);
          setQuery(selectionOptions.find((option) => option.id === id)?.label ?? '');
        }}
        emptyLabel="No matching devices"
      />
      <SearchableSelectionTemplate
        label="Disabled search"
        query=""
        onQueryChange={() => {}}
        options={[]}
        onSelect={() => {}}
        emptyLabel="No devices"
        disabled
      />
      <BodyText>Selected: {selected ?? 'None'}</BodyText>
      <Button variant="soft">Next control</Button>
    </div>
  );
}
export const SearchableSelection: Story = {
  parameters: recipeDescription('searchable-selection'),
  render: () => <SelectionExample />,
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole('combobox', { name: 'Search devices' });
    await expect(canvas.getByRole('combobox', { name: 'Disabled search' })).toBeDisabled();
    await userEvent.click(input);
    await expect(canvas.getByRole('option', { name: /Hall lamp/ })).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    await expect(canvas.getByText('Selected: kitchen')).toBeVisible();
    await expect(input).toHaveFocus();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.clear(input);
    await userEvent.type(input, 'not present');
    await expect(canvas.getByText('No matching devices')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect(input).toHaveAttribute('aria-expanded', 'false');
    await userEvent.clear(input);
    await userEvent.type(input, 'Desk');
    await userEvent.click(canvas.getByRole('option', { name: 'Desk lamp' }));
    await expect(canvas.getByText('Selected: desk')).toBeVisible();
    await userEvent.click(input);
    await userEvent.tab();
    await expect(input).toHaveAttribute('aria-expanded', 'false');
  },
};
function CheckboxExample() {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-4">
      <CheckboxListTemplate
        label="Visible devices"
        emptyLabel="No devices"
        items={[
          { id: 'desk', label: 'Desk lamp', checked },
          {
            id: 'hall',
            label: 'Hall lamp',
            description: 'Unavailable',
            checked: true,
            disabled: true,
          },
        ]}
        onCheckedChange={(_, next) => setChecked(next)}
      />
      <CheckboxListTemplate
        label="Empty devices"
        emptyLabel="No matching devices"
        items={[]}
        onCheckedChange={() => {}}
      />
    </div>
  );
}
export const CheckboxList: Story = {
  parameters: recipeDescription('checkbox-list'),
  render: () => <CheckboxExample />,
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByRole('checkbox', { name: 'Desk lamp' });
    await userEvent.click(canvas.getByText('Desk lamp'));
    await expect(box).toBeChecked();
    box.focus();
    await userEvent.keyboard(' ');
    await expect(box).not.toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: /Hall lamp/ })).toBeDisabled();
    await expect(canvas.getByText('No matching devices')).toBeVisible();
  },
};
function SectionExample() {
  const [count, setCount] = useState(0);
  return (
    <div className="space-y-4">
      {(['populated', 'empty', 'unavailable'] as const).map((state) => (
        <DashboardSectionTemplate
          key={state}
          title={`Devices — ${state}`}
          state={state}
          emptyLabel="No devices selected"
          unavailableLabel="Devices unavailable"
          action={
            state === 'empty'
              ? undefined
              : { label: 'Refresh devices', onSelect: () => setCount(count + 1) }
          }
        >
          <BodyText>Refreshes: {count}</BodyText>
        </DashboardSectionTemplate>
      ))}
    </div>
  );
}
export const DashboardSection: Story = {
  parameters: recipeDescription('dashboard-section'),
  render: () => <SectionExample />,
  play: async ({ canvas, userEvent }) => {
    const actions = canvas.getAllByRole('button', { name: 'Refresh devices' });
    await expect(actions[1]).toBeDisabled();
    await userEvent.click(actions[0]);
    await expect(canvas.getByText('Refreshes: 1')).toBeVisible();
    await expect(canvas.getByText('No devices selected')).toBeVisible();
    await expect(canvas.getByText('Devices unavailable')).toBeVisible();
  },
};
function GroupingExample() {
  const [mode, setMode] = useState('room');
  const [item, setItem] = useState('all');
  return (
    <div className="space-y-4">
      <DashboardGroupingTemplate
        ariaLabel="Device groups"
        groupingLabel="Group by"
        items={[
          { id: 'all', label: 'All devices' },
          { id: 'attention', label: 'Needs attention', indicatorTone: 'attention' },
        ]}
        modes={[
          { id: 'room', label: 'Room' },
          { id: 'type', label: 'Type' },
        ]}
        selectedItemId={item}
        selectedModeId={mode}
        onItemChange={setItem}
        onModeChange={setMode}
        renderPanel={(id) => (
          <BodyText>
            {mode}: {id}
          </BodyText>
        )}
      />
      <DashboardGroupingTemplate
        ariaLabel="No grouping"
        groupingLabel="Group by"
        items={[]}
        modes={[]}
        selectedItemId=""
        selectedModeId=""
        onItemChange={() => {}}
        onModeChange={() => {}}
        renderPanel={() => null}
      />
    </div>
  );
}
export const DashboardGrouping: Story = {
  parameters: recipeDescription('dashboard-grouping'),
  render: () => <GroupingExample />,
  play: async ({ canvas, userEvent }) => {
    const all = canvas.getByRole('tab', { name: 'All devices' });
    all.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Needs attention' })).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('room: attention');
    await userEvent.keyboard('{Home}');
    await expect(all).toHaveFocus();
    const launcher = canvas.getByRole('button', { name: 'Group by: Room' });
    await userEvent.click(launcher);
    await userEvent.click(
      await within(document.body).findByRole('menuitemradio', { name: 'Type' })
    );
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('type: all');
    await waitFor(() => expect(launcher).toHaveFocus());
  },
};
function MetricExample() {
  const [active, setActive] = useState(false);
  return (
    <div className="flex flex-wrap gap-4">
      {(['small', 'medium', 'large'] as const).map((size, index) => (
        <EntityCardStoryFrame key={size} size={size}>
          <BaseCard size={size} title={`Power — ${size}`}>
            <MetricActionRowTemplate
              size={size}
              value={active ? '18 W' : '0 W'}
              label="Current power"
              active={active}
              accentClassName="text-current"
              action={
                index === 2
                  ? undefined
                  : {
                      label: 'Toggle power',
                      disabled: index === 1,
                      onSelect: () => setActive(!active),
                    }
              }
            />
          </BaseCard>
        </EntityCardStoryFrame>
      ))}
    </div>
  );
}
export const MetricActionRow: Story = {
  parameters: recipeDescription('metric-action-row'),
  render: () => <MetricExample />,
  play: async ({ canvas, userEvent }) => {
    const buttons = canvas.getAllByRole('button', { name: 'Toggle power' });
    await expect(buttons[1]).toBeDisabled();
    await userEvent.click(buttons[0]);
    await expect(canvas.getAllByText('18 W')).toHaveLength(3);
  },
};
export const StatusFeedback: Story = {
  parameters: recipeDescription('status-feedback'),
  render: () => (
    <div className="space-y-4">
      {(['loading', 'success', 'warning', 'error'] as const).map((state) => (
        <StatusFeedbackTemplate
          key={state}
          state={state}
          title={state}
          message={`Operation ${state}`}
        />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('status')).toHaveLength(3);
    await expect(canvas.getByRole('alert')).toHaveTextContent('Operation error');
  },
};
function TabsExample() {
  const [value, setValue] = useState('controls');
  return (
    <TabsRecipe
      label="Device pages"
      value={value}
      onValueChange={setValue}
      items={[
        { id: 'controls', label: 'Controls', content: <BodyText>Everyday controls</BodyText> },
        {
          id: 'unsupported',
          label: 'History unavailable',
          disabled: true,
          content: <BodyText>Unavailable history</BodyText>,
        },
        { id: 'settings', label: 'Settings', content: <BodyText>Configuration</BodyText> },
      ]}
    />
  );
}
export const Tabs: Story = {
  parameters: recipeDescription('tabs'),
  render: () => <TabsExample />,
  play: async ({ canvas, userEvent }) => {
    const controls = canvas.getByRole('tab', { name: 'Controls' });
    controls.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Configuration');
    await expect(canvas.getByRole('tab', { name: 'History unavailable' })).toBeDisabled();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(controls).toHaveFocus();
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Everyday controls');
  },
};
function WorkspaceExample() {
  const [selected, setSelected] = useState('room');
  return (
    <NavigationWorkspaceRecipe
      label="Settings workspace"
      selectedId={selected}
      onSelect={setSelected}
      items={[
        { id: 'room', label: 'Rooms', content: <BodyText>Room settings</BodyText> },
        {
          id: 'appearance',
          label: 'Appearance',
          content: <BodyText>Appearance settings</BodyText>,
        },
        {
          id: 'provider',
          label: 'Provider unavailable',
          disabled: true,
          content: <BodyText>Provider settings</BodyText>,
        },
      ]}
    />
  );
}
export const NavigationWorkspace: Story = {
  parameters: recipeDescription('navigation-workspace'),
  render: () => <WorkspaceExample />,
  play: async ({ canvas, userEvent }) => {
    const appearance = canvas.getByRole('button', { name: 'Appearance' });
    appearance.focus();
    await userEvent.keyboard('{Enter}');
    await expect(appearance).toHaveAttribute('aria-current', 'page');
    await expect(canvas.getByText('Appearance settings')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Provider unavailable' })).toBeDisabled();
  },
};
function TableExample() {
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>();
  const rows = [
    { id: 'kitchen', cells: { name: { primary: 'Kitchen lamp' }, room: { primary: 'Kitchen' } } },
    { id: 'desk', cells: { name: { primary: 'Desk lamp' }, room: { primary: 'Study' } } },
  ];
  if (sort)
    rows.sort(
      (a, b) =>
        a.cells.name.primary.localeCompare(b.cells.name.primary) *
        (sort.direction === 'asc' ? 1 : -1)
    );
  const columns = [
    { id: 'name', label: 'Name', sortLabel: 'Sort by name' },
    { id: 'room', label: 'Room', sortLabel: 'Sort by room', disabled: true },
  ];
  return (
    <div className="space-y-4">
      <SortableTableTemplate
        caption="Devices"
        emptyLabel="No devices"
        columns={columns}
        rows={rows}
        sort={sort}
        onSort={(column) =>
          setSort({ column, direction: sort?.direction === 'asc' ? 'desc' : 'asc' })
        }
      />
      <SortableTableTemplate
        caption="Empty devices"
        emptyLabel="No matching devices"
        columns={columns}
        rows={[]}
        onSort={() => {}}
      />
    </div>
  );
}
export const SortableTable: Story = {
  parameters: recipeDescription('sortable-table'),
  render: () => <TableExample />,
  play: async ({ canvas, userEvent }) => {
    const table = within(canvas.getByRole('table', { name: 'Devices' }));
    const sort = table.getByRole('button', { name: 'Sort by name' });
    sort.focus();
    await userEvent.keyboard('{Enter}');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending'
    );
    await expect(table.getAllByRole('row')[1]).toHaveTextContent('Desk lamp');
    await userEvent.keyboard(' ');
    await expect(table.getAllByRole('row')[1]).toHaveTextContent('Kitchen lamp');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'descending'
    );
    await expect(table.getByRole('button', { name: 'Sort by room' })).toBeDisabled();
    await expect(canvas.getByText('No matching devices')).toBeVisible();
  },
};
function NestedGroupingExample() {
  const [group, setGroup] = useState('all');
  const [tab, setTab] = useState('controls');
  return (
    <DashboardGroupingTemplate
      ariaLabel="Outer groups"
      groupingLabel="Group by"
      items={[
        { id: 'all', label: 'All devices' },
        { id: 'attention', label: 'Needs attention' },
      ]}
      modes={[{ id: 'room', label: 'Room' }]}
      selectedItemId={group}
      selectedModeId="room"
      onItemChange={setGroup}
      onModeChange={() => {}}
      renderPanel={() => (
        <TabsRecipe
          label="Nested device tabs"
          value={tab}
          onValueChange={setTab}
          items={[
            { id: 'controls', label: 'Controls', content: <BodyText>Nested controls</BodyText> },
            { id: 'settings', label: 'Settings', content: <BodyText>Nested settings</BodyText> },
          ]}
        />
      )}
    />
  );
}
export const NestedGroupingTabs: Story = {
  parameters: recipeDescription('dashboard-grouping'),
  render: () => <NestedGroupingExample />,
  play: async ({ canvas, userEvent }) => {
    const outer = within(canvas.getByRole('tablist', { name: 'Outer groups' }));
    const inner = within(canvas.getByRole('tablist', { name: 'Nested device tabs' }));
    inner.getByRole('tab', { name: 'Controls' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(inner.getByRole('tab', { name: 'Settings' })).toHaveFocus();
    await expect(outer.getByRole('tab', { name: 'All devices' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(outer.getByRole('tab', { name: 'Needs attention' })).toHaveAttribute(
      'tabindex',
      '-1'
    );
    outer.getByRole('tab', { name: 'All devices' }).focus();
    await userEvent.keyboard('{End}');
    await expect(outer.getByRole('tab', { name: 'Needs attention' })).toHaveFocus();
  },
};
const longName = 'Lámpara de lectura junto al sofá de la sala de estar';
export const LongLabels: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Caller-owned translated copy across narrow layouts; use all four themes and reduced motion.',
      },
    },
  },
  render: () => (
    <div className="space-y-4">
      <SettingsSectionTemplate
        title="Configuración de los dispositivos de la sala de estar"
        fields={[
          {
            key: 'name',
            label: longName,
            value: longName,
            onValueChange: () => {},
            error: 'El nombre debe ser único dentro de esta habitación',
            required: true,
          },
        ]}
      />
      <SearchableSelectionTemplate
        label="Buscar dispositivos disponibles en esta habitación"
        query=""
        onQueryChange={() => {}}
        options={[{ id: 'lamp', label: longName }]}
        onSelect={() => {}}
        emptyLabel="No hay dispositivos que coincidan con esta búsqueda"
      />
      <CheckboxListTemplate
        label="Dispositivos visibles"
        emptyLabel="Sin dispositivos"
        items={[
          {
            id: 'lamp',
            label: longName,
            checked: true,
            description: 'La selección se guarda en la configuración de esta habitación',
          },
        ]}
        onCheckedChange={() => {}}
      />
      <DashboardSectionTemplate
        title="Dispositivos de la sala de estar y el comedor"
        state="unavailable"
        emptyLabel="Sin dispositivos"
        unavailableLabel="Los dispositivos no están disponibles en este momento"
        action={{ label: 'Actualizar los dispositivos seleccionados', onSelect: () => {} }}
      >
        <BodyText>{longName}</BodyText>
      </DashboardSectionTemplate>
      <DashboardGroupingTemplate
        ariaLabel="Grupos de dispositivos"
        groupingLabel="Agrupar dispositivos por"
        selectedItemId="room"
        selectedModeId="room"
        items={[
          { id: 'room', label: 'Sala de estar y comedor compartidos' },
          { id: 'outside', label: 'Terraza y jardín de la planta baja' },
        ]}
        modes={[{ id: 'room', label: 'Habitación asignada' }]}
        onItemChange={() => {}}
        onModeChange={() => {}}
        renderPanel={() => <BodyText>{longName}</BodyText>}
      />
      <TabsRecipe
        label="Páginas de configuración"
        value="controls"
        onValueChange={() => {}}
        items={[
          {
            id: 'controls',
            label: 'Controles de uso diario',
            content: <BodyText>{longName}</BodyText>,
          },
          { id: 'settings', label: 'Configuración de este dispositivo', content: null },
        ]}
      />
      <NavigationWorkspaceRecipe
        label="Espacio de configuración"
        selectedId="room"
        onSelect={() => {}}
        items={[
          {
            id: 'room',
            label: 'Habitaciones y dispositivos compartidos',
            description: longName,
            content: <BodyText>{longName}</BodyText>,
          },
        ]}
      />
      <SortableTableTemplate
        caption="Dispositivos de esta habitación"
        emptyLabel="No hay dispositivos"
        columns={[
          {
            id: 'name',
            label: 'Nombre del dispositivo seleccionado',
            sortLabel: 'Ordenar por nombre del dispositivo',
          },
        ]}
        rows={[
          {
            id: 'lamp',
            cells: {
              name: { primary: longName, secondary: 'Sala de estar y comedor compartidos' },
            },
          },
        ]}
        onSort={() => {}}
      />
      <StatusFeedbackTemplate
        state="error"
        title="No se han guardado los cambios"
        message="Comprueba la conexión del dispositivo y vuelve a guardar la configuración. Tus cambios se conservan."
      />
      <div className="flex flex-wrap gap-4">
        <EntityCardStoryFrame size="small">
          <CompactDeviceCardTemplate
            title={longName}
            stateLabel="No disponible"
            unavailableLabel="No disponible"
            action={{ label: 'Encender la lámpara', onSelect: () => {} }}
          />
        </EntityCardStoryFrame>
        <EntityCardStoryFrame size="large">
          <EmptyCardTemplate
            size="large"
            title="Sin dispositivos seleccionados"
            description="Elige los dispositivos que quieres mostrar en esta habitación"
          />
        </EntityCardStoryFrame>
        <EntityCardStoryFrame size="medium">
          <BaseCard size="medium" title={longName}>
            <MetricActionRowTemplate
              size="medium"
              value="1.234 W"
              label="Consumo de energía de los dispositivos seleccionados"
              active={false}
              accentClassName="text-current"
              action={{ label: 'Activar dispositivo', onSelect: () => {} }}
            />
          </BaseCard>
        </EntityCardStoryFrame>
      </div>
    </div>
  ),
};
function LongOverlayExample({ sheet = false }: { sheet?: boolean }) {
  const [open, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const content = (
    <div className="space-y-4">
      <SettingsFieldTemplate
        label={longName}
        value={longName}
        onValueChange={() => {}}
        hint="Nombre utilizado por las personas que comparten esta habitación"
      />
      {Array.from({ length: 12 }, (_, index) => (
        <BodyText key={index}>{longName}</BodyText>
      ))}
    </div>
  );
  return (
    <>
      <Button ref={launcher} onClick={() => setOpen(true)}>
        Open long content
      </Button>
      {sheet ? (
        <DetailSheetTemplate
          isOpen={open}
          onOpenChange={setOpen}
          returnFocusRef={launcher}
          title={longName}
          closeLabel="Cerrar los detalles del dispositivo"
          responsive
        >
          {content}
        </DetailSheetTemplate>
      ) : (
        <SettingsDialogTemplate
          isOpen={open}
          title={longName}
          saveLabel="Guardar la configuración"
          cancelLabel="Cancelar los cambios"
          pending={false}
          canSave={false}
          returnFocusRef={launcher}
          onRequestClose={() => setOpen(false)}
          onSave={() => {}}
        >
          {content}
        </SettingsDialogTemplate>
      )}
    </>
  );
}
export const LongLabelsDialog: Story = { render: () => <LongOverlayExample /> };
export const LongLabelsSheet: Story = { render: () => <LongOverlayExample sheet /> };
