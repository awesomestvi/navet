import { create } from 'zustand';
import { STORAGE_KEYS } from '../constants/storage-keys';
import {
  clearStoredSessionConfig,
  normalizeSessionConfig,
  readInitialSessionConfig,
  type SessionConfig,
  writeStoredSessionConfig,
} from '../session/session';
import { useConfigStore } from './config-store';
import { homeAssistantStore } from './home-assistant-store';

type AuthConfig = SessionConfig;

export interface AuthState {
  isAuthenticated: boolean;
  config: AuthConfig | null;
  login: (url: string, token: string) => Promise<boolean>;
  logout: () => void;
}

const initialAuthConfig = readInitialSessionConfig(STORAGE_KEYS.authConfig);

export const useAuthStore = create<AuthState>()((set) => ({
  config: initialAuthConfig,
  isAuthenticated: initialAuthConfig !== null,

  login: async (url: string, token: string): Promise<boolean> => {
    const authConfig = normalizeSessionConfig({ url, token });
    set({ config: authConfig, isAuthenticated: true });
    writeStoredSessionConfig(STORAGE_KEYS.authConfig, authConfig);

    // Keep the connection config in sync with the authenticated session
    const saved = await useConfigStore.getState().saveConfig(authConfig);
    return saved;
  },

  logout: () => {
    homeAssistantStore.getState().disconnect();
    set({ config: null, isAuthenticated: false });
    clearStoredSessionConfig(STORAGE_KEYS.authConfig);
    useConfigStore.getState().clearConfig();
  },
}));

export function useAuth<T>(selector: (state: AuthState) => T): T {
  return useAuthStore(selector);
}
