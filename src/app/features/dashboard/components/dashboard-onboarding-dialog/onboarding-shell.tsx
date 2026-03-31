import type { CSSProperties, ReactNode } from 'react';
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
  accentColor,
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
      className="fixed inset-0 z-60 overflow-y-auto bg-black/55 p-3 safe-area-pt-3 backdrop-blur-sm sm:p-4 sm:safe-area-pt-4 sm:flex sm:items-center sm:justify-center"
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
        className={`relative mx-auto w-full max-w-3xl overflow-hidden border ${bgColor} p-4 shadow-2xl max-sm:min-h-[calc(100dvh-1.5rem)] max-sm:overflow-y-auto max-sm:rounded-[2rem] sm:max-h-[calc(100dvh-2rem)] sm:overflow-y-auto sm:rounded-4xl sm:p-6 md:p-8`}
        style={{
          animation: isClosing
            ? 'navet-onboarding-panel-exit 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : undefined,
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-90"
          style={
            {
              background: `radial-gradient(circle at top left, ${accentColor}22, transparent 34%), radial-gradient(circle at bottom right, ${accentColor}16, transparent 32%)`,
            } as CSSProperties
          }
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={
            {
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015) 18%, transparent 42%)',
            } as CSSProperties
          }
        />
        <div className="relative">
          <div className="mb-4 flex items-center sm:mb-5">
            <img src="./logo.svg" alt="" className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-[11px] sm:tracking-[0.24em] ${mutedColor}`}
          >
            {welcomeLabel}
          </p>
          <h2
            className={`mt-2 text-[1.75rem] font-semibold tracking-tight sm:mt-3 sm:text-3xl ${textColor}`}
          >
            {title}
          </h2>
          <p
            className={`mt-2 max-w-2xl text-[13px] leading-relaxed sm:mt-3 sm:text-sm ${mutedColor}`}
          >
            {body}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
