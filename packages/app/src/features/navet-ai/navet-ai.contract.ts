import type { HomeEvent } from '@navet/core/home-events';
import type { InsightFeedback, NavetInsight } from '@navet/core/intelligence';
import type {
  IntelligenceControlOperation,
  IntelligenceEntityReference,
  IntelligenceStateAnswer,
} from '@navet/core/intelligence-chat';

export const NAVET_AI_ENDPOINTS = {
  capabilities: '/__navet_ai__/capabilities',
  state: '/__navet_ai__/state',
  events: '/__navet_ai__/events',
  feedback: '/__navet_ai__/feedback',
  generate: '/__navet_ai__/generate',
  chat: '/__navet_ai__/chat',
  settings: '/__navet_ai__/settings',
  modelConsent: '/__navet_ai__/model-consent',
  modelCancel: '/__navet_ai__/model-cancel',
  model: '/__navet_ai__/model',
  reset: '/__navet_ai__/reset',
} as const;

export interface NavetAiSettings {
  enabled: boolean;
  dailyGenerationEnabled: boolean;
  locale: string;
  modelDownloadConsented: boolean;
}

export interface NavetAiCapabilities {
  available: boolean;
  readOnly: true;
  supportsHistoryBackfill: boolean;
  storageOwner: 'installation';
  rawRetentionDays: 30;
  aggregateRetentionMonths: 12;
  model: {
    status: 'not_downloaded' | 'downloading' | 'ready' | 'error';
    selectedId: 'qwen3.5-0.8b' | 'qwen3.5-2b';
    downloadBytes?: number;
    downloadedBytes?: number;
  };
}

export interface NavetAiState {
  contract: 'navet.ai';
  version: 1;
  settings: NavetAiSettings;
  capabilities: NavetAiCapabilities;
  insights: NavetInsight[];
  feedback: InsightFeedback[];
  eventCount: number;
  lastGeneratedAt: string | null;
  historyBackfilledAt: string | null;
}

export interface NavetAiEventBatch {
  events: HomeEvent[];
  backfillComplete?: boolean;
}

export interface NavetAiChatRequest {
  text: string;
  locale: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  entities: IntelligenceEntityReference[];
}

export interface NavetAiChatResponse {
  contract: 'navet.ai.chat';
  version: 1;
  modelId: NavetAiCapabilities['model']['selectedId'];
  reply: string;
  answer?: IntelligenceStateAnswer;
  readOnly: true;
  executionRequested: boolean;
  suggestions: Array<{
    operation: IntelligenceControlOperation;
    targets: Array<{ id: string; name: string; room?: string }>;
  }>;
}
