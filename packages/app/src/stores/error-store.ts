import { create } from 'zustand';

/** Global app error shown by {@link ErrorDisplay} (connection failures, fatal UI errors, etc.). */
export interface AppErrorInfo {
  message: string;
  details?: string;
  timestamp: number;
}

export interface ErrorStoreState {
  error: AppErrorInfo | null;
  setError: (message: string, details?: string) => void;
  clearError: () => void;
}

export const useErrorStore = create<ErrorStoreState>()((set) => ({
  error: null,

  setError: (message, details) => {
    set({
      error: {
        message,
        details,
        timestamp: Date.now(),
      },
    });
  },

  clearError: () => set({ error: null }),
}));
