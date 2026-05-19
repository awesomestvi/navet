import { memo } from 'react';
import { getCardActionControlSizes } from '@/app/components/shared/card-action-control-sizes';
import { useI18n, useTheme } from '@/app/hooks';

interface KelvinColorTriggerProps {
  isOn: boolean;
  currentTempColor: string;
  isActive: boolean;
  onClick: () => void;
}

export const KelvinColorTrigger = memo(function KelvinColorTrigger({
  isOn,
  currentTempColor,
  isActive,
  onClick,
}: KelvinColorTriggerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const controlSizes = getCardActionControlSizes('small');
  const isLight = theme === 'light';
  const borderColor = isLight ? 'rgba(148,163,184,0.36)' : 'rgba(255,255,255,0.18)';
  const kelvinBg =
    'linear-gradient(135deg, #ffb347 0%, #ffd15c 30%, #ffe58a 46%, #bddfff 68%, #74b9ff 100%)';
  const mutedBg = isLight
    ? 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)'
    : 'linear-gradient(135deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.14) 100%)';
  const activeShadow = `0 0 0 1px ${currentTempColor}66, 0 10px 24px -18px ${currentTempColor}cc`;

  return (
    <button
      type="button"
      aria-label={t('lighting.colorTemperature')}
      title={t('lighting.colorTemperature')}
      aria-pressed={isActive}
      disabled={!isOn}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-8 w-8 ${controlSizes.button} relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        isActive && isOn ? 'border-0' : 'border'
      } transition-all duration-200 ${
        !isOn ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 cursor-pointer'
      }`}
      style={{
        background: isActive && isOn ? kelvinBg : mutedBg,
        borderColor: isActive && isOn ? `${currentTempColor}80` : borderColor,
        boxShadow: isActive && isOn ? activeShadow : undefined,
      }}
    >
      <div
        className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)' }}
      >
        <div
          className="h-2.5 w-2.5 rounded-full border"
          style={{
            background: isActive
              ? `linear-gradient(135deg, ${currentTempColor} 0%, #ffe58a 48%, #9ed4ff 100%)`
              : isLight
                ? '#9ca3af'
                : 'rgba(255,255,255,0.4)',
            borderColor: 'rgba(255,255,255,0.8)',
          }}
        />
      </div>
    </button>
  );
});
