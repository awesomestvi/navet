import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import type { ChoreExperienceState } from '@navet/core/chore-experience';
import type {
  ChoreDefinition,
  ChoreOccurrence,
  ChoreParticipant,
  ChoreWorkspaceData,
} from '@navet/core/chores';

export type ChoreDemoFixtureMode =
  | 'default'
  | 'empty'
  | 'approval'
  | 'complete'
  | 'adventure'
  | 'off';

export interface ChoreDemoCopy {
  dishwasher: string;
  toys: string;
  hallway: string;
  laundry: string;
  plants: string;
  bins: string;
  missionTitle: string;
  missionDescription: string;
  upcomingMissionTitle: string;
  upcomingMissionDescription: string;
  rewardTitle: string;
  secondRewardTitle: string;
  childDishwasher: string;
  childToys: string;
  childHallway: string;
  kitchen: string;
  bedroom: string;
  hallwayRoom: string;
  livingRoom: string;
}

const HOUR_MS = 60 * 60 * 1000;

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function atHour(date: Date, hour: number, dayOffset = 0) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + dayOffset,
    hour,
    0,
    0,
    0
  ).toISOString();
}

function participant(
  id: string,
  displayName: string,
  color: string,
  manager = false,
  timestamp: string
): ChoreParticipant {
  return {
    id,
    displayName,
    color,
    capabilities: manager ? ['complete', 'approve', 'manage'] : ['complete'],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function definition(input: {
  id: string;
  title: string;
  roomId: string;
  room: string;
  participantIds: string[];
  hour: number;
  timestamp: string;
  approval?: boolean;
  startDate: string;
}): ChoreDefinition {
  return {
    id: input.id,
    title: input.title,
    roomRef: {
      canonicalId: `room:${input.roomId}`,
      label: input.room,
    },
    enabled: true,
    assignment: {
      mode: input.participantIds.length === 0 ? 'anyone' : 'person',
      participantIds: input.participantIds,
    },
    schedule: {
      frequency: 'daily',
      startDate: input.startDate,
      time: `${String(input.hour).padStart(2, '0')}:00`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    dueWindowMinutes: 120,
    approval: {
      required: input.approval === true,
      approverIds: input.approval ? ['alex'] : [],
    },
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
  };
}

function occurrence(input: {
  id: string;
  definitionId: string;
  assigneeIds: string[];
  scheduledAt: string;
  status?: ChoreOccurrence['status'];
  completedBy?: string;
}): ChoreOccurrence {
  const status = input.status ?? 'available';
  return {
    id: input.id,
    definitionId: input.definitionId,
    scheduledAt: input.scheduledAt,
    dueAt: new Date(Date.parse(input.scheduledAt) + 2 * HOUR_MS).toISOString(),
    assigneeIds: input.assigneeIds,
    assignmentSlot: input.assigneeIds[0] ?? 'anyone',
    status,
    completedBy: input.completedBy,
    completedAt:
      status === 'done' || status === 'awaiting_approval' ? input.scheduledAt : undefined,
    updatedAt: input.scheduledAt,
  };
}

export function createChoreDemoWorkspace({
  copy,
  mode = 'default',
  now = new Date(),
}: {
  copy: ChoreDemoCopy;
  mode?: ChoreDemoFixtureMode;
  now?: Date;
}): ChoreWorkspaceData {
  if (mode === 'empty') {
    return {
      schemaVersion: 2,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {},
      activity: [],
      outbox: [],
    };
  }

  const timestamp = new Date(now.getTime() - 14 * 24 * HOUR_MS).toISOString();
  const startDate = localDateKey(now);
  const participantsById = {
    alex: participant('alex', 'Alex', themeColorValues.purple, true, timestamp),
    maya: participant('maya', 'Maya', themeColorValues.pink, false, timestamp),
    sam: participant('sam', 'Sam', themeColorValues.teal, false, timestamp),
  };
  const definitions = [
    definition({
      id: 'dishwasher',
      title: copy.dishwasher,
      roomId: 'kitchen',
      room: copy.kitchen,
      participantIds: ['maya'],
      hour: 8,
      timestamp,
      startDate,
    }),
    definition({
      id: 'toys',
      title: copy.toys,
      roomId: 'bedroom',
      room: copy.bedroom,
      participantIds: ['maya'],
      hour: 17,
      timestamp,
      startDate,
    }),
    definition({
      id: 'hallway',
      title: copy.hallway,
      roomId: 'hallway',
      room: copy.hallwayRoom,
      participantIds: [],
      hour: 18,
      timestamp,
      startDate,
    }),
    definition({
      id: 'laundry',
      title: copy.laundry,
      roomId: 'bedroom',
      room: copy.bedroom,
      participantIds: ['alex'],
      hour: 19,
      timestamp,
      startDate,
    }),
    definition({
      id: 'plants',
      title: copy.plants,
      roomId: 'living-room',
      room: copy.livingRoom,
      participantIds: ['sam'],
      hour: 10,
      timestamp,
      startDate,
      approval: true,
    }),
    definition({
      id: 'bins',
      title: copy.bins,
      roomId: 'kitchen',
      room: copy.kitchen,
      participantIds: ['alex'],
      hour: 20,
      timestamp,
      startDate,
    }),
  ];
  const definitionsById = Object.fromEntries(definitions.map((item) => [item.id, item]));
  const completeAll = mode === 'complete';
  const occurrences = [
    ...[-4, -3, -2, -1].map((dayOffset) =>
      occurrence({
        id: `history-bins-${Math.abs(dayOffset)}`,
        definitionId: 'bins',
        assigneeIds: ['alex'],
        scheduledAt: atHour(now, 20, dayOffset),
        status: 'done',
        completedBy: 'alex',
      })
    ),
    occurrence({
      id: 'today-dishwasher',
      definitionId: 'dishwasher',
      assigneeIds: ['maya'],
      scheduledAt: atHour(now, 8),
      status: completeAll ? 'done' : 'available',
      completedBy: completeAll ? 'maya' : undefined,
    }),
    occurrence({
      id: 'today-toys',
      definitionId: 'toys',
      assigneeIds: ['maya'],
      scheduledAt: atHour(now, 17),
      status: completeAll ? 'done' : 'available',
      completedBy: completeAll ? 'maya' : undefined,
    }),
    occurrence({
      id: 'today-hallway',
      definitionId: 'hallway',
      assigneeIds: ['alex', 'maya', 'sam'],
      scheduledAt: atHour(now, 18),
      status: completeAll ? 'done' : 'available',
      completedBy: completeAll ? 'sam' : undefined,
    }),
    occurrence({
      id: 'today-laundry',
      definitionId: 'laundry',
      assigneeIds: ['alex'],
      scheduledAt: atHour(now, 19),
      status: completeAll ? 'done' : 'available',
      completedBy: completeAll ? 'alex' : undefined,
    }),
    occurrence({
      id: 'today-plants',
      definitionId: 'plants',
      assigneeIds: ['sam'],
      scheduledAt: atHour(now, 10),
      status: mode === 'approval' ? 'awaiting_approval' : 'done',
      completedBy: 'sam',
    }),
    occurrence({
      id: 'today-bins',
      definitionId: 'bins',
      assigneeIds: ['alex'],
      scheduledAt: atHour(now, 20),
      status: 'done',
      completedBy: 'alex',
    }),
    occurrence({
      id: 'tomorrow-dishwasher',
      definitionId: 'dishwasher',
      assigneeIds: ['maya'],
      scheduledAt: atHour(now, 8, 1),
    }),
    occurrence({
      id: 'tomorrow-hallway',
      definitionId: 'hallway',
      assigneeIds: ['alex', 'maya', 'sam'],
      scheduledAt: atHour(now, 18, 1),
    }),
  ];
  const experience: ChoreExperienceState = {
    version: 1,
    gamificationMode: mode === 'adventure' ? 'adventure' : mode === 'off' ? 'off' : 'family',
    presentationByDefinitionId: {
      dishwasher: {
        estimatedMinutes: 4,
        points: 15,
        childTitle: copy.childDishwasher,
        icon: 'Utensils',
      },
      toys: {
        estimatedMinutes: 5,
        points: 10,
        childTitle: copy.childToys,
        icon: 'Blocks',
      },
      hallway: {
        estimatedMinutes: 2,
        points: 5,
        childTitle: copy.childHallway,
        icon: 'Footprints',
      },
      laundry: { estimatedMinutes: 12, points: 20, icon: 'Shirt' },
      plants: { estimatedMinutes: 6, points: 10, icon: 'Leaf' },
      bins: { estimatedMinutes: 5, points: 10, icon: 'Trash2' },
    },
    missionsById: {
      'saturday-reset': {
        id: 'saturday-reset',
        title: copy.missionTitle,
        description: copy.missionDescription,
        definitionIds: ['dishwasher', 'hallway', 'laundry', 'bins'],
        status: 'active',
        rewardPoints: 50,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'evening-tidy': {
        id: 'evening-tidy',
        title: copy.upcomingMissionTitle,
        description: copy.upcomingMissionDescription,
        definitionIds: ['toys', 'plants'],
        status: 'upcoming',
        startsAt: atHour(now, 16, 1),
        endsAt: atHour(now, 21, 1),
        rewardPoints: 25,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    rewardGoalsById: {
      'family-outing': {
        id: 'family-outing',
        title: copy.rewardTitle,
        type: 'family',
        targetPoints: 120,
        startingPoints: 45,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      'maya-saving-goal': {
        id: 'maya-saving-goal',
        title: copy.secondRewardTitle,
        type: 'saving',
        targetPoints: 200,
        participantId: 'maya',
        startingPoints: 60,
        enabled: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
  };

  return {
    schemaVersion: 2,
    participantsById,
    definitionsById,
    occurrencesById: Object.fromEntries(occurrences.map((item) => [item.id, item])),
    experience,
    activity: [],
    outbox: [],
  };
}
