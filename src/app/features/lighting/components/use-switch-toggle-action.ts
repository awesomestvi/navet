import { useCallback } from 'react';
import { useServiceActionHandler } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';

interface UseSwitchToggleActionParams {
  id: string;
  isOn: boolean;
  setIsOn: (next: boolean) => void;
  resetTimerRef: React.MutableRefObject<number | null>;
  resolvedServiceDomain: string;
  resolvedServiceAction: string;
  updateSwitchFailedMessage: string;
}

export function useSwitchToggleAction({
  id,
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
          await homeAssistantService.callService(
            resolvedServiceDomain,
            'turn_on',
            {},
            { entity_id: id }
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
          await homeAssistantService.callService(
            resolvedServiceDomain,
            'press',
            {},
            { entity_id: id }
          );
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
        homeAssistantService.callService(
          resolvedServiceDomain,
          nextIsOn ? 'turn_on' : 'turn_off',
          {},
          { entity_id: id }
        ),
      updateSwitchFailedMessage,
      {
        onError: () => setIsOn(!nextIsOn),
      }
    );
  }, [
    id,
    isOn,
    runAction,
    resolvedServiceAction,
    resolvedServiceDomain,
    resetTimerRef,
    setIsOn,
    updateSwitchFailedMessage,
  ]);
}
