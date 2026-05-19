import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { getRuntimeConfig } from '@/app/config/runtime-config';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { useI18n, useNavigation } from '@/app/hooks';
import {
  importDashboardConfigFromFile,
  importDashboardConfigFromUrl,
} from '@/app/utils/dashboard-config';
import { reloadWindow } from '@/app/utils/window-reload';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

type OnboardingTransition = 'all' | 'blank' | 'import' | null;
const RUNTIME_CONFIG_IMPORT_ATTEMPT_KEY = 'navet-runtime-dashboard-config-import-attempt';
const ONBOARDING_CONFIG_IMPORT_REVEAL_KEY = 'navet-onboarding-config-import-reveal';

interface UseOnboardingControllerOptions {
  allEntityIds: string[];
  changeRoom: (room: string) => void;
  resetDashboard: () => void;
}

export interface OnboardingController {
  dashboardArrivalVariant: OnboardingTransition;
  isOnboardingClosing: boolean;
  onboardingCompleted: boolean;
  showImportedDashboardReveal: boolean;
  handleChooseAllEntities: () => void;
  handleChooseBlankDashboard: () => void;
  handleImportDashboardConfig: (file: File) => Promise<void>;
  handleOnboardingImportDashboardConfig: (file: File) => Promise<void>;
  onCompleteOnboardingClose: () => void;
  onDismissImportedDashboardReveal: () => void;
}

function consumeOnboardingConfigImportRevealFlag() {
  if (sessionStorage.getItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY) !== 'true') {
    return false;
  }

  sessionStorage.removeItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY);
  return true;
}

export function useOnboardingController({
  allEntityIds,
  changeRoom,
  resetDashboard,
}: UseOnboardingControllerOptions): OnboardingController {
  const { setActiveSection } = useNavigation();
  const { t } = useI18n();

  const { onboardingCompleted, completeOnboarding, markOnboardingCompleted } =
    useDashboardEntitiesStore(
      useShallow((state) => ({
        onboardingCompleted: state.onboardingCompleted,
        completeOnboarding: state.completeOnboarding,
        markOnboardingCompleted: state.markOnboardingCompleted,
      }))
    );

  const [onboardingTransition, setOnboardingTransition] = useState<OnboardingTransition>(null);
  const [shouldShowImportedRevealAfterReload] = useState(consumeOnboardingConfigImportRevealFlag);
  const [dashboardArrivalVariant, setDashboardArrivalVariant] = useState<OnboardingTransition>(
    shouldShowImportedRevealAfterReload ? 'import' : null
  );
  const [showImportedDashboardReveal, setShowImportedDashboardReveal] = useState(
    shouldShowImportedRevealAfterReload
  );
  const runtimeConfigImportStarted = useRef(false);

  useEffect(() => {
    const dashboardConfigUrl = getRuntimeConfig().dashboardConfigUrl;

    if (
      onboardingCompleted ||
      allEntityIds.length === 0 ||
      !dashboardConfigUrl ||
      runtimeConfigImportStarted.current ||
      sessionStorage.getItem(RUNTIME_CONFIG_IMPORT_ATTEMPT_KEY) === dashboardConfigUrl
    ) {
      return;
    }

    runtimeConfigImportStarted.current = true;
    sessionStorage.setItem(RUNTIME_CONFIG_IMPORT_ATTEMPT_KEY, dashboardConfigUrl);

    void importDashboardConfigFromUrl(dashboardConfigUrl)
      .then(() => {
        reloadWindow();
      })
      .catch((error) => {
        console.error('[OnboardingController] Runtime dashboard config import failed:', error);
      });
  }, [allEntityIds.length, onboardingCompleted]);

  const handleChooseAllEntities = useCallback(() => {
    setActiveSection('home');
    changeRoom(ALL_ROOMS_ID);
    setDashboardArrivalVariant('all');
    setOnboardingTransition('all');
  }, [changeRoom, setActiveSection]);

  const handleChooseBlankDashboard = useCallback(() => {
    setActiveSection('home');
    changeRoom(ALL_ROOMS_ID);
    setDashboardArrivalVariant('blank');
    setOnboardingTransition('blank');
  }, [changeRoom, setActiveSection]);

  const handleImportDashboardConfig = useCallback(
    async (file: File) => {
      try {
        await importDashboardConfigFromFile(file);
        toast.success(t('dashboard.feedback.configImported'));
        window.setTimeout(() => {
          reloadWindow();
        }, 600);
      } catch (error) {
        console.error('[OnboardingController] Config import failed:', error);
        toast.error(t('dashboard.feedback.configImportFailed'));
      }
    },
    [t]
  );

  const handleOnboardingImportDashboardConfig = useCallback(
    async (file: File) => {
      try {
        await importDashboardConfigFromFile(file);
        sessionStorage.setItem(ONBOARDING_CONFIG_IMPORT_REVEAL_KEY, 'true');
        toast.success(t('dashboard.feedback.configRestored'));
        reloadWindow();
      } catch (error) {
        console.error('[OnboardingController] Config import failed:', error);
        toast.error(t('dashboard.feedback.configImportFailed'));
      }
    },
    [t]
  );

  const onCompleteOnboardingClose = useCallback(() => {
    if (onboardingTransition === 'all') {
      completeOnboarding(allEntityIds, false);
    } else if (onboardingTransition === 'blank') {
      resetDashboard();
      completeOnboarding(allEntityIds, true);
    } else if (onboardingTransition === 'import') {
      markOnboardingCompleted();
    } else {
      return;
    }

    setOnboardingTransition(null);
    setShowImportedDashboardReveal(true);
  }, [
    allEntityIds,
    completeOnboarding,
    markOnboardingCompleted,
    onboardingTransition,
    resetDashboard,
  ]);

  return {
    dashboardArrivalVariant,
    isOnboardingClosing: onboardingTransition !== null,
    onboardingCompleted,
    showImportedDashboardReveal,
    handleChooseAllEntities,
    handleChooseBlankDashboard,
    handleImportDashboardConfig,
    handleOnboardingImportDashboardConfig,
    onCompleteOnboardingClose,
    onDismissImportedDashboardReveal: () => {
      setDashboardArrivalVariant(null);
      setShowImportedDashboardReveal(false);
    },
  };
}
