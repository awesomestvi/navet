import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  clearStoredSessionConfig,
  normalizeSessionConfig,
  readInitialSessionConfig,
  type SessionConfig,
  writeStoredSessionConfig,
} from '../session/session';

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
      const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
      try {
        new URL(cleanUrl);
      } catch (error) {
        console.error('[ConfigStore] Invalid URL format:', error);
        return false;
      }
      const response = await fetch(`${cleanUrl}/api/`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
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
