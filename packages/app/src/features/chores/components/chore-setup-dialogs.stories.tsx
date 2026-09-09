import { createChoreDemoWorkspace } from '@navet/app/features/chores/chore-demo-fixture';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fireEvent, fn, userEvent, within } from 'storybook/test';
import {
  AddChoreDialog,
  AddPersonDialog,
  ChoreManagementPinDialog,
  ChoreManagementPinEditorDialog,
} from './chore-setup-dialogs';

const workspace = createChoreDemoWorkspace({
  copy: {
    dishwasher: 'Unload dishwasher',
    toys: 'Toys back home',
    hallway: 'Shoes and jackets',
    laundry: 'Fold clean laundry',
    plants: 'Water the plants',
    bins: 'Take out recycling',
    missionTitle: 'Saturday reset',
    missionDescription: 'Reset the shared spaces.',
    upcomingMissionTitle: 'Evening tidy up',
    upcomingMissionDescription: 'A quick reset before bedtime.',
    rewardTitle: 'Choose a family outing',
    secondRewardTitle: 'Build a new LEGO set',
    childDishwasher: 'Dishwasher rescue',
    childToys: 'Toys back to base',
    childHallway: 'Clear the launch pad',
    kitchen: 'Kitchen',
    bedroom: 'Bedroom',
    hallwayRoom: 'Hallway',
    livingRoom: 'Living room',
  },
});
const saveChore = fn(async () => false);
const saveEditedChore = fn(async () => false);
const saveManagementPin = fn(async () => true);

function ChoreCreationStory() {
  return (
    <AddChoreDialog
      isOpen
      onOpenChange={fn()}
      participants={Object.values(workspace.participantsById)}
      rooms={[
        { canonicalId: 'room:kitchen', label: 'Kitchen' },
        { canonicalId: 'room:bedroom', label: 'Bedroom' },
      ]}
      onSave={saveChore}
    />
  );
}

function ChoreEditingStory() {
  return (
    <AddChoreDialog
      definition={workspace.definitionsById.dishwasher}
      presentation={workspace.experience?.presentationByDefinitionId.dishwasher}
      isOpen
      onOpenChange={fn()}
      participants={Object.values(workspace.participantsById)}
      onSave={saveEditedChore}
    />
  );
}

function ChoreTemplateRefreshStory() {
  const [participants, setParticipants] = useState(() => Object.values(workspace.participantsById));
  return (
    <>
      <button
        data-testid="refresh-workspace"
        type="button"
        onClick={() =>
          setParticipants((current) => current.map((participant) => ({ ...participant })))
        }
      >
        Refresh workspace
      </button>
      <AddChoreDialog isOpen onOpenChange={fn()} participants={participants} onSave={saveChore} />
    </>
  );
}

function PersonCreationStory() {
  return <AddPersonDialog isOpen onOpenChange={fn()} onSave={async () => true} />;
}

function ManagementUnlockStory() {
  return (
    <ChoreManagementPinDialog
      isOpen
      error="Unlock chore management to continue"
      onOpenChange={fn()}
      onUnlock={async () => false}
    />
  );
}

function ManagementPinEditorStory() {
  return (
    <ChoreManagementPinEditorDialog
      configured
      isOpen
      onOpenChange={fn()}
      onSave={saveManagementPin}
    />
  );
}

const meta = {
  title: 'Pages/Household/Add Chore Dialog',
  component: ChoreCreationStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Add and Edit Chore use the same continuous three-part flow as onboarding, with a compact identity preview and contextual More options disclosures inside each section.',
      },
    },
  },
} satisfies Meta<typeof ChoreCreationStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopDetails: Story = {};

