export type IntelligencePrioritySource =
  | 'security'
  | 'chores'
  | 'weather'
  | 'calendar'
  | 'maintenance'
  | 'energy';

export type IntelligencePriorityLevel = 'critical' | 'attention';

export type IntelligenceUrgencyGroup =
  | 'active_critical_safety'
  | 'overdue_or_approval'
  | 'due_soon'
  | 'due_today'
  | 'advisory';

export type IntelligenceSharedDisplayPolicy = 'safe' | 'summary_only' | 'hidden';

export type IntelligencePriorityReasonCode =
  | 'security_critical'
  | 'security_warning'
  | 'security_active'
  | 'safety_device_unavailable'
  | 'chore_overdue'
  | 'chore_approval'
  | 'chore_due_today'
  | 'weather_adverse_soon'
  | 'calendar_due_soon'
  | 'calendar_all_day_today'
  | 'battery_critical'
  | 'repair_warning'
  | 'repair_error'
  | 'energy_higher_than_usual';

export interface IntelligencePrioritySourceReference {
  providerId?: string;
  occurrenceId?: string;
  section: 'security' | 'tasks' | 'energy' | 'settings' | 'home';
}

export interface IntelligencePriorityCandidate {
  id: string;
  source: IntelligencePrioritySource;
  reasonCode: IntelligencePriorityReasonCode;
  priority: IntelligencePriorityLevel;
  urgencyGroup: IntelligenceUrgencyGroup;
  createdAt: string;
  startsAt?: string;
  expiresAt: string;
  sourceReference: IntelligencePrioritySourceReference;
  sharedDisplayPolicy: IntelligenceSharedDisplayPolicy;
  available?: boolean;
  providerSupported?: boolean;
  /** Allowlisted, structured facts for deterministic UI copy. Never free-form provider text. */
  facts: Readonly<Record<string, string | number | boolean>>;
}

export interface IntelligencePriorityRankItem {
  token: string;
  source: IntelligencePrioritySource;
  reasonCode: IntelligencePriorityReasonCode;
  urgencyGroup: IntelligenceUrgencyGroup;
  timeBucket: 'now' | 'within_2_hours' | 'within_6_hours' | 'today' | 'overdue' | 'advisory';
  feedback: { dismissed: number; snoozed: number; showFewer: number };
}

export interface IntelligencePriorityRankRequest {
  contract: 'navet.ai.priorities.rank';
  version: 1;
  candidates: IntelligencePriorityRankItem[];
}

export interface IntelligencePriorityRankResponse {
  contract: 'navet.ai.priorities.rank';
  version: 1;
  orderedTokens: string[];
}

export interface PriorityFeedback {
  candidateId: string;
  source: IntelligencePrioritySource;
  reasonCode: IntelligencePriorityReasonCode;
  outcome: 'dismissed' | 'snoozed' | 'show_fewer';
  timestamp: string;
  expiresAt?: string;
}

export const INTELLIGENCE_URGENCY_ORDER: Record<IntelligenceUrgencyGroup, number> = {
  active_critical_safety: 0,
  overdue_or_approval: 1,
  due_soon: 2,
  due_today: 3,
  advisory: 4,
};

export function prepareIntelligencePriorityCandidates(
  candidates: readonly IntelligencePriorityCandidate[],
  now = new Date()
): IntelligencePriorityCandidate[] {
  const known = new Set<string>();
  const nowMs = now.getTime();
  return candidates
    .filter((candidate) => {
      if (candidate.available === false || candidate.providerSupported === false) return false;
      if (known.has(candidate.id) || !Number.isFinite(Date.parse(candidate.expiresAt)))
        return false;
      if (Date.parse(candidate.expiresAt) <= nowMs) return false;
      known.add(candidate.id);
      return true;
    })
    .map((candidate, index) => ({ candidate, index }))
    .sort(
      (left, right) =>
        INTELLIGENCE_URGENCY_ORDER[left.candidate.urgencyGroup] -
          INTELLIGENCE_URGENCY_ORDER[right.candidate.urgencyGroup] ||
        Date.parse(left.candidate.startsAt ?? left.candidate.createdAt) -
          Date.parse(right.candidate.startsAt ?? right.candidate.createdAt) ||
        left.index - right.index
    )
    .map(({ candidate }) => candidate);
}

export function applyIntelligencePriorityRanking(
  candidates: readonly IntelligencePriorityCandidate[],
  orderedTokens: readonly string[],
  tokenByCandidateId: ReadonlyMap<string, string>
): IntelligencePriorityCandidate[] | null {
  const prepared = prepareIntelligencePriorityCandidates(candidates);
  if (prepared.length !== orderedTokens.length || prepared.length !== tokenByCandidateId.size) {
    return null;
  }
  const candidateByToken = new Map(
    prepared.map((candidate) => [tokenByCandidateId.get(candidate.id), candidate] as const)
  );
  if (candidateByToken.has(undefined) || new Set(orderedTokens).size !== orderedTokens.length) {
    return null;
  }
  const ranked = orderedTokens.map((token) => candidateByToken.get(token));
  if (ranked.some((candidate) => !candidate)) return null;
  const safeRanked = ranked as IntelligencePriorityCandidate[];
  for (let index = 0; index < safeRanked.length; index += 1) {
    if (safeRanked[index].urgencyGroup !== prepared[index].urgencyGroup) return null;
  }
  return safeRanked;
}

export function getIntelligencePriorityTimeBucket(
  candidate: IntelligencePriorityCandidate,
  now = new Date()
): IntelligencePriorityRankItem['timeBucket'] {
  if (candidate.urgencyGroup === 'overdue_or_approval') return 'overdue';
  if (candidate.urgencyGroup === 'active_critical_safety') return 'now';
  if (candidate.urgencyGroup === 'due_today') return 'today';
  const startsAt = Date.parse(candidate.startsAt ?? '');
  const delta = startsAt - now.getTime();
  if (Number.isFinite(delta) && delta <= 2 * 60 * 60 * 1_000) return 'within_2_hours';
  if (Number.isFinite(delta) && delta <= 6 * 60 * 60 * 1_000) return 'within_6_hours';
  return 'advisory';
}
