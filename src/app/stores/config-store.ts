import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  clearStoredSessionConfig,
  isUsableSessionToken,
  normalizeSessionConfig,
  readInitialSessionConfig,
  type SessionConfig,
  writeStoredSessionConfig,
} from '../session/session';
import {
  isRuntimeHostedHomeAssistantSession,
  resolveHomeAssistantConnectionUrl,
} from '../utils/home-assistant-connection-target';

export type HAConfig = SessionConfig;

export interface ConfigState {
  config: HAConfig | null;
  isConfigured: boolean;
  saveConfig: (config: HAConfig) => Promise<boolean>;
  testConnection: (url: string, token: string) => Promise<boolean>;
  clearConfig: () => void;
}

const initialConfig = (() => {
  try {
    return readInitialSessionConfig(STORAGE_KEYS.haConfig);
  } catch (error) {
    console.error('[ConfigStore] Failed to read initial config:', error);
    return null;
  }
})();

export const useConfigStore = create<ConfigState>()((set) => ({
  config: initialConfig,
  isConfigured: initialConfig !== null,

  testConnection: async (url: string, token: string): Promise<boolean> => {
    try {
      const configToTest = normalizeSessionConfig({ url, token });
      try {
        new URL(configToTest.url);
      } catch (error) {
        console.error('[ConfigStore] Invalid URL format:', error);
        return false;
      }
      if (!isUsableSessionToken(configToTest.token)) {
        console.error('[ConfigStore] Invalid token format');
        return false;
      }
      const connectionUrl = resolveHomeAssistantConnectionUrl(configToTest);
      if (isRuntimeHostedHomeAssistantSession(configToTest)) {
        return true;
      }

      const response = await fetch(`${connectionUrl}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${configToTest.token}`,
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
      return response.ok;
    } catch (error) {
      console.error('[ConfigStore] Connection test failed:', error);
      return false;
    }
  },

  saveConfig: async (newConfig: HAConfig): Promise<boolean> => {
    try {
      const configToSave = normalizeSessionConfig(newConfig);
      set({ config: configToSave, isConfigured: true });
      writeStoredSessionConfig(STORAGE_KEYS.haConfig, configToSave);
      return true;
    } catch (error) {
      console.error('[ConfigStore] Failed to save config:', error);
      return false;
    }
  },

  clearConfig: () => {
    set({ config: null, isConfigured: false });
    clearStoredSessionConfig(STORAGE_KEYS.haConfig);
  },
}));

export function useConfig<T>(selector: (state: ConfigState) => T): T {
  return useConfigStore(selector);
}
