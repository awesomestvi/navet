import { navetAiService } from '@navet/app/features/navet-ai/navet-ai.service';
import { useNavetAiStore } from '@navet/app/features/navet-ai/navet-ai-store';
import {
  applyIntelligencePriorityRanking,
  getIntelligencePriorityTimeBucket,
  type IntelligencePriorityRankRequest,
  type PriorityFeedback,
} from '@navet/core/intelligence-priorities';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HomePriorityEntry } from '../home-priorities';

const FEEDBACK_STORAGE_KEY = 'navet.priority-feedback.v1';
const rankingCache = new Map<string, string[]>();

function readLocalFeedback(): PriorityFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEEDBACK_STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PriorityFeedback => Boolean(item && typeof item === 'object'))
      : [];
  } catch {
    return [];
  }
}

function writeLocalFeedback(feedback: readonly PriorityFeedback[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedback.slice(-250)));
}

export function doesPriorityFeedbackSuppressEntry(
  entry: HomePriorityEntry,
  feedback: PriorityFeedback,
  now: number
) {
  if (entry.candidate.priority === 'critical') return false;
  if (feedback.outcome === 'show_fewer') {
    return (
      feedback.source === entry.candidate.source &&
      feedback.reasonCode === entry.candidate.reasonCode
    );
  }
  if (feedback.candidateId !== entry.candidate.id) return false;
  if (feedback.outcome === 'dismissed') {
    return !feedback.expiresAt || Date.parse(feedback.expiresAt) > now;
  }
  return feedback.outcome === 'snoozed' && Date.parse(feedback.expiresAt ?? '') > now;
}

function fingerprint(entries: readonly HomePriorityEntry[], feedback: readonly PriorityFeedback[]) {
  return JSON.stringify({
    candidates: entries.map(({ candidate }) => [
      candidate.id,
      candidate.reasonCode,
      candidate.urgencyGroup,
    ]),
    feedback: feedback.map((item) => [item.source, item.reasonCode, item.outcome]),
  });
}

export function buildPrivatePriorityRankRequest(
  entries: readonly HomePriorityEntry[],
  feedback: readonly PriorityFeedback[],
  tokenByCandidateId: ReadonlyMap<string, string>
): IntelligencePriorityRankRequest {
  const feedbackCounts = (entry: HomePriorityEntry) => ({
    dismissed: feedback.filter(
      (item) => item.reasonCode === entry.candidate.reasonCode && item.outcome === 'dismissed'
    ).length,
    snoozed: feedback.filter(
      (item) => item.reasonCode === entry.candidate.reasonCode && item.outcome === 'snoozed'
    ).length,
    showFewer: feedback.filter(
      (item) => item.reasonCode === entry.candidate.reasonCode && item.outcome === 'show_fewer'
    ).length,
  });
  return {
    contract: 'navet.ai.priorities.rank',
    version: 1,
    candidates: entries.slice(0, 12).map((entry) => ({
      token: tokenByCandidateId.get(entry.candidate.id) as string,
      source: entry.candidate.source,
      reasonCode: entry.candidate.reasonCode,
      urgencyGroup: entry.candidate.urgencyGroup,
      timeBucket: getIntelligencePriorityTimeBucket(entry.candidate),
      feedback: feedbackCounts(entry),
    })),
  };
}

