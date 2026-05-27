import { useCallback, useState } from 'react';
import { useI18n, useServiceActionHandler } from '@/app/hooks';
import { dispatchEntityAction } from '@/app/services/integration-action.service';
import type { IntegrationProviderId } from '@/app/types/provider';
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
    void runAction(
      () =>
        dispatchEntityAction({
          providerId,
          entityId,
          domain: 'vacuum',
          service: 'start',
        }),
      t('vacuum.feedback.startFailed')
    );
  }, [entityId, providerId, runAction, t]);

  const handlePause = useCallback(() => {
    void runAction(
      () =>
        dispatchEntityAction({
          providerId,
          entityId,
          domain: 'vacuum',
          service: 'pause',
        }),
      t('vacuum.feedback.pauseFailed')
    );
  }, [entityId, providerId, runAction, t]);

  const handleReturnHome = useCallback(() => {
    void runAction(
      () =>
        dispatchEntityAction({
          providerId,
          entityId,
          domain: 'vacuum',
          service: 'return_to_base',
        }),
      t('vacuum.feedback.returnFailed')
    );
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
