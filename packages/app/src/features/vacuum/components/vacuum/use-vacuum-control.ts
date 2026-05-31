import { dispatchEntityCommand } from '@navet/app/commands';
import { useI18n, useServiceActionHandler } from '@navet/app/hooks';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useCallback, useState } from 'react';
import type { VacuumStatus } from './vacuum-utils';

interface UseVacuumControlProps {
  entityId: string;
  providerId?: IntegrationProviderId;
  initialStatus: VacuumStatus;
}

interface UseVacuumControlReturn {
  currentStatus: VacuumStatus;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  handleStartCleaning: () => void;
  handlePause: () => void;
  handleReturnHome: () => void;
}

export function useVacuumControl({
  entityId,
  providerId,
  initialStatus,
}: UseVacuumControlProps): UseVacuumControlReturn {
  // Status is derived from the HA entity prop — no local simulation needed.
  // The parent card receives initialStatus from the HA store and re-renders when it changes.
  const currentStatus = initialStatus;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const runAction = useServiceActionHandler();
  const { t } = useI18n();

  const handleStartCleaning = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'start', entityId }, providerId);
    }, t('vacuum.feedback.startFailed'));
  }, [entityId, providerId, runAction, t]);

  const handlePause = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'stop', entityId }, providerId);
    }, t('vacuum.feedback.pauseFailed'));
  }, [entityId, providerId, runAction, t]);

  const handleReturnHome = useCallback(() => {
    void runAction(async () => {
      await dispatchEntityCommand({ type: 'return_home', entityId }, providerId);
    }, t('vacuum.feedback.returnFailed'));
  }, [entityId, providerId, runAction, t]);

  return {
    currentStatus,
    isDialogOpen,
    setIsDialogOpen,
    handleStartCleaning,
    handlePause,
    handleReturnHome,
  };
}
