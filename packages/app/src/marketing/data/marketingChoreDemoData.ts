import type {
  ChoreMissionProgress,
  ChoreRewardProgress,
} from '@navet/app/features/chores/chore-dashboard-selectors';
import type { ChoreDefinition, ChoreOccurrence, ChoreParticipant } from '@navet/core/chores';

const now = new Date('2026-09-10T09:00:00');
const timestamp = now.toISOString();
const definition: ChoreDefinition = {
  id: 'plants',
  title: 'Water plants',
  enabled: true,
  roomRef: { canonicalId: 'room:living-room', label: 'Living room' },
  assignment: { mode: 'person', participantIds: ['maya'] },
  schedule: {
    frequency: 'daily',
    startDate: '2026-09-10',
    time: '09:00',
    timeZone: 'Europe/Stockholm',
  },
  dueWindowMinutes: 120,
  approval: { required: false, approverIds: [] },
  createdAt: timestamp,
  updatedAt: timestamp,
};
const occurrence: ChoreOccurrence = {
  id: 'today-plants',
  definitionId: 'plants',
  scheduledAt: timestamp,
  dueAt: new Date(now.getTime() + 7200000).toISOString(),
  assigneeIds: ['maya'],
  assignmentSlot: 'maya',
  status: 'available',
  updatedAt: timestamp,
};
const mission: ChoreMissionProgress = {
  mission: {
    id: 'weekend',
    title: 'Weekend reset',
    description: 'Tidy the shared spaces. Make room for the weekend.',
    definitionIds: ['plants', 'recycling'],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  completed: 0,
  total: 2,
  percent: 0,
};
const reward: ChoreRewardProgress = {
  goal: {
    id: 'movie',
    title: 'Movie night',
    type: 'family',
    targetPoints: 100,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  points: 75,
  percent: 75,
};
export const CHORE_DEMO = {
  now,
  tasks: [
    {
      definition,
      occurrence,
      presentation: { icon: 'sprout', color: '#14b8a6', estimatedMinutes: 3, points: 15 },
    },
    {
      definition: {
        ...definition,
        id: 'recycling',
        title: 'Recycling',
        roomRef: { canonicalId: 'room:kitchen', label: 'Kitchen' },
        assignment: { mode: 'person', participantIds: ['alex'] },
      } satisfies ChoreDefinition,
      occurrence: {
        ...occurrence,
        id: 'today-recycling',
        definitionId: 'recycling',
        assigneeIds: ['alex'],
        assignmentSlot: 'alex',
      } satisfies ChoreOccurrence,
      presentation: { icon: 'recycle', color: '#f97316', estimatedMinutes: 2, points: 10 },
    },
  ],
  people: {
    maya: {
      id: 'maya',
      displayName: 'Maya',
      color: '#ec4899',
      capabilities: ['complete'],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    alex: {
      id: 'alex',
      displayName: 'Alex',
      color: '#8b5cf6',
      capabilities: ['complete'],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  } satisfies Record<string, ChoreParticipant>,
  mission,
  reward,
};
