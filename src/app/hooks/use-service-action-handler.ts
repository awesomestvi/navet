import { useCallback } from 'react';
import { toast } from 'sonner';

interface ServiceActionOptions {
  onError?: (error: unknown) => void;
}

export function useServiceActionHandler() {
  return useCallback(
    async (
      action: () => Promise<void>,
      fallbackMessage: string,
      options?: ServiceActionOptions
    ) => {
      try {
        await action();
      } catch (error) {
        options?.onError?.(error);
        toast.error(error instanceof Error ? error.message : fallbackMessage);
      }
    },
    []
  );
}