export function useHomePriorities(entries: readonly HomePriorityEntry[]) {
  const aiState = useNavetAiStore((store) => store.state);
  const [localFeedback, setLocalFeedback] = useState<PriorityFeedback[]>(readLocalFeedback);
  const [rankedIds, setRankedIds] = useState<string[] | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const clear = () => setLocalFeedback([]);
    window.addEventListener('navet-priority-feedback-cleared', clear);
    return () => window.removeEventListener('navet-priority-feedback-cleared', clear);
  }, []);
  const allFeedback = useMemo(
    () => [...(aiState?.priorityFeedback ?? []), ...localFeedback],
    [aiState?.priorityFeedback, localFeedback]
  );
  useEffect(() => {
    const boundaries = [
      ...entries.map((entry) => Date.parse(entry.candidate.expiresAt)),
      ...allFeedback.map((item) => Date.parse(item.expiresAt ?? '')),
    ].filter((value) => Number.isFinite(value) && value > nowTick);
    if (boundaries.length === 0) return;
    const delay = Math.max(250, Math.min(60 * 60 * 1_000, Math.min(...boundaries) - nowTick + 25));
    const timeout = window.setTimeout(() => setNowTick(Date.now()), delay);
    return () => window.clearTimeout(timeout);
  }, [allFeedback, entries, nowTick]);
  const enabledEntries = useMemo(() => {
    const settings = aiState?.settings;
    if (settings?.enabled === false || settings?.priorityFeedEnabled === false) return [];
    return entries.filter((entry) => {
      if (Date.parse(entry.candidate.expiresAt) <= nowTick) return false;
      if (settings?.prioritySources?.[entry.candidate.source] === false) return false;
      return !allFeedback.some((feedback) =>
        doesPriorityFeedbackSuppressEntry(entry, feedback, nowTick)
      );
    });
  }, [aiState?.settings, allFeedback, entries, nowTick]);
  const cacheKey = useMemo(
    () => fingerprint(enabledEntries, allFeedback),
    [allFeedback, enabledEntries]
  );

  useEffect(() => {
    const cached = rankingCache.get(cacheKey);
    if (cached) {
      setRankedIds(cached);
      return;
    }
    setRankedIds(null);
    if (aiState?.capabilities.model.status !== 'ready' || enabledEntries.length < 2) return;
    const controller = new AbortController();
    const requestNonce =
      globalThis.crypto?.randomUUID?.().replaceAll('-', '') ??
      `${Date.now().toString(36)}${Math.random().toString(36).slice(2).padEnd(12, '0')}`;
    const tokenByCandidateId = new Map(
      enabledEntries
        .slice(0, 12)
        .map((entry, index) => [entry.candidate.id, `p${index}_${requestNonce.slice(0, 32)}`])
    );
    void navetAiService
      .rankPriorities(
        buildPrivatePriorityRankRequest(enabledEntries, allFeedback, tokenByCandidateId),
        controller.signal
      )
      .then((response) => {
        const ranked = applyIntelligencePriorityRanking(
          enabledEntries.slice(0, 12).map((entry) => entry.candidate),
          response.orderedTokens,
          tokenByCandidateId
        );
        if (!ranked || controller.signal.aborted) return;
        const ids = ranked.map((candidate) => candidate.id);
        rankingCache.set(cacheKey, ids);
        setRankedIds(ids);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [aiState?.capabilities.model.status, allFeedback, cacheKey, enabledEntries]);

  const rankedEntries = useMemo(() => {
    if (!rankedIds) return enabledEntries;
    const byId = new Map(enabledEntries.map((entry) => [entry.candidate.id, entry]));
    const ranked = rankedIds.flatMap((id) => {
      const entry = byId.get(id);
      return entry ? [entry] : [];
    });
    const rankedSet = new Set(rankedIds);
    return [...ranked, ...enabledEntries.filter((entry) => !rankedSet.has(entry.candidate.id))];
  }, [enabledEntries, rankedIds]);

  const addFeedback = useCallback(
    (entry: HomePriorityEntry, outcome: PriorityFeedback['outcome']) => {
      if (entry.candidate.priority === 'critical') return;
      const now = new Date();
      const feedback: PriorityFeedback = {
        candidateId: entry.candidate.id,
        source: entry.candidate.source,
        reasonCode: entry.candidate.reasonCode,
        outcome,
        timestamp: now.toISOString(),
        expiresAt:
          outcome === 'snoozed'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
            : outcome === 'dismissed'
              ? entry.candidate.expiresAt
              : undefined,
      };
      setLocalFeedback((current) => {
        const next = [...current, feedback];
        writeLocalFeedback(next);
        return next;
      });
      void navetAiService.addPriorityFeedback(feedback).catch(() => undefined);
    },
    []
  );

  return { entries: rankedEntries, addFeedback };
}
