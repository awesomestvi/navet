import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { IntegrationProviderId } from '@navet/app/types/provider';

const MAX_PROMPTS_PER_PROVIDER = 50;

export type AssistPromptHistoryKey = IntegrationProviderId | 'navet_ai';

type AssistPromptHistory = Partial<Record<AssistPromptHistoryKey, string[]>>;

function readStoredHistory(): AssistPromptHistory {
  if (typeof window === 'undefined') return {};

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEYS.assistPromptHistory);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => Array.isArray(value))
        .map(([providerId, value]) => [
          providerId,
          (value as unknown[])
            .filter(
              (prompt): prompt is string => typeof prompt === 'string' && prompt.trim() !== ''
            )
            .slice(0, MAX_PROMPTS_PER_PROVIDER),
        ])
    ) as AssistPromptHistory;
  } catch {
    return {};
  }
}

function writeStoredHistory(history: AssistPromptHistory) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(STORAGE_KEYS.assistPromptHistory, JSON.stringify(history));
  } catch {
    // Prompt recall is an enhancement; unavailable storage must not prevent Assist from working.
  }
}

export function readAssistPromptHistory(providerId: AssistPromptHistoryKey): string[] {
  return readStoredHistory()[providerId] ?? [];
}

export function rememberAssistPrompt(
  providerId: AssistPromptHistoryKey,
  submittedText: string
): string[] {
  const prompt = submittedText.trim();
  const history = readStoredHistory();
  const current = history[providerId] ?? [];

  if (!prompt) return current;

  const next = [prompt, ...current.filter((entry) => entry !== prompt)].slice(
    0,
    MAX_PROMPTS_PER_PROVIDER
  );
  writeStoredHistory({ ...history, [providerId]: next });
  return next;
}
