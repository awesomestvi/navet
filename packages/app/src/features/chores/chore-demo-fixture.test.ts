import { describe, expect, it } from 'vitest';
import { type ChoreDemoCopy, createChoreDemoWorkspace } from './chore-demo-fixture';

const copy: ChoreDemoCopy = {
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
  kitchen: 'Kök',
  bedroom: 'Sovrum',
  hallwayRoom: 'Hall',
  livingRoom: 'Vardagsrum',
};

describe('chore demo fixture', () => {
  it('keeps dates and provider-neutral room identities deterministic', () => {
    const data = createChoreDemoWorkspace({
      copy,
      now: new Date('2026-02-03T10:00:00.000Z'),
    });

    expect(data.definitionsById.dishwasher?.schedule).toMatchObject({ startDate: '2026-02-03' });
    expect(data.definitionsById.dishwasher?.roomRef).toEqual({
      canonicalId: 'room:kitchen',
      label: 'Kök',
    });
    expect(data.occurrencesById['today-dishwasher']).toBeDefined();
    expect(Object.keys(data.experience?.missionsById ?? {})).toHaveLength(2);
    expect(Object.keys(data.experience?.rewardGoalsById ?? {})).toHaveLength(2);
  });

  it('covers calm empty and optional adventure states', () => {
    expect(
      Object.keys(createChoreDemoWorkspace({ copy, mode: 'empty' }).definitionsById)
    ).toHaveLength(0);
    expect(createChoreDemoWorkspace({ copy, mode: 'adventure' }).experience?.gamificationMode).toBe(
      'adventure'
    );
  });
});
