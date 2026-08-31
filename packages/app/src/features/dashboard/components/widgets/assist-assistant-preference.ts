import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { AssistMode } from './assist-assistant-switcher';

const DEFAULT_ASSISTANT_MODE: AssistMode = 'home_assistant';

export function readAssistAssistantMode(): AssistMode {
  if (typeof window === 'undefined') return DEFAULT_ASSISTANT_MODE;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.assistAssistantMode);
    return stored === 'navet_ai' || stored === 'home_assistant' ? stored : DEFAULT_ASSISTANT_MODE;
  } catch {
    return DEFAULT_ASSISTANT_MODE;
  }
}

export function rememberAssistAssistantMode(mode: AssistMode) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEYS.assistAssistantMode, mode);
  } catch {
    // Remembering the selector is an enhancement; Assist must still work without storage.
  }
}
