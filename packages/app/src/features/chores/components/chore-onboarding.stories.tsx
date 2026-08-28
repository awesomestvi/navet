import type {
  ChoreExperienceState,
  ChoreGamificationMode,
  ChorePresentationMetadata,
  ChoreRewardGoal,
} from '@navet/core/chore-experience';
import { createChoreExperienceState } from '@navet/core/chore-experience';
import type { ChoreDefinition, ChoreParticipant } from '@navet/core/chores';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { ChoreOnboardingDialog, ChoreOnboardingWelcome } from './chore-onboarding';

function OnboardingWelcomeStory() {
  const [open, setOpen] = useState(false);
  const [complete, setComplete] = useState(false);
  const [participants, setParticipants] = useState<ChoreParticipant[]>([]);
  const [definitions, setDefinitions] = useState<ChoreDefinition[]>([]);
  const [experience, setExperience] = useState<ChoreExperienceState>(createChoreExperienceState());

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {complete ? <p>Setup completed</p> : <ChoreOnboardingWelcome onStart={() => setOpen(true)} />}
      <ChoreOnboardingDialog
        isOpen={open}
        onOpenChange={setOpen}
        participants={participants}
        definitions={definitions}
        experience={experience}
        rooms={[
          { canonicalId: 'room:kitchen', label: 'Kitchen' },
          { canonicalId: 'room:bedroom', label: 'Bedroom' },
        ]}
        onSaveParticipant={async (participant) => {
          setParticipants((current) => [
            ...current.filter((candidate) => candidate.id !== participant.id),
            participant,
          ]);
          setExperience((current) => ({
            ...current,
            setupStartedAt: '2026-08-15T08:00:00.000Z',
          }));
          return true;
        }}
        onSaveChore={async (
          definition: ChoreDefinition,
          presentation: ChorePresentationMetadata
        ) => {
          setDefinitions((current) => [...current, definition]);
          setExperience((current) => ({
            ...current,
            presentationByDefinitionId: {
              ...current.presentationByDefinitionId,
              [definition.id]: presentation,
            },
          }));
          return true;
        }}
        onRemoveChore={async (definition) => {
          setDefinitions((current) =>
            current.filter((candidate) => candidate.id !== definition.id)
          );
          return true;
        }}
        onSaveRewards={async (mode: ChoreGamificationMode, reward?: ChoreRewardGoal) => {
          setExperience((current) => ({
            ...current,
            gamificationMode: mode,
            rewardGoalsById: reward
              ? { ...current.rewardGoalsById, [reward.id]: reward }
              : current.rewardGoalsById,
          }));
          return true;
        }}
        onConfigurePin={async () => true}
        onComplete={async () => {
          setComplete(true);
          return true;
        }}
      />
    </div>
  );
}

const meta = {
  title: 'Pages/Household/Chore Onboarding',
  component: OnboardingWelcomeStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Guided first-run flow for creating household profiles, choosing their appearance and reminder preferences, adding the first chores, selecting an optional motivation style, and protecting management changes with a PIN. It uses the shared navigation-workspace and dialog patterns at desktop and phone widths.',
      },
    },
  },
} satisfies Meta<typeof OnboardingWelcomeStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {};

export const Mobile: Story = {
  play: async ({ canvas, canvasElement }) => {
    const welcome = await canvas.findByRole('region', {
      name: 'Make household work easier to share.',
    });
    await userEvent.click(within(welcome).getByRole('button', { name: 'Create your chore list' }));

    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Set up household chores',
    });
    const progressSidebar = dialog.querySelector('nav')?.closest('aside');

    await expect(dialog.querySelector('header')).toHaveClass('py-3', 'sm:py-4');
    await expect(progressSidebar).toHaveClass('hidden', 'md:block');
    await expect(within(dialog).queryByRole('navigation')).not.toBeInTheDocument();
    await expect(within(dialog).getByText('Step 1 of 6')).toBeVisible();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Vishal');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));

    const roleSelect = within(dialog).getByLabelText('Role: Vishal');
    await expect(roleSelect.closest('li')).toHaveClass(
      'grid',
      'grid-cols-[auto_minmax(0,1fr)_auto]',
      'sm:flex'
    );
    await expect(roleSelect.parentElement).toHaveClass(
      'max-sm:col-start-2',
      'max-sm:col-end-4',
      'max-sm:row-start-2',
      'w-full'
    );
  },
  globals: {
    viewport: {
      value: 'mobile1',
      isRotated: false,
    },
  },
};

