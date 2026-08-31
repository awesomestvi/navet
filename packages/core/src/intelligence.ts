import type { HomeEvent } from './home-events';
import type { IntegrationProviderId } from './integration-providers';

export type InsightDetectorId =
  | 'manual_light_routine'
  | 'long_on_light'
  | 'inactive_room_active_device'
  | 'bedtime_window'
  | 'wakeup_window'
  | 'arrival_departure'
  | 'energy_spike';

export type InsightObservation =
  | 'activation_pattern'
  | 'deactivation_pattern'
  | 'long_duration'
  | 'vacancy_correlation'
  | 'presence_correlation'
  | 'energy_anomaly';

export interface InsightEvidence {
  id: string;
  detectorId: InsightDetectorId;
  category: 'routine' | 'anomaly' | 'efficiency' | 'context';
  observation: InsightObservation;
  providerId: IntegrationProviderId;
  entityIds: string[];
  roomId?: string;
  timeWindow: { startMinute: number; endMinute: number; days: number[] };
  sampleCount: number;
  lastObservedAt: string;
  confidence: number;
  facts: string[];
}

export interface NavetInsight {
  id: string;
  evidenceId: string;
  detectorId: InsightDetectorId;
  category: InsightEvidence['category'];
  observation: InsightObservation;
  title: string;
  summary: string;
  confidence: number;
  confidenceLabel: 'low' | 'medium' | 'high';
  facts: string[];
  roomId?: string;
  entityIds: string[];
  status: 'new' | 'dismissed' | 'snoozed' | 'expired';
  createdAt: string;
  narration?: { modelId: string; locale: string; generatedAt: string };
}

export interface InsightFeedback {
  id: string;
  insightId: string;
  evidenceId: string;
  outcome: 'helpful' | 'not_useful' | 'hide_similar' | 'snoozed' | 'dismissed';
  timestamp: string;
  reason?: 'inaccurate' | 'not_relevant' | 'too_frequent' | 'other';
}

export interface IntelligenceHardwareProfile {
  tier: 'low' | 'medium' | 'high';
  cores?: number;
  memoryGb?: number;
  maxJournalEvents: number;
  detectorBudget: 'minimal' | 'standard' | 'expanded';
  preferredModelId: 'qwen3.5-0.8b' | 'qwen3.5-2b';
}

export interface InsightNarration {
  title: string;
  summary: string;
}

interface DetectionInput {
  events: HomeEvent[];
  feedback: InsightFeedback[];
  profile: IntelligenceHardwareProfile;
  now?: Date;
}

const OBSERVABLE_DOMAINS = new Set(['light', 'switch']);
const BLOCKED_DOMAINS = new Set(['camera', 'lock', 'alarm_control_panel', 'cover', 'garage']);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function dateParts(timestamp: string) {
  const date = new Date(timestamp);
  return { day: date.getDay(), minute: date.getHours() * 60 + date.getMinutes() };
}

export function resolveIntelligenceSunPosition(
  timestamp: string
): NonNullable<HomeEvent['context']['sunPosition']> {
  const hour = new Date(timestamp).getHours();
  if (hour < 5) return 'night';
  if (hour < 7) return 'dawn';
  if (hour < 18) return 'day';
  if (hour < 21) return 'dusk';
  return 'night';
}

