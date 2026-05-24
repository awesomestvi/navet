export const PERSISTED_STATE_EVENT = 'navet:persisted-state';

export function notifyPersistedStateChanged<T>(key: string, value: T) {
  window.dispatchEvent(new CustomEvent(PERSISTED_STATE_EVENT, { detail: { key, value } }));
}
