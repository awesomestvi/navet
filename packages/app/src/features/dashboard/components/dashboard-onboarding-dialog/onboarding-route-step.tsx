import type { TranslateFn } from '@navet/app/hooks';
import { Download, Layers3, Sparkles } from 'lucide-react';

export function OnboardingRouteStep({
  accentColor,
  borderColor,
  cardBg,
  disabledCardBg,
  isClosing,
  isImporting,
  mutedColor,
  onChooseAll,
  onChooseBlank,
  onImport,
  textColor,
  t,
}: {
  accentColor: string;
  borderColor: string;
  cardBg: string;
  disabledCardBg: string;
  isClosing: boolean;
  isImporting: boolean;
  mutedColor: string;
  onChooseAll: () => void;
  onChooseBlank: () => void;
  onImport: () => void;
  textColor: string;
  t: TranslateFn;
}) {
  return (
    <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-5 md:grid-cols-3">
      <button
        type="button"
        onClick={onChooseAll}
        disabled={isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${cardBg} p-4 text-left transition-colors sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Sparkles className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {t('dashboard.onboarding.route.all.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
          {t('dashboard.onboarding.route.all.body')}
        </p>
      </button>

      <button
        type="button"
        onClick={onChooseBlank}
        disabled={isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${cardBg} p-4 text-left transition-colors sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Layers3 className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {t('dashboard.onboarding.route.blank.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
          {t('dashboard.onboarding.route.blank.body')}
        </p>
      </button>

      <button
        type="button"
        onClick={onImport}
        disabled={isImporting || isClosing}
        className={`flex h-full flex-col items-start rounded-[22px] border ${borderColor} ${
          isImporting || isClosing ? disabledCardBg : cardBg
        } p-4 text-left transition-colors disabled:cursor-wait sm:rounded-[28px] sm:p-6`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl"
          style={{ backgroundColor: `${accentColor}22` }}
        >
          <Download className="h-[18px] w-[18px] sm:h-5 sm:w-5" style={{ color: accentColor }} />
        </div>
        <h3 className={`mt-4 text-base font-semibold sm:mt-5 sm:text-lg ${textColor}`}>
          {isClosing
            ? t('dashboard.onboarding.route.import.preparing')
            : isImporting
              ? t('dashboard.onboarding.route.import.importing')
              : t('dashboard.onboarding.route.import.title')}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed sm:mt-2.5 ${mutedColor}`}>
          {isClosing
            ? t('dashboard.onboarding.route.import.closingBody')
            : t('dashboard.onboarding.route.import.body')}
        </p>
      </button>
    </div>
  );
}