function formatMinute(minute: number) {
  const normalized = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function feedbackPenalty(id: string, feedback: InsightFeedback[]) {
  return feedback.reduce((penalty, item) => {
    if (item.evidenceId !== id) return penalty;
    if (item.outcome === 'hide_similar') return penalty + 1;
    if (item.outcome === 'not_useful' || item.outcome === 'dismissed') return penalty + 0.2;
    if (item.outcome === 'snoozed') return penalty + 0.08;
    return item.outcome === 'helpful' ? penalty - 0.04 : penalty;
  }, 0);
}

function stalenessPenalty(timestamp: string, now: Date) {
  const days = Math.max(0, now.getTime() - new Date(timestamp).getTime()) / 86_400_000;
  return clamp(days / 70, 0, 0.35);
}

export function buildIntelligenceHardwareProfile(input: {
  tier: IntelligenceHardwareProfile['tier'];
  cores?: number;
  memoryGb?: number;
}): IntelligenceHardwareProfile {
  const lowMemory = input.memoryGb !== undefined && input.memoryGb < 6;
  return {
    ...input,
    maxJournalEvents: input.tier === 'low' ? 600 : input.tier === 'medium' ? 1500 : 3000,
    detectorBudget:
      input.tier === 'low' ? 'minimal' : input.tier === 'medium' ? 'standard' : 'expanded',
    preferredModelId: input.tier === 'low' || lowMemory ? 'qwen3.5-0.8b' : 'qwen3.5-2b',
  };
}

export function isAllowedIntelligenceDomain(domain: string) {
  return OBSERVABLE_DOMAINS.has(domain) && !BLOCKED_DOMAINS.has(domain);
}

function finalize(
  evidence: Omit<InsightEvidence, 'confidence'> & { score: number },
  feedback: InsightFeedback[],
  now: Date
): InsightEvidence {
  const { score, ...value } = evidence;
  return {
    ...value,
    confidence: clamp(
      score - feedbackPenalty(value.id, feedback) - stalenessPenalty(value.lastObservedAt, now),
      0,
      0.98
    ),
  };
}

function detectRepeatedRoutines(input: DetectionInput): InsightEvidence[] {
  const bucketSize = input.profile.tier === 'low' ? 15 : 10;
  const groups = new Map<
    string,
    { event: HomeEvent; count: number; minute: number; day: number }
  >();
  for (const event of input.events) {
    if (
      !isAllowedIntelligenceDomain(event.domain) ||
      !['turned_on', 'turned_off'].includes(event.action)
    )
      continue;
    if (!['manual', 'navet', 'unknown'].includes(event.source)) continue;
    const { day, minute } = dateParts(event.timestamp);
    const bucket = Math.floor(minute / bucketSize) * bucketSize;
    const key = `${event.canonicalEntityId}|${event.action}|${day}|${bucket}|${event.roomId ?? ''}`;
    const current = groups.get(key);
    groups.set(
      key,
      current
        ? {
            ...current,
            event: current.event.timestamp > event.timestamp ? current.event : event,
            count: current.count + 1,
          }
        : { event, count: 1, minute: bucket, day }
    );
  }
  return [...groups.entries()]
    .filter(([, group]) => group.count >= 3)
    .map(([key, group]) => {
      const isActivation = group.event.action === 'turned_on';
      return finalize(
        {
          id: `manual_light_routine|${key}`,
          detectorId: 'manual_light_routine',
          category: 'routine',
          observation: isActivation ? 'activation_pattern' : 'deactivation_pattern',
          providerId: group.event.providerId,
          entityIds: [group.event.canonicalEntityId],
          roomId: group.event.roomId,
          timeWindow: {
            startMinute: group.minute,
            endMinute: group.minute + bucketSize,
            days: [group.day],
          },
          sampleCount: group.count,
          lastObservedAt: group.event.timestamp,
          facts: [
            `Observed ${group.count} similar ${isActivation ? 'turn-on' : 'turn-off'} events around ${formatMinute(group.minute)}.`,
          ],
          score: clamp(0.34 + group.count * 0.13, 0, 0.94),
        },
        input.feedback,
        input.now ?? new Date()
      );
    });
}

function detectLongDurations(input: DetectionInput): InsightEvidence[] {
  const opened = new Map<string, HomeEvent>();
  const evidence: InsightEvidence[] = [];
  for (const event of input.events) {
    if (!isAllowedIntelligenceDomain(event.domain)) continue;
    if (event.action === 'turned_on') {
      opened.set(event.canonicalEntityId, event);
      continue;
    }
    if (event.action !== 'turned_off') continue;
    const start = opened.get(event.canonicalEntityId);
    if (!start) continue;
    opened.delete(event.canonicalEntityId);
    const minutes =
      (new Date(event.timestamp).getTime() - new Date(start.timestamp).getTime()) / 60_000;
    if (minutes < 180) continue;
    const parts = dateParts(start.timestamp);
    evidence.push(
      finalize(
        {
          id: `long_on_light|${event.canonicalEntityId}|${parts.day}|${Math.floor(parts.minute / 30)}`,
          detectorId: 'long_on_light',
          category: 'efficiency',
          observation: 'long_duration',
          providerId: event.providerId,
          entityIds: [event.canonicalEntityId],
          roomId: event.roomId,
          timeWindow: {
            startMinute: Math.floor(parts.minute / 30) * 30,
            endMinute: Math.floor(parts.minute / 30) * 30 + 30,
            days: [parts.day],
          },
          sampleCount: 1,
          lastObservedAt: event.timestamp,
          facts: [`This device remained on for about ${Math.round(minutes)} minutes.`],
          score: 0.58,
        },
        input.feedback,
        input.now ?? new Date()
      )
    );
  }
  return evidence;
}

function detectVacancy(input: DetectionInput): InsightEvidence[] {
  return input.events
    .filter(
      (event) =>
        event.action === 'turned_on' &&
        isAllowedIntelligenceDomain(event.domain) &&
        event.context.occupancy === 'vacant'
    )
    .map((event) => {
      const parts = dateParts(event.timestamp);
      return finalize(
        {
          id: `inactive_room_active_device|${event.canonicalEntityId}|${event.timestamp}`,
          detectorId: 'inactive_room_active_device',
          category: 'context',
          observation: 'vacancy_correlation',
          providerId: event.providerId,
          entityIds: [event.canonicalEntityId],
          roomId: event.roomId,
          timeWindow: {
            startMinute: parts.minute,
            endMinute: parts.minute + 15,
            days: [parts.day],
          },
          sampleCount: 1,
          lastObservedAt: event.timestamp,
          facts: ['The room was reported vacant when the device changed to on.'],
          score: 0.46,
        },
        input.feedback,
        input.now ?? new Date()
      );
    });
}

function detectEnergy(input: DetectionInput): InsightEvidence[] {
  const groups = new Map<
    string,
    { event: HomeEvent; count: number; minute: number; day: number }
  >();
  for (const event of input.events) {
    if (
      event.action !== 'energy_sampled' ||
      typeof event.currentState !== 'number' ||
      event.currentState < 1500
    )
      continue;
    const { day, minute } = dateParts(event.timestamp);
    const bucket = Math.floor(minute / 30) * 30;
    const key = `${event.roomId ?? 'whole-home'}|${day}|${bucket}`;
    const current = groups.get(key);
    groups.set(
      key,
      current
        ? { ...current, event, count: current.count + 1 }
        : { event, count: 1, minute: bucket, day }
    );
  }
  return [...groups.entries()]
    .filter(([, value]) => value.count >= 3)
    .map(([key, value]) =>
      finalize(
        {
          id: `energy_spike|${key}`,
          detectorId: 'energy_spike',
          category: 'anomaly',
          observation: 'energy_anomaly',
          providerId: value.event.providerId,
          entityIds: [value.event.canonicalEntityId],
          roomId: value.event.roomId,
          timeWindow: {
            startMinute: value.minute,
            endMinute: value.minute + 30,
            days: [value.day],
          },
          sampleCount: value.count,
          lastObservedAt: value.event.timestamp,
          facts: [
            `Energy usage exceeded the local high-usage threshold ${value.count} times in this window.`,
          ],
          score: 0.52,
        },
        input.feedback,
        input.now ?? new Date()
      )
    );
}

function detectPresencePatterns(input: DetectionInput): InsightEvidence[] {
  const bucketSize = input.profile.tier === 'low' ? 30 : 15;
  const groups = new Map<
    string,
    { event: HomeEvent; count: number; minute: number; day: number; arrived: boolean }
  >();
  for (const event of input.events) {
    if (
      event.action !== 'presence_changed' ||
      !['person', 'binary_sensor'].includes(event.domain)
    ) {
      continue;
    }
    const state = String(event.currentState ?? '').toLowerCase();
    const arrived = state === 'home' || state === 'on';
    const departed = state === 'away' || state === 'not_home' || state === 'off';
    if (!arrived && !departed) continue;
    const { day, minute } = dateParts(event.timestamp);
    const bucket = Math.floor(minute / bucketSize) * bucketSize;
    const key = `${event.canonicalEntityId}|${arrived ? 'arrival' : 'departure'}|${day}|${bucket}`;
    const current = groups.get(key);
    groups.set(
      key,
      current
        ? { ...current, event, count: current.count + 1 }
        : { event, count: 1, minute: bucket, day, arrived }
    );
  }
  return [...groups.entries()]
    .filter(([, group]) => group.count >= 3)
    .map(([key, group]) =>
      finalize(
        {
          id: `arrival_departure|${key}`,
          detectorId: 'arrival_departure',
          category: 'context',
          observation: 'presence_correlation',
          providerId: group.event.providerId,
          entityIds: [group.event.canonicalEntityId],
          roomId: group.event.roomId,
          timeWindow: {
            startMinute: group.minute,
            endMinute: group.minute + bucketSize,
            days: [group.day],
          },
          sampleCount: group.count,
          lastObservedAt: group.event.timestamp,
          facts: [
            `Observed ${group.count} similar ${group.arrived ? 'arrival' : 'departure'} states around ${formatMinute(group.minute)}.`,
          ],
          score: clamp(0.32 + group.count * 0.12, 0, 0.9),
        },
        input.feedback,
        input.now ?? new Date()
      )
    );
}

export function detectInsightEvidence(input: DetectionInput): InsightEvidence[] {
  const candidates = [
    ...detectRepeatedRoutines(input),
    ...detectLongDurations(input),
    ...detectVacancy(input),
    ...detectEnergy(input),
    ...detectPresencePatterns(input),
  ]
    .filter((item) => item.confidence >= 0.35)
    .sort(
      (left, right) => right.confidence - left.confidence || right.sampleCount - left.sampleCount
    );
  const seen = new Set<string>();
  return candidates.filter((item) => {
    const key = `${item.detectorId}|${item.entityIds.join(',')}|${item.observation}|${item.timeWindow.startMinute}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function confidenceLabel(confidence: number): NavetInsight['confidenceLabel'] {
  return confidence >= 0.8 ? 'high' : confidence >= 0.55 ? 'medium' : 'low';
}

export function toNavetInsight(
  evidence: InsightEvidence,
  narration?: InsightNarration,
  now = new Date()
): NavetInsight {
  const titles: Record<InsightDetectorId, string> = {
    manual_light_routine: 'A repeated pattern',
    long_on_light: 'A longer running period',
    inactive_room_active_device: 'Activity while the room was vacant',
    bedtime_window: 'A bedtime pattern',
    wakeup_window: 'A morning pattern',
    arrival_departure: 'A presence-related pattern',
    energy_spike: 'A high-energy window',
  };
  const range = `${formatMinute(evidence.timeWindow.startMinute)}-${formatMinute(evidence.timeWindow.endMinute)}`;
  return {
    id: `insight:${evidence.id}`,
    evidenceId: evidence.id,
    detectorId: evidence.detectorId,
    category: evidence.category,
    observation: evidence.observation,
    title: narration?.title ?? titles[evidence.detectorId],
    summary:
      narration?.summary ??
      `Observed ${evidence.sampleCount} ${evidence.sampleCount === 1 ? 'sample' : 'samples'} around ${range}.`,
    confidence: evidence.confidence,
    confidenceLabel: confidenceLabel(evidence.confidence),
    facts: evidence.facts,
    roomId: evidence.roomId,
    entityIds: evidence.entityIds,
    status: 'new',
    createdAt: now.toISOString(),
  };
}

const FORBIDDEN_NARRATION =
  /\b(turn on|turn off|unlock|lock|arm|disarm|run|execute|trigger|automate|automation|command|service call)\b/i;

export function validateInsightNarration(value: unknown): InsightNarration | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.title !== 'string' || typeof candidate.summary !== 'string') return null;
  if (FORBIDDEN_NARRATION.test(`${candidate.title} ${candidate.summary}`)) return null;
  if (candidate.title.length > 80 || candidate.summary.length > 280) return null;
  return { title: candidate.title.trim(), summary: candidate.summary.trim() };
}
