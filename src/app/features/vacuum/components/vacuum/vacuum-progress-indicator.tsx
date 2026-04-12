import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

interface VacuumProgressIndicatorProps {
  theme: ThemeType;
  accentColorValue: string;
  label: string;
  progress: number;
  pulse?: boolean;
  variant?: 'battery' | 'cleaning';
}

export function VacuumProgressIndicator({
  theme,
  accentColorValue,
  label,
  progress,
  pulse = false,
  variant = 'battery',
}: VacuumProgressIndicatorProps) {
  const showCleaningAnimation = variant === 'cleaning' && progress > 0;
  const cleaningFillClassName = accentColorValue.replace(/^text-/, 'bg-');
  const surface = getThemeSurfaceTokens(theme);
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: variant === 'cleaning' ? 'primary' : 'neutral',
    accentColor: accentColorValue,
    baseColor: variant === 'cleaning' ? accentColorValue : undefined,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span
            className="truncate text-xs font-medium"
            style={{ color: textTokens.subtitleColor }}
          >
            {label}
          </span>
        </div>
        <span className={`self-end text-xs font-medium ${surface.textSubtle}`}>{progress}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/14 shadow-inner shadow-black/10 overflow-hidden">
        <div
          className={`relative h-full overflow-hidden rounded-full transition-all duration-500 ${
            pulse
              ? 'shadow-[0_0_16px_rgba(74,222,128,0.5)]'
              : showCleaningAnimation
                ? 'shadow-[0_0_12px_rgba(255,255,255,0.1)]'
                : 'shadow-[0_0_10px_rgba(255,255,255,0.08)]'
          } ${
            variant === 'cleaning'
              ? cleaningFillClassName
              : 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-400'
          }`}
          style={{
            width: `${progress}%`,
          }}
        >
          {pulse ? (
            <>
              <span className="absolute inset-0 animate-pulse rounded-full bg-white/30 opacity-70" />
              <span
                className="absolute inset-y-0 left-[-30%] w-[30%] rounded-full bg-white/45 blur-[1px]"
                style={{ animation: 'vacuum-charge-sweep 1.8s linear infinite' }}
              />
            </>
          ) : showCleaningAnimation ? (
            <span
              className="absolute inset-y-0 left-[-22%] w-[22%] rounded-full bg-white/35 blur-[1px]"
              style={{ animation: 'vacuum-clean-sweep 2.4s ease-in-out infinite' }}
            />
          ) : null}
        </div>
      </div>
      {pulse || showCleaningAnimation ? (
        <style>{`
          @keyframes vacuum-charge-sweep {
            0% { transform: translateX(0%); opacity: 0; }
            20% { opacity: 0.85; }
            100% { transform: translateX(430%); opacity: 0; }
          }
          @keyframes vacuum-clean-sweep {
            0% { transform: translateX(0%); opacity: 0; }
            18% { opacity: 0.55; }
            82% { opacity: 0.55; }
            100% { transform: translateX(470%); opacity: 0; }
          }
        `}</style>
      ) : null}
    </div>
  );
}
