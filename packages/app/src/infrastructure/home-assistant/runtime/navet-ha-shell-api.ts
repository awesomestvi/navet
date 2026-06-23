export const NAVET_HOME_ASSISTANT_SHELL_GLOBAL = '__NAVET_HA_SHELL__';
export const NAVET_HOME_ASSISTANT_SHELL_EVENT = 'navet-home-assistant-shell-change';
export const NAVET_PANEL_FRONTEND_PATH = 'navet';

export interface NavetHomeAssistantShellSnapshot {
  active: boolean;
  available: boolean;
  kioskEnabled: boolean;
}

export type NavetHomeAssistantShellListener = (snapshot: NavetHomeAssistantShellSnapshot) => void;

export interface NavetHomeAssistantShellApi {
  available: boolean;
  getSnapshot: () => NavetHomeAssistantShellSnapshot;
  isKioskEnabled: () => boolean;
  setKioskEnabled: (enabled: boolean) => Promise<boolean>;
  openSidebar: () => Promise<boolean>;
  navigateHome: () => Promise<boolean>;
  subscribe: (listener: NavetHomeAssistantShellListener) => () => void;
}

declare global {
  interface Window {
    __NAVET_HA_SHELL__?: NavetHomeAssistantShellApi;
  }
}