export const TemplateSelectionSurvivesWorkspaceRefresh: Story = {
  render: () => <ChoreTemplateRefreshStory />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = body.getByRole('dialog', { name: 'Add a chore' });
    const template = within(dialog).getByRole('button', { name: 'Unload dishwasher' });
    await userEvent.click(template);
    await expect(template).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(
      canvasElement.querySelector('[data-testid="refresh-workspace"]') as HTMLElement
    );
    await expect(within(dialog).getByRole('button', { name: 'Unload dishwasher' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(within(dialog).getByLabelText('Chore name')).toHaveValue('Unload dishwasher');
  },
};

export const MobileContinuousEditor: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await expect(dialog).toHaveClass(
      'max-sm:!h-[80dvh]',
      'max-sm:!rounded-t-[30px]',
      'max-sm:!rounded-b-none',
      'max-sm:!bottom-0'
    );
    await expect(dialog).toHaveClass('max-sm:!overflow-y-auto', 'max-sm:overscroll-contain');
    await expect(dialog.querySelector('form')).toHaveClass('max-sm:h-auto', 'max-sm:min-h-full');
    await expect(dialog.querySelector('header')).toHaveClass('py-3', 'sm:py-4');
    await expect(dialog.querySelector('main')?.parentElement).toHaveClass(
      'max-sm:flex-none',
      'max-sm:overflow-visible'
    );
    await expect(
      within(canvasElement.ownerDocument.body).getByRole('button', {
        name: 'Drag dialog to fullscreen or close',
      })
    ).toBeInTheDocument();
    await expect(
      within(dialog).getAllByRole('heading', { name: 'The chore' })[0]
    ).toBeInTheDocument();
    await expect(within(dialog).getByRole('heading', { name: 'Who does it' })).toBeInTheDocument();
    await expect(
      within(dialog).getByRole('heading', { name: 'When it repeats' })
    ).toBeInTheDocument();
    await expect(within(dialog).getByLabelText('Chore name')).toHaveValue('');
    await expect(within(dialog).getByLabelText('Room')).toBeInTheDocument();
    await expect(within(dialog).queryByLabelText('Repeat every (days)')).toBeNull();
    await expect(within(dialog).queryByText('Days of the week')).toBeNull();
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Water the plants');
    await expect(dialog.querySelector('[aria-live="polite"]')).toHaveTextContent(
      'Water the plants'
    );
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignment'), 'everyone');
    await expect(within(dialog).getByLabelText('Person')).toBeDisabled();
    await expect(within(dialog).getAllByText('More options')).toHaveLength(3);
    await expect(within(dialog).getByLabelText('Instructions')).not.toBeVisible();
    await userEvent.click(within(dialog).getByLabelText('More options: The chore'));
    await expect(within(dialog).getByLabelText('Instructions')).toBeVisible();
    await expect(within(dialog).getByLabelText('Require approval')).not.toBeVisible();
  },
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false,
    },
  },
};

