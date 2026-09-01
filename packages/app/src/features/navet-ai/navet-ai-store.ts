import type { InsightFeedback } from '@navet/core/intelligence';
import { create } from 'zustand';
import type { NavetAiState } from './navet-ai.contract';
import { navetAiService } from './navet-ai.service';

interface NavetAiStore {
  state: NavetAiState | null;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  generate: (locale: string) => Promise<void>;
  addFeedback: (feedback: Omit<InsightFeedback, 'id' | 'timestamp'>) => Promise<void>;
  consentToModelDownload: () => Promise<void>;
  cancelModelDownload: () => Promise<void>;
  deleteModel: () => Promise<void>;
  reset: () => Promise<void>;
  updateSettings: (settings: Parameters<typeof navetAiService.updateSettings>[0]) => Promise<void>;
  deletePriorityFeedback: () => Promise<void>;
}

async function run(
  set: (value: Partial<NavetAiStore>) => void,
  operation: () => Promise<NavetAiState>
) {
  set({ loading: true, error: null });
  try {
    set({ state: await operation(), loading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Smart features are unavailable',
      loading: false,
    });
  }
}

let modelDownloadPollId = 0;

async function waitForModel(set: (value: Partial<NavetAiStore>) => void, pollId: number) {
  for (let attempt = 0; attempt < 1_200 && pollId === modelDownloadPollId; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1_000));
    if (pollId !== modelDownloadPollId) return;
    const state = await navetAiService.getState();
    set({ state, error: null });
    if (state.capabilities.model.status !== 'downloading') return;
  }
  set({
    error: 'The model download is still running. You can safely leave this page and return later.',
  });
}

export const useNavetAiStore = create<NavetAiStore>((set) => ({
  state: null,
  loading: false,
  error: null,
  initialize: async () => run(set, navetAiService.getState),
  refresh: async () => run(set, navetAiService.getState),
  generate: async (locale) => run(set, () => navetAiService.generate(locale)),
  addFeedback: async (feedback) => run(set, () => navetAiService.addFeedback(feedback)),
  consentToModelDownload: async () => {
    const pollId = ++modelDownloadPollId;
    await run(set, navetAiService.consentToModelDownload);
    try {
      await waitForModel(set, pollId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Could not check the model download' });
    }
  },
  cancelModelDownload: async () => {
    modelDownloadPollId += 1;
    await run(set, navetAiService.cancelModelDownload);
  },
  deleteModel: async () => {
    modelDownloadPollId += 1;
    await run(set, navetAiService.deleteModel);
  },
  reset: async () => {
    modelDownloadPollId += 1;
    await run(set, navetAiService.reset);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('navet.priority-feedback.v1');
      window.dispatchEvent(new Event('navet-priority-feedback-cleared'));
      window.dispatchEvent(new Event('navet-ai-settings-changed'));
      if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('navet-habits');
    }
  },
  updateSettings: async (settings) => {
    await run(set, () => navetAiService.updateSettings(settings));
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('navet-ai-settings-changed'));
  },
  deletePriorityFeedback: async () => {
    set({ loading: true, error: null });
    try {
      await navetAiService.deletePriorityFeedback();
      set({ state: await navetAiService.getState(), loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Could not delete priority feedback',
        loading: false,
      });
    }
  },
}));
