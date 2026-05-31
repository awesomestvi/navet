import type { TranslateFn } from '@navet/app/hooks';
import { ArrowLeft } from 'lucide-react';

export function OnboardingStepActions({
  accentColor,
  borderColor,
  isClosing,
  onBack,
  onContinue,
  step,
  textColor,
  t,
}: {
  accentColor: string;
  borderColor: string;
  isClosing: boolean;
  onBack: () => void;
  onContinue: () => void;
  step: 'localization' | 'theme';
  textColor: string;
  t: TranslateFn;
}) {
  return (
    <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={isClosing}
        className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium sm:px-5 sm:py-3 ${borderColor} ${textColor}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('dashboard.onboarding.back')}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={isClosing}
        className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] sm:px-6 sm:py-3"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          boxShadow: `0 18px 40px ${accentColor}40`,
        }}
      >
        {step === 'localization'
          ? t('dashboard.onboarding.next')
          : t('dashboard.onboarding.continue')}
      </button>
    </div>
  );
}
