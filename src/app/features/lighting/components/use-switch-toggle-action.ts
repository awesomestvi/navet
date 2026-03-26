import { useCallback } from 'react';
import { toast } from 'sonner';
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
  return useCallback(() => {
    if (resolvedServiceAction === 'turn_on') {
      setIsOn(true);
      void homeAssistantService
        .callService(resolvedServiceDomain, 'turn_on', {}, { entity_id: id })
        .then(() => {
          resetTimerRef.current = window.setTimeout(() => setIsOn(false), 700);
        })
        .catch((error) => {
          setIsOn(false);
          toast.error(error instanceof Error ? error.message : updateSwitchFailedMessage);
        });
      return;
    }

    if (resolvedServiceAction === 'press') {
      setIsOn(true);
      void homeAssistantService
        .callService(resolvedServiceDomain, 'press', {}, { entity_id: id })
        .then(() => {
          resetTimerRef.current = window.setTimeout(() => setIsOn(false), 500);
        })
        .catch((error) => {
          setIsOn(false);
          toast.error(error instanceof Error ? error.message : updateSwitchFailedMessage);
        });
      return;
    }

    const nextIsOn = !isOn;
    setIsOn(nextIsOn);
    void homeAssistantService
      .callService(resolvedServiceDomain, nextIsOn ? 'turn_on' : 'turn_off', {}, { entity_id: id })
      .catch((error) => {
        setIsOn(!nextIsOn);
        toast.error(error instanceof Error ? error.message : updateSwitchFailedMessage);
      });
  }, [
    id,
    isOn,
    resolvedServiceAction,
    resolvedServiceDomain,
    resetTimerRef,
    setIsOn,
    updateSwitchFailedMessage,
  ]);
}
