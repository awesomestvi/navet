export interface DashboardOnboardingDialogProps {
  open: boolean;
  onChooseAll: () => void;
  onChooseBlank: () => void;
  onImportConfig: (file: File) => Promise<void>;
  phase?: 'idle' | 'closing';
  onClosingAnimationComplete?: () => void;
}

export type WizardRoute = 'all' | 'blank' | null;
export type WizardStep = 'route' | 'localization' | 'theme';
