import type { ReactNode } from 'react';
import type { WizardStep } from './types';

interface OnboardingShellProps {
  accentColor: string;
  bgColor: string;
  children: ReactNode;
  isClosing: boolean;
  mutedColor: string;
  step: WizardStep;
  textColor: string;
  title: string;
  body: string;
  welcomeLabel: string;
}

export function OnboardingShell({
  bgColor,
  body,
  children,
  isClosing,
  mutedColor,
  step: _step,
  textColor,
  title,
  welcomeLabel,
}: OnboardingShellProps) {
  return (
    <div
      className="fixed inset-0 z-60 overflow-y-auto bg-black/55 p-4 safe-area-pt-4 backdrop-blur-sm sm:flex sm:items-center sm:justify-center"
      style={{
        animation: isClosing ? 'navet-onboarding-backdrop-exit 0.9s ease forwards' : undefined,
      }}
    >
      <style>{`
        @keyframes navet-onboarding-backdrop-exit {
          0% { opacity: 1; backdrop-filter: blur(10px); }
          100% { opacity: 0; backdrop-filter: blur(22px); }
        }

        @keyframes navet-onboarding-panel-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(26px) scale(0.94); filter: blur(10px); }
        }
      `}</style>
      <div
        className={`relative mx-auto w-full max-w-3xl rounded-4xl border ${bgColor} p-6 shadow-2xl max-sm:min-h-[calc(100dvh-2rem)] max-sm:overflow-y-auto sm:max-h-[calc(100dvh-2rem)] sm:overflow-y-auto md:p-8`}
        style={{
          animation: isClosing
            ? 'navet-onboarding-panel-exit 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : undefined,
        }}
      >
        <div>
          <div className="mb-5 flex items-center">
            <img src="./logo.svg" alt="" className="h-12 w-12" />
          </div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${mutedColor}`}>
            {welcomeLabel}
          </p>
          <h2 className={`mt-3 text-3xl font-semibold tracking-tight ${textColor}`}>{title}</h2>
          <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${mutedColor}`}>{body}</p>
        </div>

        {children}
      </div>
    </div>
  );
}
