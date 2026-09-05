import {
  type ChoreDemoCopy,
  createChoreDemoWorkspace,
} from '@navet/app/features/chores/chore-demo-fixture';
import { useChoreWorkspaceStore } from '@navet/app/features/chores/chore-workspace-store';
import { afterEach, describe, expect, it } from 'vitest';
import { installDemoChoreActions } from './demo-chore-actions';

const copy: ChoreDemoCopy = {
  dishwasher: 'Unload dishwasher',
  toys: 'Toys back home',
  hallway: 'Shoes and jackets',
  laundry: 'Fold laundry',
  plants: 'Water plants',
  bins: 'Recycling',
  missionTitle: 'Teamwork',
  missionDescription: 'Complete chores together',
  upcomingMissionTitle: 'Next mission',
  upcomingMissionDescription: 'Keep going',
  rewardTitle: 'Movie night',
  secondRewardTitle: 'Choose dinner',
  childDishwasher: 'Dishwasher',
  childToys: 'Toys',
  childHallway: 'Hallway',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  hallwayRoom: 'Hallway',
  livingRoom: 'Living room',
};

describe('demo chore actions', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    useChoreWorkspaceStore.getState().reset();
  });

  it('completes a seeded chore locally and restores the normal command path on exit', async () => {
    const data = createChoreDemoWorkspace({ copy });
    const occurrence = Object.values(data.occurrencesById).find(
      (item) =>
        item.status === 'available' &&
        data.definitionsById[item.definitionId]?.title === copy.dishwasher
    )!;
    const original = useChoreWorkspaceStore.getState().execute;
    useChoreWorkspaceStore.getState().setPreviewDocument({ data });
    restore = installDemoChoreActions();
    const saved = await useChoreWorkspaceStore.getState().execute({
      type: 'occurrence_action',
      occurrenceId: occurrence.id,
      action: { type: 'complete', participantId: occurrence.assigneeIds[0]! },
    });
    const state = useChoreWorkspaceStore.getState();
    expect(saved).toBe(true);
    expect(state.data?.occurrencesById[occurrence.id]?.status).toBe('done');
    expect(state.data?.activity.length).toBe(data.activity.length + 1);
    expect(state.error).toBeNull();
    restore();
    expect(useChoreWorkspaceStore.getState().execute).toBe(original);
  });
});
