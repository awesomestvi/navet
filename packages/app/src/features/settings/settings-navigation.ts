import { useNavigationStore } from '@navet/app/stores/navigation-store';
import { notifyPersistedStateChanged } from '@navet/app/utils/persisted-state-events';
import { storage } from '@navet/app/utils/storage';

export type SettingsTabId =
  | 'appearance'
  | 'localization'
  | 'interaction'
  | 'dashboard'
  | 'habits'
  | 'experimental'
  | 'system'
  | 'project';

export const SETTINGS_TAB_STORAGE_KEY = 'navet-settings-active-tab';
export const SETTINGS_DETAIL_HISTORY_KEY = 'navetSettingsDetail';

export function setSettingsActiveTab(tab: SettingsTabId) {
  storage.set(SETTINGS_TAB_STORAGE_KEY, tab);
  notifyPersistedStateChanged(SETTINGS_TAB_STORAGE_KEY, tab);
}

export function openSettingsTab(tab: SettingsTabId) {
  setSettingsActiveTab(tab);
  useNavigationStore.getState().setActiveSection('settings');
  window.history.replaceState(
    { ...window.history.state, [SETTINGS_DETAIL_HISTORY_KEY]: true },
    '',
    window.location.href
  );
}
