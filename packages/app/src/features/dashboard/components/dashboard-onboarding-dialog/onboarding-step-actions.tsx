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
    <div className="mt-5 flex flex-nowrap items-center justify-between gap-3 sm:mt-6">
      <button
        type="button"
        onClick={onBack}
        disabled={isClosing}
        className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium ${borderColor} ${textColor}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('dashboard.onboarding.back')}
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={isClosing}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