export const DesktopContinuousCreation: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await expect(
      within(dialog).getAllByRole('heading', { name: 'The chore' })[0]
    ).toBeInTheDocument();
    const iconSearch = within(dialog).getByLabelText('Paste Lucide icon name');
    await userEvent.clear(iconSearch);
    await userEvent.type(iconSearch, 'Telescope');
    await expect(within(dialog).getByRole('img', { name: 'Telescope' })).toBeInTheDocument();
    await userEvent.clear(iconSearch);
    await userEvent.type(iconSearch, 'NotARealLucideIcon');
    await expect(within(dialog).getByRole('img', { name: 'Telescope' })).toBeInTheDocument();
    await expect(within(dialog).getByRole('alert')).toHaveTextContent('Icon name not found');
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Clean the hallway');
    await expect(within(dialog).getByRole('heading', { name: 'Who does it' })).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignment'), 'everyone');
    await expect(
      within(dialog).getByRole('heading', { name: 'When it repeats' })
    ).toBeInTheDocument();
    const repeatSelect = within(dialog).getByLabelText('Repeat');
    await expect(repeatSelect).toBeInTheDocument();
    await userEvent.selectOptions(repeatSelect, 'biweekly');
    await expect(repeatSelect).toHaveValue('biweekly');
    await userEvent.selectOptions(repeatSelect, 'triweekly');
    await expect(repeatSelect).toHaveValue('triweekly');
    await userEvent.selectOptions(repeatSelect, 'fourweekly');
    await expect(repeatSelect).toHaveValue('fourweekly');
    await userEvent.selectOptions(repeatSelect, 'weekdays');
    await expect(repeatSelect).toHaveValue('weekdays');
    await userEvent.selectOptions(repeatSelect, 'weekends');
    await expect(repeatSelect).toHaveValue('weekends');
    await userEvent.selectOptions(repeatSelect, 'custom');
    await expect(repeatSelect).toHaveValue('custom');
    const customInterval = within(dialog).getByLabelText('Repeat every (days)');
    await expect(repeatSelect.parentElement?.parentElement?.nextElementSibling).toBe(
      customInterval.parentElement?.parentElement
    );
    fireEvent.change(customInterval, {
      target: { value: '10' },
    });
    fireEvent.change(within(dialog).getByLabelText('Start date'), {
      target: { value: '2026-12-07' },
    });
    await userEvent.type(within(dialog).getByLabelText('End date'), '2026-12-31');
    await userEvent.type(within(dialog).getByLabelText('Dates to skip'), '2026-12-24');
    await userEvent.click(within(dialog).getByLabelText('More options: The chore'));
    await userEvent.click(within(dialog).getByLabelText('More options: When it repeats'));
    await expect(within(dialog).queryByText('Days of the week')).toBeNull();
    await expect(dialog.querySelectorAll('input[type="color"]')).toHaveLength(1);
    await expect(within(dialog).getByLabelText('Instructions')).toBeInTheDocument();
    await expect(within(dialog).getByLabelText('When missed')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));
    await expect(saveChore).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          frequency: 'daily',
          intervalDays: 10,
          daysOfWeek: undefined,
          endDate: '2026-12-31',
          excludedDates: ['2026-12-24'],
        }),
      }),
      expect.any(Object)
    );
  },
};

export const RotationOffsetValidation: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Rotate recycling');
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignment'), 'rotation');
    await userEvent.click(within(dialog).getByLabelText('More options: Who does it'));

    const offset = within(dialog).getByLabelText('Rotation starting offset');
    fireEvent.change(offset, { target: { value: '99' } });
    await expect(offset).toHaveAttribute('aria-invalid', 'true');
    await expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Enter a whole number from 0 to 2.'
    );
    await expect(within(dialog).getByRole('button', { name: 'Add chore' })).toBeDisabled();
    await expect(saveChore).not.toHaveBeenCalled();

    fireEvent.change(offset, { target: { value: '1' } });
    await expect(offset).not.toHaveAttribute('aria-invalid');
    await expect(within(dialog).queryByRole('alert')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));
    await expect(saveChore).toHaveBeenCalledWith(
      expect.objectContaining({
        assignment: expect.objectContaining({
          mode: 'rotation',
          rotationCursor: 1,
        }),
      }),
      expect.any(Object)
    );
  },
};

export const NumericAndScheduleValidation: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Validated chore');
    await userEvent.click(within(dialog).getByLabelText('More options: The chore'));

    const estimated = within(dialog).getByLabelText('Estimated minutes');
    fireEvent.change(estimated, { target: { value: '1.5' } });
    await expect(estimated).toHaveAttribute('aria-invalid', 'true');
    await expect(within(dialog).getByText(/Enter a whole number from 0 to 1,?440\./)).toBeVisible();
    fireEvent.change(estimated, { target: { value: '5' } });

    const points = within(dialog).getByLabelText('Points');
    fireEvent.change(points, { target: { value: '10001' } });
    await expect(points).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(points, { target: { value: '10' } });

    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'custom');
    const interval = within(dialog).getByLabelText('Repeat every (days)');
    fireEvent.change(interval, { target: { value: '' } });
    await expect(interval).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(interval, { target: { value: '2' } });

    fireEvent.change(within(dialog).getByLabelText('Start date'), {
      target: { value: '2026-12-07' },
    });
    fireEvent.change(within(dialog).getByLabelText('End date'), {
      target: { value: '2026-12-01' },
    });
    await expect(within(dialog).getByLabelText('End date')).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(within(dialog).getByLabelText('End date'), {
      target: { value: '2026-12-31' },
    });

    fireEvent.change(within(dialog).getByLabelText('Dates to skip'), {
      target: { value: '2026-02-30' },
    });
    await expect(within(dialog).getByLabelText('Dates to skip')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await expect(within(dialog).getByRole('button', { name: 'Add chore' })).toBeDisabled();
    await expect(saveChore).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Dates to skip'), {
      target: { value: '2026-12-24' },
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));
    await expect(saveChore).toHaveBeenCalledTimes(1);
  },
};

