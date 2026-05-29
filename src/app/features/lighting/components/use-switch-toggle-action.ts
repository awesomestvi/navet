import { dispatchEntityCommand } from '@navet/app/commands';
import { useCallback } from 'react';
import { useServiceActionHandler } from '@/app/hooks';
import { callIntegrationService } from '@/app/services/integration-service-call.service';
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
          await dispatchEntityCommand(
            {
              type: 'turn_on',
              entityId: id,
            },
            providerId
          );
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
          await callIntegrationService({
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
      async () => {
        await dispatchEntityCommand(
          {
            type: nextIsOn ? 'turn_on' : 'turn_off',
            entityId: id,
          },
          providerId
        );
      },
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
