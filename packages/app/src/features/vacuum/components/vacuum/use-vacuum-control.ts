import { dispatchEntityCommand } from '@navet/app/commands';
import { useI18n, useServiceActionHandler } from '@navet/app/hooks';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { VacuumStatus } from './vacuum-utils';

interface UseVacuumControlProps {
  entityId: string;
  providerId?: IntegrationProviderId;
  initialStatus: VacuumStatus;
  currentFanSpeed?: string;
}

interface UseVacuumControlReturn {
  currentStatus: VacuumStatus;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  isUpdatingFanSpeed: boolean;
  displayFanSpeed?: string;
  handleStartCleaning: () => void;
  handleStartAreaCleaning: (areaIds: string[]) => void;
  handlePause: () => void;
  handleStop: () => void;
  handleReturnHome: () => void;
  handleLocate: () => void;
  handleCleanSpot: () => void;
  handleSetFanSpeed: (fanSpeed: string) => void;
}

export function useVacuumControl({
  entityId,
  providerId,
  initialStatus,
  currentFanSpeed,
}: UseVacuumControlProps): UseVacuumControlReturn {
  // Status is derived from the HA entity prop — no local simulation needed.
  // The parent card receives initialStatus from the HA store and re-renders when it changes.
  const currentStatus = initialStatus;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUpdatingFanSpeed, setIsUpdatingFanSpeed] = useState(false);
  const [pendingFanSpeed, setPendingFanSpeed] = useState<string | undefined>(undefined);
  const previousCurrentFanSpeedRef = useRef(currentFanSpeed);
  const runAction = useServiceActionHandler();
  const { t } = useI18n();

  useEffect(() => {
    if (!pendingFanSpeed) {
      previousCurrentFanSpeedRef.current = currentFanSpeed;
      return;
    }

    const previousCurrentFanSpeed = previousCurrentFanSpeedRef.current;
    const liveFanSpeedChanged = currentFanSpeed !== previousCurrentFanSpeed;

    if (liveFanSpeedChanged && currentFanSpeed) {
      setPendingFanSpeed(undefined);
    }

    previousCurrentFanSpeedRef.current = currentFanSpeed;
  }, [currentFanSpeed, pendingFanSpeed]);

  const handleStartCleaning = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'start', entityId }, providerId);
    }, t('vacuum.feedback.startFailed'));
  }, [entityId, providerId, runAction, t]);

  const handlePause = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'pause', entityId }, providerId);
    }, t('vacuum.feedback.pauseFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleStop = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'stop', entityId }, providerId);
    }, t('vacuum.feedback.pauseFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleReturnHome = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'return_home', entityId }, providerId);
    }, t('vacuum.feedback.returnFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleLocate = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'locate', entityId }, providerId);
    }, t('vacuum.feedback.locateFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleCleanSpot = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'clean_spot', entityId }, providerId);
    }, t('vacuum.feedback.cleanSpotFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleStartAreaCleaning = useCallback(
    (areaIds: string[]) => {
      if (areaIds.length === 0) {
        return;
      }

      void runAction(async () => {
        await dispatchEntityCommand({ type: 'clean_vacuum_areas', entityId, areaIds }, providerId);
      }, t('vacuum.feedback.startFailed'));
    },
    [entityId, providerId, runAction, t]
  );

  const handleSetFanSpeed = useCallback(
    (fanSpeed: string) => {
      if (fanSpeed.length === 0 || isUpdatingFanSpeed) {
        return;
      }

      setPendingFanSpeed(fanSpeed);
      setIsUpdatingFanSpeed(true);
      void runAction(async () => {
        try {
          await dispatchEntityCommand(
            { type: 'set_vacuum_fan_speed', entityId, fanSpeed },
            providerId
          );
        } catch (error) {
          setPendingFanSpeed(undefined);
          throw error;
        } finally {
          setIsUpdatingFanSpeed(false);
        }
      }, t('vacuum.feedback.fanSpeedFailed'));
    },
    [entityId, isUpdatingFanSpeed, providerId, runAction, t]
  );

  return {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    isUpdatingFanSpeed,
    displayFanSpeed: pendingFanSpeed ?? currentFanSpeed,
    handleStartCleaning,
    handleStartAreaCleaning,
    handlePause,
    handleStop,
    handleReturnHome,
    handleLocate,
    handleCleanSpot,
    handleSetFanSpeed,
  };
}