export const WeekdaySchedule: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Empty the dishwasher');
    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'weekdays');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));

    await expect(saveChore).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          frequency: 'daily',
          daysOfWeek: [1, 2, 3, 4, 5],
          intervalDays: 1,
        }),
      }),
      expect.any(Object)
    );
  },
};

export const WeekendSchedule: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Water the garden');
    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'weekends');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));

    await expect(saveChore).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          frequency: 'daily',
          daysOfWeek: [0, 6],
          intervalDays: 1,
        }),
      }),
      expect.any(Object)
    );
  },
};

export const EveryFourWeeksSchedule: Story = {
  play: async ({ canvasElement }) => {
    saveChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a chore',
    });
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Clean the extractor fan');
    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'fourweekly');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));

    await expect(saveChore).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: expect.objectContaining({
          frequency: 'weekly',
          intervalWeeks: 4,
        }),
      }),
      expect.any(Object)
    );
  },
};

export const EditColorOverride: Story = {
  render: () => <ChoreEditingStory />,
  play: async ({ canvasElement }) => {
    saveEditedChore.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Edit chore',
    });
    await expect(within(dialog).queryByText('Start with a template')).toBeNull();
    const colorInput = dialog.querySelector('input[type="color"]');
    await expect(colorInput).not.toBeNull();
    fireEvent.change(colorInput as HTMLInputElement, { target: { value: '#2563eb' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await expect(saveEditedChore).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ color: '#2563eb' })
    );
  },
};

export const LightTheme: Story = {
  globals: { theme: 'light' },
};

export const PersonStepperCreation: Story = {
  render: () => <PersonCreationStory />,
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Add a person',
    });
    const nameInput = within(dialog).getByLabelText('Name');
    await expect(nameInput).toBeInTheDocument();
    await expect(within(dialog).getByLabelText('Role')).toHaveValue('member');
    await userEvent.type(nameInput, 'Alex');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Next' }));
    await expect(within(dialog).queryByLabelText('Name')).toBeNull();
    await expect(within(dialog).queryByLabelText('Role')).toBeNull();
    await expect(within(dialog).getAllByLabelText('Profile colour')[0]).toBeInTheDocument();
    const photoMode = within(dialog).getByRole('button', { name: 'Photo' });
    const iconMode = within(dialog).getByRole('button', { name: 'Icon' });
    await expect(photoMode).toHaveClass('h-9', 'px-3.5', 'text-xs', 'font-medium');
    await expect(iconMode).toHaveClass('h-9', 'px-3.5', 'text-xs', 'font-medium');
    await userEvent.click(photoMode);
    const uploadPhoto = within(dialog).getByRole('button', { name: 'Upload photo' });
    const fileHint = within(dialog).getByText('PNG, JPG up to 5MB');
    await expect(uploadPhoto).toHaveClass('border-transparent', 'text-white');
    await expect(fileHint.parentElement).toBe(uploadPhoto.parentElement?.parentElement);
    const pngBytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+7xRLVQAAAABJRU5ErkJggg=='
      ),
      (character) => character.charCodeAt(0)
    );
    await userEvent.upload(
      within(dialog).getByLabelText('Upload photo'),
      new File([pngBytes], 'avatar.png', { type: 'image/png' })
    );
    await expect(await within(dialog).findByRole('button', { name: 'Remove' })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Icon' }));
    const iconSearch = within(dialog).getByLabelText('Paste Lucide icon name');
    await userEvent.type(iconSearch, 'Telescope');
    await expect(iconSearch).toHaveValue('Telescope');
    await expect(
      within(dialog).getByRole('link', { name: /Browse Lucide icon catalog/ })
    ).toHaveAttribute('href', 'https://lucide.dev/icons/');
    await expect(within(dialog).queryByText('Account links')).toBeNull();
    await expect(within(dialog).queryByLabelText('Account ID')).toBeNull();
    await userEvent.click(within(dialog).getByText('Reminders'));
    const reminderSwitch = within(dialog).getByLabelText('Receive chore reminders');
    await expect(reminderSwitch).toBeInTheDocument();
    await expect(reminderSwitch).toHaveClass('h-7', 'w-11');
    await expect(reminderSwitch.firstElementChild).toHaveClass('translate-x-[14px]');
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Reminder destination'),
      'provider'
    );
    await expect(
      within(dialog).getByText(
        "Sends a push notification through the connected smart-home provider's app. Choose the device this person uses."
      )
    ).toBeInTheDocument();
    const notificationTarget = await within(dialog).findByLabelText('Notification device');
    await expect(notificationTarget).toBeRequired();
    await expect(within(dialog).getByRole('button', { name: 'Add person' })).toBeDisabled();
    await userEvent.selectOptions(notificationTarget, 'mobile_app_alex_iphone');
    await expect(within(dialog).getByRole('button', { name: 'Add person' })).toBeEnabled();
  },
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false,
    },
  },
};