export const CompleteGuidedSetup: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Interaction contract for the complete six-step setup, including the requirement that the household keeps at least one manager.',
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const welcome = await canvas.findByRole('region', {
      name: 'Make household work easier to share.',
    });
    await userEvent.click(within(welcome).getByRole('button', { name: 'Create your chore list' }));

    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Set up household chores',
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    let name = within(dialog).getByLabelText('Name');
    await userEvent.type(name, 'Alex');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await expect(within(dialog).getByLabelText('Role: Alex')).toHaveValue('manager');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    name = within(dialog).getByLabelText('Name');
    await userEvent.type(name, 'Maya');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await expect(within(dialog).getByLabelText('Role: Maya')).toHaveValue('member');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    name = within(dialog).getByLabelText('Name');
    await userEvent.type(name, 'Sam');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add person' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove Sam' }));
    await expect(within(dialog).queryByLabelText('Role: Sam')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue to profiles' }));
    await expect(within(dialog).getAllByLabelText('Profile colour')[0]).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Icon' }));
    const profileSymbol = within(dialog).getByLabelText('UserRound');
    await userEvent.click(profileSymbol);
    await expect(profileSymbol).toBeChecked();
    await userEvent.click(within(dialog).getByRole('button', { name: /Maya$/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: /Alex$/ }));
    await expect(within(dialog).getByLabelText('UserRound')).toBeChecked();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Save profiles and continue' })
    );

    await expect(within(dialog).queryByLabelText('Chore name')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));
    await expect(within(dialog).getByLabelText('Chore name')).toBeVisible();
    await expect(within(dialog).getByRole('heading', { name: 'The chore' })).toBeVisible();
    await expect(within(dialog).getByRole('heading', { name: 'Who does it' })).toBeVisible();
    await expect(within(dialog).getByRole('heading', { name: 'When it repeats' })).toBeVisible();
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Unload dishwasher');
    await userEvent.click(within(dialog).getByLabelText('Utensils'));
    await userEvent.selectOptions(within(dialog).getByLabelText('Assignment'), 'everyone');
    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'after_completion');
    await expect(within(dialog).getByLabelText('Days after completion')).toBeVisible();
    await userEvent.selectOptions(within(dialog).getByLabelText('Repeat'), 'biweekly');
    await expect(within(dialog).queryByLabelText('Days after completion')).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText('End date'), '2026-12-31');
    await userEvent.type(within(dialog).getByLabelText('Dates to skip'), '2026-12-24');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add this chore' }));
    await expect(within(dialog).queryByLabelText('Chore name')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete Unload dishwasher' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add chore' }));
    await userEvent.type(within(dialog).getByLabelText('Chore name'), 'Unload dishwasher');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add this chore' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue to motivation' }));

    await userEvent.selectOptions(within(dialog).getByLabelText('Motivation style'), 'family');
    await expect(
      within(dialog).getByText(
        'Puts everyone’s points toward a shared reward. Example: reach 500 points to choose the next family outing.'
      )
    ).toBeVisible();
    await userEvent.type(within(dialog).getByLabelText('Reward name'), 'Choose movie night');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Continue to protection' }));

    await userEvent.click(within(dialog).getByRole('button', { name: 'Skip for now' }));

    await expect(within(dialog).getByText('Your shared chore list is ready')).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Open Today' }));
    await expect(canvas.getByText('Setup completed')).toBeInTheDocument();
  },
};
