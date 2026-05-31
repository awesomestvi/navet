import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import {
  buildHabitActivityFeed,
  buildHardwareProfile,
  detectHabitCandidates,
  type HabitFeedback,
  type HabitInsight,
  type HabitRule,
  type HardwareProfile,
  toHabitInsight,
} from '@navet/core/habits';
import type { HomeEvent } from '@navet/core/home-events';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { habitStorage, trimEvents } from './habit-storage';

export interface HabitActivityItem {
  id: string;
  timestamp: string;
  type: string;
  candidateId: string;
}

interface HabitStoreState {
  enabled: boolean;
  debugEnabled: boolean;
  loading: boolean;
  initialized: boolean;
  hardwareProfile: HardwareProfile;
  events: HomeEvent[];
  insights: HabitInsight[];
  feedback: HabitFeedback[];
  rules: HabitRule[];
  activity: HabitActivityItem[];
  lastRunAt: string | null;
  setEnabled: (enabled: boolean) => void;
  setDebugEnabled: (enabled: boolean) => void;
  initialize: () => Promise<void>;
  appendEvent: (event: HomeEvent) => Promise<void>;
  addFeedback: (input: Omit<HabitFeedback, 'id' | 'timestamp'>) => Promise<HabitFeedback>;
  saveRule: (rule: HabitRule) => Promise<void>;
  deleteRule: (ruleId: string) => Promise<void>;
  resetLocalData: () => Promise<void>;
  recompute: () => void;
}

function createFeedbackId(candidateId: string, outcome: HabitFeedback['outcome']) {
  return `feedback:${candidateId}:${outcome}:${Date.now()}`;
}

function createHardwareProfile(): HardwareProfile {
  const tier = detectDeviceTier();

  return buildHardwareProfile({
    tier,
    cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
    memoryGb:
      typeof navigator !== 'undefined'
        ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
        : undefined,
  });
}

function applyInsightStatus(insight: HabitInsight, feedback: HabitFeedback[]): HabitInsight | null {
  const latest = [...feedback]
    .filter((item) => item.candidateId === insight.candidateId)
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0];

  if (!latest) {
    return insight;
  }

  const ageMs = Date.now() - new Date(latest.timestamp).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (latest.outcome === 'dismissed' && ageDays < 3) {
    return null;
  }

  if (latest.outcome === 'remind_later' && ageDays < 1) {
    return null;
  }

  if ((latest.outcome === 'accepted' || latest.outcome === 'created_rule') && ageDays < 14) {
    return null;
  }

  return {
    ...insight,
    status:
      latest.outcome === 'dismissed'
        ? 'dismissed'
        : latest.outcome === 'remind_later'
          ? 'deferred'
          : latest.outcome === 'accepted' || latest.outcome === 'created_rule'
            ? 'accepted'
            : insight.status,
  };
}

export const useHabitStore = create<HabitStoreState>()(
  persist(
    (set, get) => ({
      enabled: true,
      debugEnabled: false,
      loading: false,
      initialized: false,
      hardwareProfile: createHardwareProfile(),
      events: [],
      insights: [],
      feedback: [],
      rules: [],
      activity: [],
      lastRunAt: null,
      setEnabled: (enabled) => {
        set({ enabled });
        get().recompute();
      },
      setDebugEnabled: (debugEnabled) => set({ debugEnabled }),
      initialize: async () => {
        if (get().initialized || get().loading) {
          return;
        }

        set({ loading: true });
        const [events, feedback, rules] = await Promise.all([
          habitStorage.listEvents(),
          habitStorage.listFeedback(),
          habitStorage.listRules(),
        ]);

        set({
          initialized: true,
          loading: false,
          events,
          feedback,
          rules,
        });
        get().recompute();
      },
      appendEvent: async (event) => {
        const hardwareProfile = get().hardwareProfile;
        await habitStorage.appendEvent(event);
        await trimEvents(hardwareProfile.maxJournalEvents);

        const events = [...get().events, event]
          .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
          .slice(-hardwareProfile.maxJournalEvents);
        set({ events });
        get().recompute();
      },
      addFeedback: async (input) => {
        const feedback: HabitFeedback = {
          id: createFeedbackId(input.candidateId, input.outcome),
          timestamp: new Date().toISOString(),
          ...input,
        };
        await habitStorage.saveFeedback(feedback);
        set({
          feedback: [...get().feedback, feedback].sort((left, right) =>
            left.timestamp.localeCompare(right.timestamp)
          ),
        });
        get().recompute();
        return feedback;
      },
      saveRule: async (rule) => {
        await habitStorage.saveRule(rule);
        const rules = [...get().rules.filter((item) => item.id !== rule.id), rule].sort(
          (left, right) => left.updatedAt.localeCompare(right.updatedAt)
        );
        set({ rules });
        get().recompute();
      },
      deleteRule: async (ruleId) => {
        await habitStorage.deleteRule(ruleId);
        set({ rules: get().rules.filter((rule) => rule.id !== ruleId) });
        get().recompute();
      },
      resetLocalData: async () => {
        await Promise.all([
          habitStorage.clearEvents(),
          habitStorage.clearFeedback(),
          habitStorage.clearRules(),
        ]);
        set({
          events: [],
          feedback: [],
          rules: [],
          insights: [],
          activity: [],
          lastRunAt: null,
        });
      },
      recompute: () => {
        const state = get();
        if (!state.enabled) {
          set({
            insights: [],
            activity: buildHabitActivityFeed({
              insights: [],
              feedback: state.feedback,
              rules: state.rules,
            }),
            lastRunAt: new Date().toISOString(),
          });
          return;
        }

        const candidates = detectHabitCandidates({
          events: state.events,
          feedback: state.feedback,
          rules: state.rules,
          profile: state.hardwareProfile,
        });
        const insights = candidates
          .map((candidate) => toHabitInsight(candidate))
          .map((insight) => applyInsightStatus(insight, state.feedback))
          .filter((insight): insight is HabitInsight => insight !== null);

        set({
          insights,
          activity: buildHabitActivityFeed({
            insights,
            feedback: state.feedback,
            rules: state.rules,
          }),
          lastRunAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'navet-habit-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        debugEnabled: state.debugEnabled,
      }),
    }
  )
);
