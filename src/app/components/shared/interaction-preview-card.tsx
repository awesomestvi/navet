import { Hand, Lightbulb, MoreHorizontal, Settings2, Sun } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { EntityInteractionMode } from '@/app/stores';

interface InteractionPreviewCardProps {
  mode: EntityInteractionMode;
  accentColor: string;
  theme: ThemeType;
}

const PRESET_LABELS = ['25%', '60%', '100%'];

export function InteractionPreviewCard({ mode, accentColor, theme }: InteractionPreviewCardProps) {
  const { t } = useI18n();
  const [isOn, setIsOn] = useState(true);
  const [brightness, setBrightness] = useState(60);
  const surface = getThemeSurfaceTokens(theme);
  const isLightTheme = theme === 'light';
  const isContrastTheme = theme === 'contrast';
  const preview =
    mode === 'toggle-first'
      ? {
          cardTap: t('interactionPreview.cardTap.toggle'),
          iconTap: t('interactionPreview.iconTap.toggle'),
        }
      : {
          cardTap: t('interactionPreview.cardTap.controls'),
          iconTap: t('interactionPreview.iconTap.toggle'),
        };
  const showsTrailingButton = mode === 'toggle-first';

  const cardClass = isLightTheme
    ? 'bg-gray-50/90 border-gray-200/80'
    : isContrastTheme
      ? 'bg-black border-white/16'
      : theme === 'glass'
        ? 'bg-white/8 border-white/12'
        : 'bg-white/6 border-white/10';
  const textClass = isOn
    ? surface.textPrimary
    : isLightTheme
      ? 'text-gray-500'
      : isContrastTheme
        ? 'text-gray-300'
        : 'text-gray-400';
  const labelClass = isLightTheme ? 'text-gray-500' : surface.textMuted;
  const sectionLabelClass = isLightTheme ? 'text-gray-500' : surface.textSecondary;
  const quietPillClass = isOn
    ? isLightTheme
      ? 'bg-gray-100 text-gray-600'
      : isContrastTheme
        ? 'bg-white/10 text-gray-300'
        : 'bg-white/10 text-gray-300'
    : isLightTheme
      ? 'bg-gray-200/80 text-gray-500'
      : isContrastTheme
        ? 'bg-white/6 text-gray-300'
        : 'bg-white/5 text-gray-500';

  const iconButtonStyle = {
    backgroundColor: isOn ? (isLightTheme ? '#ffffff' : `${accentColor}cc`) : undefined,
    borderColor: isOn
      ? `${accentColor}55`
      : isLightTheme
        ? 'rgba(156, 163, 175, 0.45)'
        : 'rgba(255, 255, 255, 0.12)',
    color: isOn ? (isLightTheme ? accentColor : '#ffffff') : isLightTheme ? '#6b7280' : '#9ca3af',
    boxShadow: isLightTheme
      ? isOn
        ? `0 0 0 2px ${accentColor}22, 0 10px 28px ${accentColor}40`
        : 'none'
      : isOn
        ? `0 0 0 2px ${accentColor}22, 0 12px 30px ${accentColor}45`
        : 'none',
  };

  const sliderTrackClassName = isLightTheme
    ? 'bg-gray-200'
    : isContrastTheme
      ? 'bg-white/14'
      : 'bg-white/10';
  const thumbClassName = isLightTheme
    ? 'border-white bg-white shadow-lg'
    : isContrastTheme
      ? 'border-black bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.22)]'
      : 'border-white bg-white shadow-lg';
  const focusRingClass = isLightTheme
    ? 'focus-visible:ring-gray-900/25 focus-visible:ring-offset-white'
    : `focus-visible:ring-white/35 ${surface.ringOffset}`;

  const showControlsOpenedToast = () => {
    toast.success(t('interactionPreview.preview.controlsOpenedTitle'), {
      description: t('interactionPreview.preview.controlsOpenedDescription'),
    });
  };

  const handleCardTap = () => {
    if (mode === 'toggle-first') {
      setIsOn((current) => !current);
      return;
    }
    showControlsOpenedToast();
  };

  return (
    <div className="max-w-lg">
      {/* biome-ignore lint/a11y/useSemanticElements: This preview card contains nested interactive controls, so a semantic button wrapper is not valid here. */}
      <div
        role="button"
        aria-label={t('interactionPreview.preview.deviceName')}
        tabIndex={0}
        onClick={handleCardTap}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleCardTap();
          }
        }}
        className={`cursor-pointer rounded-[20px] border p-3 transition-all duration-300 ${cardClass} ${
          !isOn ? 'grayscale opacity-40' : ''
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <button
              type="button"
              aria-label={t('interactionPreview.iconTap.toggle')}
              onClick={(event) => {
                event.stopPropagation();
                setIsOn((current) => !current);
              }}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRingClass} ${
                !isOn ? (isLightTheme ? 'bg-gray-200' : 'bg-white/5') : ''
              }`}
              style={iconButtonStyle}
            >
              <Lightbulb
                className="h-4.5 w-4.5"
                style={{
                  filter: isLightTheme ? undefined : 'drop-shadow(0 1px 6px rgba(0, 0, 0, 0.35))',
                }}
              />
            </button>
            <div className="min-w-0">
              <p className={`truncate text-sm font-semibold ${textClass}`}>
                {t('interactionPreview.preview.deviceName')}
              </p>
              <p className={`mt-0.5 truncate text-[10px] ${labelClass}`}>
                {t('interactionPreview.preview.deviceType')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className={`text-xs ${labelClass}`}>
              {t('interactionPreview.preview.brightness')}
            </span>
            <span className={`text-sm font-bold ${textClass}`}>{brightness}%</span>
          </div>
          <div className="flex h-5 items-center">
            <div className={`relative h-1 w-full rounded-full ${sliderTrackClassName}`}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${brightness}%`,
                  background: `linear-gradient(to right, ${accentColor}aa, ${accentColor})`,
                }}
              />
              <div
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 ${thumbClassName}`}
                style={{ left: `calc(${brightness}% - 8px)` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {PRESET_LABELS.map((label, index) => (
            <button
              type="button"
              key={label}
              aria-label={
                index === 2
                  ? `${t('interactionPreview.preview.brightness')} 100%`
                  : `${t('interactionPreview.preview.brightness')} ${label}`
              }
              onClick={(event) => {
                event.stopPropagation();
                setBrightness(index === 0 ? 25 : index === 1 ? 60 : 100);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium transition-all hover:scale-105 active:scale-95 ${
                brightness === (index === 0 ? 25 : index === 1 ? 60 : 100)
                  ? 'text-white'
                  : quietPillClass
              }`}
              style={
                brightness === (index === 0 ? 25 : index === 1 ? 60 : 100)
                  ? { backgroundColor: accentColor }
                  : undefined
              }
            >
              {index === 2 ? <MoreHorizontal className="h-3.5 w-3.5" /> : label}
            </button>
          ))}
          <button
            type="button"
            aria-label={t('interactionPreview.cardTap.controls')}
            onClick={(event) => event.stopPropagation()}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border transition-all hover:scale-105 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 45%, rgba(255, 255, 255, 0.9) 100%)`,
              borderColor: `${accentColor}55`,
            }}
          >
            <Sun className="h-3 w-3 text-white" />
          </button>
          {showsTrailingButton && (
            <button
              type="button"
              aria-label={t('interactionPreview.iconTap.settings')}
              onClick={(event) => {
                event.stopPropagation();
                showControlsOpenedToast();
              }}
              className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${quietPillClass} transition-all hover:scale-105 active:scale-95`}
            >
              <Settings2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
          <div
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${sectionLabelClass}`}
          >
            <Hand className="h-3 w-3" />
            <span>{t('interactionPreview.cardTitle')}</span>
          </div>
          <p className={`mt-1 text-sm ${textClass}`}>{preview.cardTap}</p>
        </div>

        <div className={`grid gap-2 ${showsTrailingButton ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
          <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold ${sectionLabelClass}`}
            >
              <Lightbulb className="h-3 w-3" />
              <span>{t('interactionPreview.iconTitle')}</span>
            </div>
            <p className={`mt-1 text-sm ${textClass}`}>{preview.iconTap}</p>
          </div>
          {showsTrailingButton && (
            <div className={`rounded-2xl px-3 py-2.5 ${quietPillClass}`}>
              <div
                className={`flex items-center gap-1.5 text-[11px] font-semibold ${sectionLabelClass}`}
              >
                <Settings2 className="h-3 w-3" />
                <span>{t('interactionPreview.trailingButtonTitle')}</span>
              </div>
              <p className={`mt-1 text-sm ${textClass}`}>
                {t('interactionPreview.trailingButtonAction')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
