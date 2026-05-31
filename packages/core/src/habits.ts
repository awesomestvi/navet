import type { HomeEvent } from './home-events';
import type { IntegrationProviderId } from './integration-providers';

export interface HabitCandidate {
  id: string;
  detectorId:
    | 'manual_light_routine'
    | 'long_on_light'
    | 'inactive_room_active_device'
    | 'bedtime_window'
    | 'wakeup_window'
    | 'arrival_departure'
    | 'energy_spike';
  providerId: IntegrationProviderId;
  entityIds: string[];
  roomId?: string;
  action: 'turn_on' | 'turn_off' | 'notify';
  timeWindow: {
    startMinute: number;
    endMinute: number;
    days: number[];
  };
  evidenceCount: number;
  lastObservedAt: string;
  confidence: number;
  explanation: string[];
  blockedReason?: string;
}

export interface HabitInsight {
  id: string;
  candidateId: string;
  title: string;
  summary: string;
  confidence: number;
  confidenceLabel: 'low' | 'medium' | 'high';
  evidence: string[];
  suggestedRule?: HabitRule;
  status: 'new' | 'dismissed' | 'deferred' | 'accepted' | 'expired';
  createdAt: string;
}

export interface HabitRule {
  id: string;
  sourceCandidateId?: string;
  enabled: boolean;
  scope: 'navet_local';
  trigger: {
    days: number[];
    startMinute: number;
    endMinute: number;
    roomId?: string;
    occupancy?: 'occupied' | 'vacant' | 'any';
    luxBelow?: number;
    presence?: 'home' | 'away' | 'any';
  };
  action: {
    type: 'turn_on' | 'turn_off' | 'notify';
    entityIds: string[];
  };
  safety: {
    allowDomains: Array<'light' | 'switch'>;
    requireUserCreated: true;
  };
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export interface HabitFeedback {
  id: string;
  insightId: string;
  candidateId: string;
  outcome: 'dismissed' | 'remind_later' | 'accepted' | 'undone' | 'created_rule';
  timestamp: string;
  reason?: 'wrong_time' | 'wrong_room' | 'wrong_action' | 'not_useful' | 'unsafe' | 'other';
}

export interface HardwareProfile {
  tier: 'low' | 'medium' | 'high';
  cores?: number;
  memoryGb?: number;
  benchmarkMs?: number;
  maxJournalEvents: number;
  detectorBudget: 'minimal' | 'standard' | 'expanded';
}

export interface IntelligenceProvider {
  id: string;
  supports(profile: HardwareProfile): boolean;
  collect?(event: HomeEvent): void;
  detect(input: {
    events: HomeEvent[];
    feedback: HabitFeedback[];
    rules: HabitRule[];
    profile: HardwareProfile;
    now?: Date;
  }): HabitCandidate[];
}

const SAFE_HABIT_DOMAINS = new Set(['light', 'switch']);
const DANGEROUS_HABIT_DOMAINS = new Set([
  'lock',
  'alarm_control_panel',
  'camera',
  'garage',
  'cover',
]);

interface DetectionInput {
  events: HomeEvent[];
  feedback: HabitFeedback[];
  rules: HabitRule[];
  profile: HardwareProfile;
  now?: Date;
}

interface AggregatedEvidence {
  id: string;
  providerId: IntegrationProviderId;
  entityIds: string[];
  roomId?: string;
  action: 'turn_on' | 'turn_off' | 'notify';
  detectorId: HabitCandidate['detectorId'];
  timeWindow: HabitCandidate['timeWindow'];
  evidenceCount: number;
  lastObservedAt: string;
  explanation: string[];
  rawScore: number;
  blockedReason?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getEventDateParts(timestamp: string) {
  const date = new Date(timestamp);
  const day = date.getDay();
  const minute = date.getHours() * 60 + date.getMinutes();

  return {
    date,
    day,
    minute,
  };
}

function resolveBucketSize(profile: HardwareProfile) {
  return profile.tier === 'low' ? 15 : 10;
}

function resolveLuxBand(lux: number | null | undefined) {
  if (lux == null || Number.isNaN(lux)) {
    return 'unknown';
  }

  if (lux < 25) {
    return 'dark';
  }

  if (lux < 200) {
    return 'dim';
  }

  return 'bright';
}

export function resolveSunPosition(
  timestamp: string
): NonNullable<HomeEvent['context']['sunPosition']> {
  const hour = new Date(timestamp).getHours();
  if (hour < 5) {
    return 'night';
  }
  if (hour < 7) {
    return 'dawn';
  }
  if (hour < 18) {
    return 'day';
  }
  if (hour < 21) {
    return 'dusk';
  }
  return 'night';
}

function resolveActionFromEvent(event: HomeEvent): HabitCandidate['action'] | null {
  if (event.action === 'turned_on') {
    return 'turn_on';
  }

  if (event.action === 'turned_off') {
    return 'turn_off';
  }

  return null;
}

function getFeedbackPenalty(candidateId: string, feedback: HabitFeedback[]) {
  return feedback.reduce((penalty, item) => {
    if (item.candidateId !== candidateId) {
      return penalty;
    }

    switch (item.outcome) {
      case 'dismissed':
        return penalty + 0.18;
      case 'remind_later':
        return penalty + 0.08;
      case 'undone':
        return penalty + 0.2;
      case 'accepted':
      case 'created_rule':
        return penalty - 0.05;
      default:
        return penalty;
    }
  }, 0);
}

function getStalenessPenalty(lastObservedAt: string, now: Date) {
  const ageMs = Math.max(0, now.getTime() - new Date(lastObservedAt).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return clamp(ageDays / 70, 0, 0.35);
}

function getConfidenceLabel(confidence: number): HabitInsight['confidenceLabel'] {
  if (confidence >= 0.8) {
    return 'high';
  }

  if (confidence >= 0.55) {
    return 'medium';
  }

  return 'low';
}

function getQuickReversalPenaltyForGroup(
  events: HomeEvent[],
  entityId: string,
  action: 'turn_on' | 'turn_off'
) {
  const oppositeAction = action === 'turn_on' ? 'turned_off' : 'turned_on';

  return events.reduce((penalty, event, index) => {
    const currentAction = resolveActionFromEvent(event);
    if (event.canonicalEntityId !== entityId || currentAction !== action) {
      return penalty;
    }

    const nextEvent = events[index + 1];
    if (
      !nextEvent ||
      nextEvent.canonicalEntityId !== entityId ||
      nextEvent.action !== oppositeAction
    ) {
      return penalty;
    }

    const minutesBetween =
      (new Date(nextEvent.timestamp).getTime() - new Date(event.timestamp).getTime()) / (1000 * 60);

    return minutesBetween >= 0 && minutesBetween <= 2 ? penalty + 0.12 : penalty;
  }, 0);
}

export function isDangerousHabitDomain(domain: string) {
  return DANGEROUS_HABIT_DOMAINS.has(domain);
}

export function supportsHabitSuggestions(domain: string) {
  return SAFE_HABIT_DOMAINS.has(domain) && !isDangerousHabitDomain(domain);
}

export function buildHardwareProfile(input: {
  tier: HardwareProfile['tier'];
  cores?: number;
  memoryGb?: number;
  benchmarkMs?: number;
}): HardwareProfile {
  const detectorBudget =
    input.tier === 'low' ? 'minimal' : input.tier === 'medium' ? 'standard' : 'expanded';

  return {
    tier: input.tier,
    cores: input.cores,
    memoryGb: input.memoryGb,
    benchmarkMs: input.benchmarkMs,
    maxJournalEvents: input.tier === 'low' ? 600 : input.tier === 'medium' ? 1500 : 3000,
    detectorBudget,
  };
}

function finalizeCandidate(
  evidence: AggregatedEvidence,
  feedback: HabitFeedback[],
  now: Date
): HabitCandidate {
  const basePenalty =
    getFeedbackPenalty(evidence.id, feedback) + getStalenessPenalty(evidence.lastObservedAt, now);
  const confidence = clamp(evidence.rawScore - basePenalty, 0, 0.98);

  return {
    id: evidence.id,
    detectorId: evidence.detectorId,
    providerId: evidence.providerId,
    entityIds: evidence.entityIds,
    roomId: evidence.roomId,
    action: evidence.action,
    timeWindow: evidence.timeWindow,
    evidenceCount: evidence.evidenceCount,
    lastObservedAt: evidence.lastObservedAt,
    confidence,
    explanation: evidence.explanation,
    blockedReason: evidence.blockedReason,
  };
}

function detectManualLightRoutines({
  events,
  feedback,
  profile,
  now,
}: DetectionInput): HabitCandidate[] {
  const bucketSize = resolveBucketSize(profile);
  const routineEvents = events.filter((event) => {
    const action = resolveActionFromEvent(event);
    return (
      action !== null &&
      supportsHabitSuggestions(event.domain) &&
      (event.source === 'manual' || event.source === 'navet') &&
      !isDangerousHabitDomain(event.domain)
    );
  });

  const grouped = new Map<
    string,
    {
      evidence: AggregatedEvidence;
      days: Set<number>;
    }
  >();

  for (const event of routineEvents) {
    const action = resolveActionFromEvent(event);
    if (!action) {
      continue;
    }

    const { day, minute } = getEventDateParts(event.timestamp);
    const bucketStart = Math.floor(minute / bucketSize) * bucketSize;
    const bucketEnd = bucketStart + bucketSize;
    const occupancy = event.context.occupancy ?? 'unknown';
    const luxBand = resolveLuxBand(event.context.lux);
    const key = [
      'manual_light_routine',
      event.canonicalEntityId,
      action,
      day,
      bucketStart,
      event.roomId ?? 'no-room',
      occupancy,
      luxBand,
    ].join('|');

    const existing = grouped.get(key);
    if (existing) {
      existing.evidence.evidenceCount += 1;
      existing.evidence.lastObservedAt =
        existing.evidence.lastObservedAt > event.timestamp
          ? existing.evidence.lastObservedAt
          : event.timestamp;
      existing.days.add(day);
      continue;
    }

    grouped.set(key, {
      evidence: {
        id: key,
        providerId: event.providerId,
        entityIds: [event.canonicalEntityId],
        roomId: event.roomId,
        action,
        detectorId: 'manual_light_routine',
        timeWindow: {
          startMinute: bucketStart,
          endMinute: bucketEnd,
          days: [day],
        },
        evidenceCount: 1,
        lastObservedAt: event.timestamp,
        explanation: [
          `Repeated ${action === 'turn_on' ? 'switch-on' : 'switch-off'} events around ${formatMinuteRange(bucketStart, bucketEnd)}.`,
          occupancy === 'unknown'
            ? 'Room occupancy was unavailable, so timing carried more weight.'
            : `Room occupancy was ${occupancy} during matching events.`,
          luxBand === 'unknown'
            ? 'Ambient light data was unavailable for these events.'
            : `Ambient light was typically ${luxBand}.`,
        ],
        rawScore: 0.35,
      },
      days: new Set([day]),
    });
  }

  return [...grouped.values()]
    .map(({ evidence, days }) => {
      evidence.timeWindow.days = [...days].sort();
      const reversalAction = evidence.action === 'notify' ? 'turn_off' : evidence.action;
      evidence.rawScore = clamp(
        0.32 +
          evidence.evidenceCount * 0.13 +
          evidence.timeWindow.days.length * 0.03 -
          getQuickReversalPenaltyForGroup(
            routineEvents,
            evidence.entityIds[0] ?? '',
            reversalAction
          ),
        0,
        0.95
      );
      return evidence;
    })
    .filter((evidence) => evidence.evidenceCount >= 3)
    .map((evidence) => finalizeCandidate(evidence, feedback, now ?? new Date()));
}

function detectLongOnLightPatterns({ events, feedback, now }: DetectionInput): HabitCandidate[] {
  const candidates: HabitCandidate[] = [];
  const onEvents = new Map<string, HomeEvent>();

  for (const event of events) {
    if (!supportsHabitSuggestions(event.domain)) {
      continue;
    }

    if (event.action === 'turned_on') {
      onEvents.set(event.canonicalEntityId, event);
      continue;
    }

    if (event.action !== 'turned_off') {
      continue;
    }

    const turnedOnEvent = onEvents.get(event.canonicalEntityId);
    if (!turnedOnEvent) {
      continue;
    }

    onEvents.delete(event.canonicalEntityId);
    const durationMinutes =
      (new Date(event.timestamp).getTime() - new Date(turnedOnEvent.timestamp).getTime()) /
      (1000 * 60);

    if (durationMinutes < 180) {
      continue;
    }

    const start = getEventDateParts(turnedOnEvent.timestamp);
    const candidateId = [
      'long_on_light',
      event.canonicalEntityId,
      start.day,
      Math.floor(start.minute / 30) * 30,
    ].join('|');
    const evidence: AggregatedEvidence = {
      id: candidateId,
      providerId: event.providerId,
      entityIds: [event.canonicalEntityId],
      roomId: event.roomId,
      action: 'turn_off',
      detectorId: 'long_on_light',
      timeWindow: {
        startMinute: Math.floor(start.minute / 30) * 30,
        endMinute: Math.floor(start.minute / 30) * 30 + 30,
        days: [start.day],
      },
      evidenceCount: 2,
      lastObservedAt: event.timestamp,
      explanation: [
        `This ${event.domain} stayed on for about ${Math.round(durationMinutes)} minutes.`,
        'Navet can suggest turning it off during similar long-running windows.',
      ],
      rawScore: 0.58,
    };

    candidates.push(finalizeCandidate(evidence, feedback, now ?? new Date()));
  }

  return candidates;
}

function detectInactiveRoomPatterns({ events, feedback, now }: DetectionInput): HabitCandidate[] {
  return events
    .filter(
      (event) =>
        event.action === 'turned_on' &&
        supportsHabitSuggestions(event.domain) &&
        event.context.occupancy === 'vacant'
    )
    .map((event) =>
      finalizeCandidate(
        {
          id: `inactive_room_active_device|${event.canonicalEntityId}|${event.timestamp}`,
          providerId: event.providerId,
          entityIds: [event.canonicalEntityId],
          roomId: event.roomId,
          action: 'turn_off',
          detectorId: 'inactive_room_active_device',
          timeWindow: {
            startMinute: getEventDateParts(event.timestamp).minute,
            endMinute: getEventDateParts(event.timestamp).minute + 15,
            days: [getEventDateParts(event.timestamp).day],
          },
          evidenceCount: 1,
          lastObservedAt: event.timestamp,
          explanation: [
            'The room looked vacant when this device was turned on.',
            'Navet is flagging this as a low-risk energy-saving suggestion.',
          ],
          rawScore: 0.46,
        },
        feedback,
        now ?? new Date()
      )
    )
    .filter((candidate) => candidate.confidence >= 0.35);
}

function detectBedtimeWakeupPatterns({
  events,
  feedback,
  profile,
  now,
}: DetectionInput): HabitCandidate[] {
  const bucketSize = resolveBucketSize(profile);
  const grouped = new Map<string, AggregatedEvidence>();

  for (const event of events) {
    const action = resolveActionFromEvent(event);
    if (!action || !supportsHabitSuggestions(event.domain)) {
      continue;
    }

    const { day, minute } = getEventDateParts(event.timestamp);
    const isBedtime = action === 'turn_off' && (minute >= 20 * 60 || minute < 2 * 60);
    const isWakeup = action === 'turn_on' && minute >= 5 * 60 && minute < 10 * 60;

    if (!isBedtime && !isWakeup) {
      continue;
    }

    const detectorId = isBedtime ? 'bedtime_window' : 'wakeup_window';
    const bucketStart = Math.floor(minute / bucketSize) * bucketSize;
    const key = [detectorId, event.roomId ?? event.canonicalEntityId, day, bucketStart].join('|');
    const existing = grouped.get(key);

    if (existing) {
      existing.evidenceCount += 1;
      existing.lastObservedAt =
        existing.lastObservedAt > event.timestamp ? existing.lastObservedAt : event.timestamp;
      continue;
    }

    grouped.set(key, {
      id: key,
      providerId: event.providerId,
      entityIds: [event.canonicalEntityId],
      roomId: event.roomId,
      action,
      detectorId,
      timeWindow: {
        startMinute: bucketStart,
        endMinute: bucketStart + bucketSize,
        days: [day],
      },
      evidenceCount: 1,
      lastObservedAt: event.timestamp,
      explanation: [
        isBedtime
          ? 'Repeated late-evening shutoff behavior suggests a bedtime routine.'
          : 'Repeated early-day turn-on behavior suggests a wake-up routine.',
      ],
      rawScore: 0.34,
    });
  }

  return [...grouped.values()]
    .filter((evidence) => evidence.evidenceCount >= 4)
    .map((evidence) => {
      evidence.rawScore = clamp(0.32 + evidence.evidenceCount * 0.1, 0, 0.88);
      return finalizeCandidate(evidence, feedback, now ?? new Date());
    });
}

function detectArrivalDeparturePatterns({ events, feedback, now }: DetectionInput) {
  const grouped = new Map<string, AggregatedEvidence>();

  for (const event of events) {
    const action = resolveActionFromEvent(event);
    const presence = event.context.userPresence;
    if (!action || !supportsHabitSuggestions(event.domain) || presence === 'unknown') {
      continue;
    }

    const isArrival = presence === 'home' && action === 'turn_on';
    const isDeparture = presence === 'away' && action === 'turn_off';
    if (!isArrival && !isDeparture) {
      continue;
    }

    const { day, minute } = getEventDateParts(event.timestamp);
    const key = ['arrival_departure', event.canonicalEntityId, presence, day].join('|');
    const existing = grouped.get(key);
    if (existing) {
      existing.evidenceCount += 1;
      existing.lastObservedAt =
        existing.lastObservedAt > event.timestamp ? existing.lastObservedAt : event.timestamp;
      continue;
    }

    grouped.set(key, {
      id: key,
      providerId: event.providerId,
      entityIds: [event.canonicalEntityId],
      roomId: event.roomId,
      action,
      detectorId: 'arrival_departure',
      timeWindow: {
        startMinute: Math.max(0, minute - 15),
        endMinute: minute + 15,
        days: [day],
      },
      evidenceCount: 1,
      lastObservedAt: event.timestamp,
      explanation: [
        isArrival
          ? 'This action tends to happen soon after someone arrives home.'
          : 'This action tends to happen when everyone leaves.',
      ],
      rawScore: 0.36,
    });
  }

  return [...grouped.values()]
    .filter((evidence) => evidence.evidenceCount >= 3)
    .map((evidence) => finalizeCandidate(evidence, feedback, now ?? new Date()));
}

function detectEnergySpikePatterns({ events, feedback, now }: DetectionInput) {
  const grouped = new Map<
    string,
    { count: number; providerId: IntegrationProviderId; last: HomeEvent }
  >();

  for (const event of events) {
    if (event.action !== 'energy_sampled' || typeof event.currentState !== 'number') {
      continue;
    }

    if (event.currentState < 1500) {
      continue;
    }

    const { day, minute } = getEventDateParts(event.timestamp);
    const key = ['energy_spike', event.roomId ?? 'whole-home', day, Math.floor(minute / 30)].join(
      '|'
    );
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.last = event;
      continue;
    }

    grouped.set(key, {
      count: 1,
      providerId: event.providerId,
      last: event,
    });
  }

  return [...grouped.entries()]
    .filter(([, value]) => value.count >= 3)
    .map(([key, value]) =>
      finalizeCandidate(
        {
          id: key,
          providerId: value.providerId,
          entityIds: [value.last.canonicalEntityId],
          roomId: value.last.roomId,
          action: 'notify',
          detectorId: 'energy_spike',
          timeWindow: {
            startMinute: Math.max(0, getEventDateParts(value.last.timestamp).minute - 15),
            endMinute: getEventDateParts(value.last.timestamp).minute + 15,
            days: [getEventDateParts(value.last.timestamp).day],
          },
          evidenceCount: value.count,
          lastObservedAt: value.last.timestamp,
          explanation: ['Energy usage was repeatedly higher than usual in this time window.'],
          rawScore: 0.52,
        },
        feedback,
        now ?? new Date()
      )
    );
}

function formatMinuteRange(startMinute: number, endMinute: number) {
  const format = (minute: number) => {
    const normalized = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
    const hours = Math.floor(normalized / 60)
      .toString()
      .padStart(2, '0');
    const minutes = (normalized % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return `${format(startMinute)}-${format(endMinute)}`;
}

export function detectHabitCandidates(input: DetectionInput): HabitCandidate[] {
  const now = input.now ?? new Date();
  const sorted = [
    ...detectManualLightRoutines({ ...input, now }),
    ...detectLongOnLightPatterns({ ...input, now }),
    ...detectInactiveRoomPatterns({ ...input, now }),
    ...detectBedtimeWakeupPatterns({ ...input, now }),
    ...detectArrivalDeparturePatterns({ ...input, now }),
    ...detectEnergySpikePatterns({ ...input, now }),
  ]
    .filter((candidate) => !candidate.blockedReason)
    .filter((candidate) => candidate.confidence >= 0.35)
    .sort(
      (left, right) =>
        right.confidence - left.confidence || right.evidenceCount - left.evidenceCount
    );

  const seen = new Set<string>();
  return sorted.filter((candidate) => {
    const dedupeKey = [
      candidate.detectorId,
      candidate.entityIds.join(','),
      candidate.action,
      candidate.timeWindow.days.join(','),
      candidate.timeWindow.startMinute,
    ].join('|');
    if (seen.has(dedupeKey)) {
      return false;
    }
    seen.add(dedupeKey);
    return true;
  });
}

export function toHabitInsight(candidate: HabitCandidate, now = new Date()): HabitInsight {
  const dayCount = candidate.timeWindow.days.length;
  const evidence = candidate.explanation;
  const summary =
    candidate.detectorId === 'long_on_light'
      ? 'This device tends to stay on longer than usual.'
      : `Seen ${candidate.evidenceCount} times across ${dayCount} ${dayCount === 1 ? 'day' : 'days'} around ${formatMinuteRange(candidate.timeWindow.startMinute, candidate.timeWindow.endMinute)}.`;

  return {
    id: `insight:${candidate.id}`,
    candidateId: candidate.id,
    title:
      candidate.detectorId === 'bedtime_window'
        ? 'Possible bedtime routine'
        : candidate.detectorId === 'wakeup_window'
          ? 'Possible wake-up routine'
          : candidate.detectorId === 'arrival_departure'
            ? 'Possible arrival or departure routine'
            : candidate.detectorId === 'energy_spike'
              ? 'High energy window detected'
              : 'Suggested routine',
    summary,
    confidence: candidate.confidence,
    confidenceLabel: getConfidenceLabel(candidate.confidence),
    evidence,
    suggestedRule:
      candidate.action === 'notify'
        ? undefined
        : {
            id: `rule:${candidate.id}`,
            sourceCandidateId: candidate.id,
            enabled: true,
            scope: 'navet_local',
            trigger: {
              days: candidate.timeWindow.days,
              startMinute: candidate.timeWindow.startMinute,
              endMinute: candidate.timeWindow.endMinute,
              roomId: candidate.roomId,
              occupancy: 'any',
              presence: 'any',
            },
            action: {
              type: candidate.action,
              entityIds: candidate.entityIds,
            },
            safety: {
              allowDomains: ['light', 'switch'],
              requireUserCreated: true,
            },
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          },
    status: 'new',
    createdAt: now.toISOString(),
  };
}

export function buildHabitActivityFeed(input: {
  insights: HabitInsight[];
  feedback: HabitFeedback[];
  rules: HabitRule[];
}) {
  return [
    ...input.feedback.map((item) => ({
      id: `feedback:${item.id}`,
      timestamp: item.timestamp,
      type: item.outcome,
      candidateId: item.candidateId,
    })),
    ...input.rules.map((rule) => ({
      id: `rule:${rule.id}`,
      timestamp: rule.updatedAt,
      type: 'rule',
      candidateId: rule.sourceCandidateId ?? rule.id,
    })),
    ...input.insights.map((insight) => ({
      id: `insight:${insight.id}`,
      timestamp: insight.createdAt,
      type: 'insight',
      candidateId: insight.candidateId,
    })),
  ].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}
