import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';
import { useI18n, useNavigation } from '@/app/hooks';
import { importDashboardConfigFromFile } from '@/app/utils/dashboard-config';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

type OnboardingTransition = 'all' | 'blank' | 'import' | null;

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
  const [dashboardArrivalVariant, setDashboardArrivalVariant] =
    useState<OnboardingTransition>(null);
  const [showImportedDashboardReveal, setShowImportedDashboardReveal] = useState(false);

  const handleChooseAllEntities = useCallback(() => {
    setActiveSection('home');
    changeRoom('All');
    setDashboardArrivalVariant('all');
    setOnboardingTransition('all');
  }, [changeRoom, setActiveSection]);

  const handleChooseBlankDashboard = useCallback(() => {
    setActiveSection('home');
    changeRoom('All');
    setDashboardArrivalVariant('blank');
    setOnboardingTransition('blank');
  }, [changeRoom, setActiveSection]);

  const handleImportDashboardConfig = useCallback(
    async (file: File) => {
      try {
        await importDashboardConfigFromFile(file);
        toast.success(t('dashboard.feedback.configImported'));
        window.setTimeout(() => {
          window.location.reload();
        }, 600);
      } catch {
        toast.error(t('dashboard.feedback.configImportFailed'));
      }
    },
    [t]
  );

  const handleOnboardingImportDashboardConfig = useCallback(
    async (file: File) => {
      try {
        await importDashboardConfigFromFile(file);
        setActiveSection('home');
        changeRoom('All');
        setDashboardArrivalVariant('import');
        setOnboardingTransition('import');
        toast.success(t('dashboard.feedback.configRestored'));
      } catch {
        toast.error(t('dashboard.feedback.configImportFailed'));
      }
    },
    [changeRoom, setActiveSection, t]
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
