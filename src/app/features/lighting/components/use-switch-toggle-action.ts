import { useCallback } from 'react';
import { useServiceActionHandler } from '@/app/hooks';
import { dispatchEntityAction } from '@/app/services/integration-action.service';
import type { IntegrationProviderId } from '@/app/types/provider';

interface UseSwitchToggleActionParams {
  id: string;
  providerId?: IntegrationProviderId;
  isOn: boolean;
  setIsOn: (next: boolean) => void;
  resetTimerRef: React.MutableRefObject<number | null>;
  resolvedServiceDomain: string;
  resolvedServiceAction: string;
  updateSwitchFailedMessage: string;
}

export function useSwitchToggleAction({
  id,
  providerId,
  isOn,
  setIsOn,
  resetTimerRef,
  resolvedServiceDomain,
  resolvedServiceAction,
  updateSwitchFailedMessage,
}: UseSwitchToggleActionParams) {
  const runAction = useServiceActionHandler();

  return useCallback(() => {
    if (resolvedServiceAction === 'turn_on') {
      setIsOn(true);
      void runAction(
        async () => {
          await dispatchEntityAction({
            providerId,
            entityId: id,
            domain: resolvedServiceDomain,
            service: 'turn_on',
          });
          resetTimerRef.current = window.setTimeout(() => setIsOn(false), 700);
        },
        updateSwitchFailedMessage,
        {
          onError: () => setIsOn(false),
        }
      );
      return;
    }

    if (resolvedServiceAction === 'press') {
      setIsOn(true);
      void runAction(
        async () => {
          await dispatchEntityAction({
            providerId,
            entityId: id,
            domain: resolvedServiceDomain,
            service: 'press',
          });
          resetTimerRef.current = window.setTimeout(() => setIsOn(false), 500);
        },
        updateSwitchFailedMessage,
        {
          onError: () => setIsOn(false),
        }
      );
      return;
    }

    const nextIsOn = !isOn;
    setIsOn(nextIsOn);
    void runAction(
      () =>
        dispatchEntityAction({
          providerId,
          entityId: id,
          domain: resolvedServiceDomain,
          service: nextIsOn ? 'turn_on' : 'turn_off',
        }),
      updateSwitchFailedMessage,
      {
        onError: () => setIsOn(!nextIsOn),
      }
    );
  }, [
    id,
    providerId,
    isOn,
    runAction,
    resolvedServiceAction,
    resolvedServiceDomain,
    resetTimerRef,
    setIsOn,
    updateSwitchFailedMessage,
  ]);
}