export const ManagementUnlockError: Story = {
  render: () => <ManagementUnlockStory />,
  play: async ({ canvasElement }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Unlock chore management',
    });
    const form = dialog.querySelector('form');
    const header = dialog.querySelector('[data-card-dialog-header]');
    const body = header?.nextElementSibling;
    await expect(dialog).toHaveClass('max-sm:!rounded-t-[30px]');
    await expect(form?.firstElementChild).toBe(header);
    await expect(header).toHaveClass('border-b');
    await expect(body).toHaveClass('p-6', 'max-sm:p-4');
    await expect(within(dialog).getByRole('alert')).toHaveClass('mt-3');
    await expect(within(dialog).getByRole('button', { name: 'Unlock' }).parentElement).toHaveClass(
      'border-t',
      'pt-4'
    );
  },
};

export const ManagementPinEditor: Story = {
  render: () => <ManagementPinEditorStory />,
  play: async ({ canvasElement }) => {
    saveManagementPin.mockClear();
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Change PIN',
    });
    const header = dialog.querySelector('[data-card-dialog-header]');
    await expect(dialog).toHaveClass('max-sm:!rounded-t-[30px]');
    await expect(dialog.querySelector('form')?.firstElementChild).toBe(header);
    await expect(header).toHaveClass('border-b');
    await expect(within(dialog).queryByLabelText('Management PIN')).toBeNull();
    await expect(within(dialog).getByLabelText('New management PIN')).toHaveAttribute(
      'autocomplete',
      'new-password'
    );
    await expect(within(dialog).getByLabelText('New management PIN')).toHaveAttribute(
      'inputmode',
      'numeric'
    );
    await expect(within(dialog).getByLabelText('New management PIN')).toHaveAttribute(
      'type',
      'password'
    );
    await userEvent.type(within(dialog).getByLabelText('New management PIN'), '2468');
    await userEvent.type(within(dialog).getByLabelText('Confirm new management PIN'), '1357');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await expect(within(dialog).getByRole('alert')).toHaveTextContent('The PINs do not match.');
    await userEvent.clear(within(dialog).getByLabelText('Confirm new management PIN'));
    await userEvent.type(within(dialog).getByLabelText('Confirm new management PIN'), '2468');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await expect(saveManagementPin).toHaveBeenCalledWith('2468');
  },
};
