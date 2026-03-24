import { createContext, type ReactNode, useCallback, useState } from 'react';
import { useI18n } from '@/app/i18n';

interface LoadingContextType {
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const defaultMessage = t('common.loading');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(defaultMessage);

  const setLoading = useCallback(
    (loading: boolean, message?: string) => {
      setIsLoading(loading);
      if (message) {
        setLoadingMessage(message);
      } else if (!loading) {
        setLoadingMessage(defaultMessage);
      }
    },
    [defaultMessage]
  );

  const startLoading = useCallback(
    (message: string = defaultMessage) => {
      setIsLoading(true);
      setLoadingMessage(message);
    },
    [defaultMessage]
  );

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(defaultMessage);
  }, [defaultMessage]);

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        loadingMessage,
        setLoading,
        startLoading,
        stopLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}
