import type { InsightFeedback } from '@navet/core/intelligence';
import {
  NAVET_AI_ENDPOINTS,
  type NavetAiCapabilities,
  type NavetAiChatRequest,
  type NavetAiChatResponse,
  type NavetAiEventBatch,
  type NavetAiSettings,
  type NavetAiState,
} from './navet-ai.contract';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) throw new Error(`Navet AI request failed (${response.status})`);
  return (await response.json()) as T;
}

export const navetAiService = {
  getCapabilities: () => request<NavetAiCapabilities>(NAVET_AI_ENDPOINTS.capabilities),
  getState: (locale = typeof navigator === 'undefined' ? 'en' : navigator.language) =>
    request<NavetAiState>(`${NAVET_AI_ENDPOINTS.state}?locale=${encodeURIComponent(locale)}`),
  appendEvents: (batch: NavetAiEventBatch) =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.events, {
      method: 'POST',
      body: JSON.stringify(batch),
    }),
  addFeedback: (feedback: Omit<InsightFeedback, 'id' | 'timestamp'>) =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.feedback, {
      method: 'POST',
      body: JSON.stringify(feedback),
    }),
  generate: (locale: string) =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.generate, {
      method: 'POST',
      body: JSON.stringify({ locale }),
    }),
  chat: (input: NavetAiChatRequest, signal?: AbortSignal) =>
    request<NavetAiChatResponse>(NAVET_AI_ENDPOINTS.chat, {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    }),
  updateSettings: (settings: Partial<NavetAiSettings>) =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.settings, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),
  consentToModelDownload: () =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.modelConsent, { method: 'POST', body: '{}' }),
  cancelModelDownload: () =>
    request<NavetAiState>(NAVET_AI_ENDPOINTS.modelCancel, { method: 'POST', body: '{}' }),
  deleteModel: () => request<NavetAiState>(NAVET_AI_ENDPOINTS.model, { method: 'DELETE' }),
  reset: () => request<NavetAiState>(NAVET_AI_ENDPOINTS.reset, { method: 'POST', body: '{}' }),
};
